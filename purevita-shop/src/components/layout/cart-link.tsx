"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartCount } from "@/components/cart/cart-context";

/** Cart icon + count badge (count is 0 until the cart hydrates from localStorage). */

export function CartLink() {
  const count = useCartCount();
  return (
    <Link
      href="/cart"
      className="relative inline-flex size-10 items-center justify-center rounded-full text-brand-navy hover:bg-brand-sky/20"
      aria-label={`ตะกร้าสินค้า (${count} ชิ้น)`}
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span
          data-slot="cart-count"
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[11px] font-semibold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
