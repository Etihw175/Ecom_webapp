"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton, type AddToCartProduct } from "./add-to-cart-button";

/** Quantity selector + add-to-cart button for the product detail page. */
export function PurchasePanel({ product }: { product: AddToCartProduct }) {
  const max = Math.max(product.stock, 0);
  const [qty, setQty] = useState(1);
  const disabled = max === 0;
  const value = Math.min(qty, Math.max(max, 1));

  function set(next: number) {
    if (Number.isNaN(next)) return;
    setQty(Math.min(Math.max(1, Math.floor(next)), Math.max(max, 1)));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">จำนวน</span>
        <div className="inline-flex items-center rounded-lg border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ลดจำนวน"
            disabled={disabled || value <= 1}
            onClick={() => set(value - 1)}
          >
            <Minus />
          </Button>
          <input
            type="number"
            inputMode="numeric"
            aria-label="จำนวน"
            min={1}
            max={max}
            value={disabled ? 0 : value}
            disabled={disabled}
            onChange={(e) => set(e.target.valueAsNumber)}
            className="w-12 [appearance:textfield] bg-transparent text-center text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="เพิ่มจำนวน"
            disabled={disabled || value >= max}
            onClick={() => set(value + 1)}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <AddToCartButton
        product={product}
        qty={value}
        size="lg"
        className="h-11 px-8 text-base sm:flex-1 md:flex-none"
        onAdded={() => setQty(1)}
      />
    </div>
  );
}
