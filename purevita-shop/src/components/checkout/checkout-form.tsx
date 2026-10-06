"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart/cart-context";
import { useCartSync } from "@/components/cart/use-cart-sync";
import { CartTotals } from "@/components/cart/cart-totals";
import { BankDetails } from "@/components/checkout/bank-details";
import { FormField } from "@/components/account/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { calcShipping, PAYMENT_METHOD_VALUES, PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  createOrderSchema,
  issuesToFieldErrors,
  type CreateOrderError,
  type CreateOrderInput,
  type CreateOrderSuccess,
  type FieldErrors,
} from "@/lib/validations/order";

export type CheckoutUser = { name: string; email: string };
export type CheckoutAddress = {
  id: string;
  recipientName: string;
  phone: string;
  line: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

const NEW = "new";
type AddressFields = { recipientName: string; phone: string; line: string; province: string; postalCode: string };

function RadioCard({
  checked,
  children,
  className,
  ...props
}: React.ComponentProps<"input"> & { checked: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-brand-blue/50",
        checked && "border-brand-blue bg-brand-sky/10 ring-1 ring-brand-blue",
        className,
      )}
    >
      <input type="radio" checked={checked} className="mt-1 size-4 accent-brand-blue" {...props} />
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </label>
  );
}

export function CheckoutForm({ user, addresses }: { user: CheckoutUser | null; addresses: CheckoutAddress[] }) {
  const router = useRouter();
  const { items, count, subtotal, hydrated, clear, setStock } = useCart();
  const { syncing } = useCartSync();
  const placing = useRef(false);

  const initialAddress = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? NEW;
  const [selected, setSelected] = useState<string>(initialAddress);
  const [fields, setFields] = useState<AddressFields>({
    recipientName: user?.name ?? "",
    phone: "",
    line: "",
    province: "",
    postalCode: "",
  });
  const [email, setEmail] = useState("");
  const [saveAddress, setSaveAddress] = useState(addresses.length === 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TRANSFER");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ message: string; loginLink?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // empty cart → back to /cart (but not while we are navigating to the thank-you page)
  useEffect(() => {
    if (hydrated && items.length === 0 && !placing.current) router.replace("/cart");
  }, [hydrated, items.length, router]);

  if (!hydrated || items.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]" aria-busy="true">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const useNewAddress = selected === NEW;
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  function setField(name: keyof AddressFields, value: string) {
    setFields((f) => ({ ...f, [name]: value }));
    setErrors((e) => {
      const { [`address.${name}`]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  }

  function buildBody(): CreateOrderInput {
    const body: CreateOrderInput = {
      items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      paymentMethod,
    };
    if (useNewAddress) {
      body.address = { ...fields };
      if (user) body.saveAddress = saveAddress;
    } else {
      body.addressId = selected;
    }
    if (!user) body.email = email;
    return body;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const body = buildBody();
    // same schema as the API → identical Thai messages before the round trip
    const check = createOrderSchema.safeParse(body);
    const clientErrors: FieldErrors = check.success ? {} : issuesToFieldErrors(check.error);
    if (!user && !email.trim()) clientErrors.email = ["กรุณากรอกอีเมลสำหรับติดต่อ"];
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toast.error("กรุณาตรวจสอบข้อมูลให้ถูกต้อง");
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CreateOrderSuccess & CreateOrderError>;

      if (res.status === 201 && data.orderNo) {
        placing.current = true;
        router.push(`/order/${encodeURIComponent(data.orderNo)}`);
        clear();
        toast.success("สั่งซื้อสำเร็จ", { description: `เลขที่คำสั่งซื้อ ${data.orderNo}` });
        return; // keep the button disabled while navigating
      }

      const message = data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      if (res.status === 409 && data.productId) {
        const available = data.available ?? 0;
        const name = data.productName ?? items.find((i) => i.productId === data.productId)?.name ?? "สินค้า";
        setStock(data.productId, available);
        const detail =
          available > 0
            ? `${name} เหลือเพียง ${available} ชิ้น — ปรับจำนวนในตะกร้าเป็น ${available} ชิ้นแล้ว กรุณาตรวจสอบและยืนยันอีกครั้ง`
            : `${name} หมดแล้ว — นำออกจากตะกร้าแล้ว`;
        setFormError({ message: detail });
        toast.error("สินค้าไม่เพียงพอ", { description: detail });
      } else if (res.status === 400) {
        setErrors(data.fieldErrors ?? {});
        if (data.fieldErrors?.addressId) setSelected(NEW);
        setFormError({ message });
        toast.error(message);
      } else if (res.status === 401) {
        setFormError({ message, loginLink: true });
        toast.error(message);
      } else {
        setFormError({ message });
        toast.error(message);
      }
    } catch {
      const message = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
      setFormError({ message });
      toast.error(message);
    }
    setSubmitting(false);
  }

  const err = (key: string) => errors[key];
  const otherErrors = Object.entries(errors)
    .filter(([k]) => !k.startsWith("address.") && k !== "email" && k !== "addressId")
    .flatMap(([, v]) => v);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-6">
        {/* ---------- address ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-brand-navy">
              <MapPin className="size-4" /> ที่อยู่จัดส่ง
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!user && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                สั่งซื้อแบบไม่เป็นสมาชิก หรือ{" "}
                <Link href="/login?callbackUrl=/checkout" className="font-medium text-brand-blue hover:underline">
                  เข้าสู่ระบบ
                </Link>{" "}
                เพื่อใช้ที่อยู่ที่บันทึกไว้และติดตามคำสั่งซื้อ
              </p>
            )}

            {addresses.length > 0 && (
              <div className="grid gap-2" role="radiogroup" aria-label="เลือกที่อยู่จัดส่ง">
                {addresses.map((a) => (
                  <RadioCard
                    key={a.id}
                    name="addressId"
                    value={a.id}
                    checked={selected === a.id}
                    onChange={() => setSelected(a.id)}
                  >
                    <p className="font-medium">
                      {a.recipientName}{" "}
                      {a.isDefault && (
                        <span className="ml-1 rounded bg-brand-green/10 px-1.5 py-0.5 text-xs text-brand-green">ค่าเริ่มต้น</span>
                      )}
                    </p>
                    <p className="text-muted-foreground">โทร {a.phone}</p>
                    <p className="text-muted-foreground">
                      {a.line} {a.province} {a.postalCode}
                    </p>
                  </RadioCard>
                ))}
                <RadioCard name="addressId" value={NEW} checked={useNewAddress} onChange={() => setSelected(NEW)}>
                  <p className="font-medium">ใช้ที่อยู่ใหม่</p>
                </RadioCard>
                {err("addressId") && <p className="text-sm text-destructive">{err("addressId")![0]}</p>}
              </div>
            )}

            {useNewAddress && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="ชื่อผู้รับ"
                  name="recipientName"
                  autoComplete="name"
                  value={fields.recipientName}
                  onChange={(e) => setField("recipientName", e.target.value)}
                  errors={err("address.recipientName")}
                />
                <FormField
                  label="เบอร์โทรศัพท์"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="08x-xxx-xxxx"
                  value={fields.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  errors={err("address.phone")}
                />
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="line">ที่อยู่</Label>
                  <Textarea
                    id="line"
                    name="line"
                    autoComplete="street-address"
                    placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต"
                    value={fields.line}
                    onChange={(e) => setField("line", e.target.value)}
                    aria-invalid={err("address.line") ? true : undefined}
                  />
                  {err("address.line") && <p className="text-sm text-destructive">{err("address.line")![0]}</p>}
                </div>
                <FormField
                  label="จังหวัด"
                  name="province"
                  autoComplete="address-level1"
                  value={fields.province}
                  onChange={(e) => setField("province", e.target.value)}
                  errors={err("address.province")}
                />
                <FormField
                  label="รหัสไปรษณีย์"
                  name="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  value={fields.postalCode}
                  onChange={(e) => setField("postalCode", e.target.value)}
                  errors={err("address.postalCode")}
                />
                {err("address") && <p className="text-sm text-destructive sm:col-span-2">{err("address")![0]}</p>}
                {user && (
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-blue"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    บันทึกที่อยู่นี้ไว้ใช้ครั้งต่อไป
                  </label>
                )}
              </div>
            )}

            {!user && (
              <FormField
                label="อีเมลสำหรับติดต่อ"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(({ email: _e, ...rest }) => (void _e, rest));
                }}
                errors={err("email")}
              />
            )}
          </CardContent>
        </Card>

        {/* ---------- payment ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">วิธีชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="วิธีชำระเงิน">
              {PAYMENT_METHOD_VALUES.map((m) => (
                <RadioCard
                  key={m}
                  name="paymentMethod"
                  value={m}
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                >
                  <p className="font-medium">{PAYMENT_METHODS[m].label}</p>
                  <p className="text-muted-foreground">{PAYMENT_METHODS[m].description}</p>
                </RadioCard>
              ))}
            </div>
            {err("paymentMethod") && <p className="text-sm text-destructive">{err("paymentMethod")![0]}</p>}
            {paymentMethod === "TRANSFER" ? (
              <BankDetails amount={total} />
            ) : (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                ชำระเงินสด {formatTHB(total)} กับพนักงานจัดส่งเมื่อได้รับสินค้า
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- summary ---------- */}
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base text-brand-navy">
            สรุปคำสั่งซื้อ
            {syncing && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="กำลังตรวจสอบสต็อก" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ul className="grid gap-3">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 text-sm">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-brand-sky/10">
                  <Image src={i.imageUrl} alt={i.name} fill sizes="48px" className="object-contain" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2">{i.name}</p>
                  <p className="text-muted-foreground">
                    {formatTHB(i.price)} × {i.qty}
                  </p>
                </div>
                <span className="font-medium">{formatTHB(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <Link href="/cart" className="text-sm text-brand-blue hover:underline">
            แก้ไขตะกร้าสินค้า
          </Link>
          <CartTotals subtotal={subtotal} count={count} />

          {(formError || otherErrors.length > 0) && (
            <div
              role="alert"
              className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="grid gap-1">
                {formError && <p>{formError.message}</p>}
                {otherErrors.map((m) => (
                  <p key={m}>{m}</p>
                ))}
                {formError?.loginLink && (
                  <Link href="/login?callbackUrl=/checkout" className="font-medium underline">
                    เข้าสู่ระบบอีกครั้ง
                  </Link>
                )}
              </div>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full bg-brand-orange text-white hover:bg-brand-orange/90"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {submitting ? "กำลังสั่งซื้อ..." : `ยืนยันการสั่งซื้อ ${formatTHB(total)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            ราคาและสต็อกจะถูกตรวจสอบอีกครั้งเมื่อยืนยันคำสั่งซื้อ
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
