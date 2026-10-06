import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "ตะกร้าสินค้า" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-brand-navy">ตะกร้าสินค้า</h1>
      <CartView />
    </div>
  );
}
