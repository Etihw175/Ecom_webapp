import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseAddressSnapshot } from "@/lib/addresses";
import { formatDateTime, formatTHB } from "@/lib/format";
import { getPaymentLabel } from "@/lib/constants";
import { GUEST_ORDERS_COOKIE, readGuestOrders } from "@/lib/guest-orders";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { BankDetails } from "@/components/checkout/bank-details";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ orderNo: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "สั่งซื้อสำเร็จ", robots: { index: false } };

export default async function OrderThankYouPage({ params }: Params) {
  const { orderNo: raw } = await params;
  const orderNo = decodeURIComponent(raw);

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: { include: { product: { select: { slug: true, imageUrl: true } } } } },
  });
  if (!order) notFound();

  // access: owner, admin, or the guest who just placed it (signed httpOnly cookie)
  const user = await getCurrentUser();
  const isOwner = !!user?.id && order.userId === user.id;
  const isAdmin = user?.role === "ADMIN";
  const isGuestBuyer =
    order.userId === null &&
    readGuestOrders((await cookies()).get(GUEST_ORDERS_COOKIE)?.value).includes(order.orderNo);
  if (!isOwner && !isAdmin && !isGuestBuyer) notFound();

  const address = parseAddressSnapshot(order.addressSnapshot);
  let contactEmail: string | null = null;
  try {
    const raw = JSON.parse(order.addressSnapshot) as { email?: unknown };
    if (typeof raw.email === "string") contactEmail = raw.email;
  } catch {
    // ignore
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-14 text-brand-green" />
        <h1 className="text-2xl font-semibold text-brand-navy">ขอบคุณสำหรับคำสั่งซื้อ</h1>
        <p className="text-muted-foreground">
          เลขที่คำสั่งซื้อ <span className="font-semibold text-brand-navy" data-testid="order-no">{order.orderNo}</span>
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          สถานะ <OrderStatusBadge status={order.status} /> · {formatDateTime(order.createdAt)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-brand-navy">รายการสินค้า</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-brand-sky/10">
                      {item.product?.imageUrl && (
                        <Image src={item.product.imageUrl} alt={item.nameSnapshot} fill sizes="56px" className="object-contain" unoptimized />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${item.product.slug}`} className="line-clamp-2 font-medium hover:text-brand-blue">
                        {item.nameSnapshot}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatTHB(item.priceSnapshot)} × {item.qty}
                      </p>
                    </div>
                    <p className="font-semibold">{formatTHB(item.priceSnapshot * item.qty)}</p>
                  </li>
                ))}
              </ul>
              <Separator className="my-3" />
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ยอดรวมสินค้า</span>
                  <span>{formatTHB(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ค่าจัดส่ง</span>
                  <span>{order.shippingFee === 0 ? "ส่งฟรี" : formatTHB(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>ยอดชำระทั้งหมด</span>
                  <span className="text-brand-blue" data-testid="order-total">{formatTHB(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-brand-navy">การชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p>
                <span className="text-muted-foreground">วิธีชำระเงิน: </span>
                {getPaymentLabel(order.paymentMethod)}
              </p>
              {order.paymentMethod === "TRANSFER" ? (
                order.status === "PENDING" ? (
                  <BankDetails amount={order.total} orderNo={order.orderNo} />
                ) : null
              ) : (
                <p className="text-muted-foreground">
                  ชำระเงินสด {formatTHB(order.total)} กับพนักงานจัดส่งเมื่อได้รับสินค้า
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-brand-navy">ที่อยู่จัดส่ง</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {address ? (
                <address className="grid gap-0.5 not-italic">
                  <span className="font-medium">{address.recipientName}</span>
                  <span>โทร {address.phone}</span>
                  <span>{address.line}</span>
                  <span>
                    {address.province} {address.postalCode}
                  </span>
                  {contactEmail && <span className="text-muted-foreground">อีเมล {contactEmail}</span>}
                </address>
              ) : (
                <p className="text-muted-foreground">ไม่มีข้อมูลที่อยู่</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {isOwner && (
          <Link href={`/account/orders/${encodeURIComponent(order.orderNo)}`} className={buttonVariants({ variant: "outline" })}>
            ติดตามคำสั่งซื้อ
          </Link>
        )}
        <Link href="/products" className={cn(buttonVariants(), "bg-brand-blue")}>
          เลือกซื้อสินค้าต่อ
        </Link>
      </div>
      {!user && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          กรุณาจดเลขที่คำสั่งซื้อไว้ — หน้านี้จะดูได้จากเบราว์เซอร์นี้ภายใน 2 ชั่วโมง
        </p>
      )}
    </div>
  );
}
