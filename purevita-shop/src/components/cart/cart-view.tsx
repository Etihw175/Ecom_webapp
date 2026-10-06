"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/components/cart/cart-context";
import { useCartSync } from "@/components/cart/use-cart-sync";
import { CartTotals } from "@/components/cart/cart-totals";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";

export function QtyStepper({
  item,
  onChange,
  disabled,
}: {
  item: Pick<CartItem, "qty" | "stock" | "name">;
  onChange: (qty: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-md border">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`ลดจำนวน ${item.name}`}
        disabled={disabled || item.qty <= 1}
        onClick={() => onChange(item.qty - 1)}
      >
        <Minus />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={item.stock}
        value={item.qty}
        disabled={disabled}
        aria-label={`จำนวน ${item.name}`}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= 1) onChange(v);
        }}
        className="h-8 w-12 [appearance:textfield] bg-transparent text-center text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`เพิ่มจำนวน ${item.name}`}
        disabled={disabled || item.qty >= item.stock}
        onClick={() => onChange(item.qty + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-busy="true" aria-label="กำลังโหลดตะกร้าสินค้า">
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 rounded-xl border p-4">
            <Skeleton className="size-20 shrink-0" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function CartView() {
  const { items, count, subtotal, hydrated, updateQty, removeItem } = useCart();
  const { syncing } = useCartSync();

  if (!hydrated) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-4 py-16 text-center">
        <ShoppingBag className="size-12 text-muted-foreground" />
        <div>
          <p className="text-lg font-medium text-brand-navy">ตะกร้าสินค้าของคุณยังว่างอยู่</p>
          <p className="text-sm text-muted-foreground">เลือกชมวิตามิน อาหารเสริม และเครื่องกรองน้ำของเรา</p>
        </div>
        <Link href="/products" className={buttonVariants()}>
          เลือกซื้อสินค้า
        </Link>
      </div>
    );
  }

  function handleQty(item: CartItem, qty: number) {
    if (qty > item.stock) {
      toast.warning(`${item.name} มีสินค้าคงเหลือ ${item.stock} ชิ้น`);
    }
    updateQty(item.productId, qty);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="grid content-start gap-3">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-4 rounded-xl border p-3 sm:p-4" data-testid="cart-line">
            <Link
              href={`/products/${item.slug}`}
              className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-brand-sky/10 sm:size-24"
            >
              <Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-contain" unoptimized />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Link href={`/products/${item.slug}`} className="line-clamp-2 font-medium hover:text-brand-blue">
                  {item.name}
                </Link>
                <p className="text-sm text-muted-foreground">{formatTHB(item.price)} / ชิ้น</p>
                {item.stock <= 5 && (
                  <p className="text-xs text-brand-orange">เหลือ {item.stock} ชิ้น</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end">
                <QtyStepper item={item} onChange={(q) => handleQty(item, q)} />
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatTHB(item.price * item.qty)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`ลบ ${item.name} ออกจากตะกร้า`}
                    onClick={() => {
                      removeItem(item.productId);
                      toast.success("นำสินค้าออกจากตะกร้าแล้ว", { description: item.name });
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base text-brand-navy">
            สรุปคำสั่งซื้อ
            {syncing && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="กำลังตรวจสอบสต็อก" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CartTotals subtotal={subtotal} count={count} />
          <Link
            href="/checkout"
            className={cn(buttonVariants({ size: "lg" }), "w-full bg-brand-orange text-white hover:bg-brand-orange/90")}
          >
            ดำเนินการสั่งซื้อ
          </Link>
          <Link href="/products" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            เลือกซื้อสินค้าต่อ
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
