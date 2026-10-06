"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatTHB } from "@/lib/format";
import { useCart, type CartSyncChange, type CartSyncInput } from "@/components/cart/cart-context";

export function describeCartChange(c: CartSyncChange): string {
  switch (c.type) {
    case "removed":
      return `${c.name} หมดหรือไม่มีจำหน่ายแล้ว — นำออกจากตะกร้า`;
    case "qty":
      return `${c.name} เหลือเพียง ${c.to} ชิ้น — ปรับจำนวนจาก ${c.from} เป็น ${c.to}`;
    case "price":
      return `${c.name} ราคาเปลี่ยนจาก ${formatTHB(c.from)} เป็น ${formatTHB(c.to)}`;
  }
}

/**
 * Once the cart is hydrated, fetch fresh price/stock for its products (POST /api/cart/sync)
 * and reconcile the cart. Shows a toast listing anything that changed.
 */
export function useCartSync() {
  const { hydrated, items, syncProducts } = useCart();
  const done = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const ids = items.map((i) => i.productId).join(",");

  useEffect(() => {
    if (!hydrated || done.current || !ids) return;
    const controller = new AbortController();
    setSyncing(true);
    fetch("/api/cart/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids.split(",") }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return;
        done.current = true; // set only on success so an aborted (StrictMode) run is retried
        const data = (await res.json()) as { products: CartSyncInput[] };
        const changes = syncProducts(data.products);
        if (changes.length) {
          toast.warning("ตะกร้าสินค้าของคุณมีการเปลี่ยนแปลง", {
            description: changes.map(describeCartChange).join("\n"),
            duration: 8000,
            classNames: { description: "whitespace-pre-line" },
          });
        }
      })
      .catch(() => {
        // offline / aborted — keep the local snapshot; the order API re-checks everything anyway
      })
      .finally(() => setSyncing(false));
    return () => controller.abort();
  }, [hydrated, ids, syncProducts]);

  return { syncing };
}
