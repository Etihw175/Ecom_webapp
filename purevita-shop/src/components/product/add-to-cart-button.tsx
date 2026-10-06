"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils";

export type AddToCartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
};

type Props = {
  product: AddToCartProduct;
  qty?: number;
  size?: "default" | "sm" | "lg";
  className?: string;
  /** called after a successful add (e.g. reset a quantity selector) */
  onAdded?: () => void;
};

export function AddToCartButton({ product, qty = 1, size = "default", className, onAdded }: Props) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const outOfStock = product.stock <= 0;
  const inCart = items.find((i) => i.productId === product.id)?.qty ?? 0;
  const atMax = !outOfStock && inCart >= product.stock;

  function handleClick() {
    const result = addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
      },
      qty,
    );
    if (result.added === 0) {
      toast.warning("ไม่สามารถเพิ่มสินค้าได้", {
        description: `มีสินค้าในตะกร้าครบจำนวนคงเหลือแล้ว (${product.stock} ชิ้น)`,
      });
      return;
    }
    if (result.capped) {
      toast.warning(`เพิ่ม ${product.name} ได้ ${result.added} ชิ้น`, {
        description: `สินค้าคงเหลือ ${product.stock} ชิ้น (ในตะกร้า ${result.qty} ชิ้น)`,
      });
    } else {
      toast.success("เพิ่มลงตะกร้าแล้ว", {
        description: `${product.name} × ${result.added}`,
        action: { label: "ดูตะกร้า", onClick: () => router.push("/cart") },
      });
    }
    onAdded?.();
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={outOfStock || atMax}
      onClick={handleClick}
      className={cn(
        outOfStock ? "" : "bg-brand-orange text-white hover:bg-brand-orange/90",
        className,
      )}
    >
      <ShoppingCart />
      {outOfStock ? "สินค้าหมด" : atMax ? "ครบจำนวนในสต็อก" : "ใส่ตะกร้า"}
    </Button>
  );
}
