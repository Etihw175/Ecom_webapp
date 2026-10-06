import { Truck } from "lucide-react";
import { calcShipping, FREE_SHIPPING_MIN } from "@/lib/constants";
import { formatTHB } from "@/lib/format";
import { Separator } from "@/components/ui/separator";

/** Subtotal / shipping / total block with the free-shipping hint (cart + checkout). */
export function CartTotals({ subtotal, count }: { subtotal: number; count?: number }) {
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;
  const remaining = FREE_SHIPPING_MIN - subtotal;
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">ยอดรวมสินค้า{count !== undefined ? ` (${count} ชิ้น)` : ""}</span>
        <span>{formatTHB(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">ค่าจัดส่ง</span>
        <span className={shipping === 0 ? "font-medium text-brand-green" : ""}>
          {shipping === 0 ? "ส่งฟรี" : formatTHB(shipping)}
        </span>
      </div>
      {subtotal > 0 && remaining > 0 ? (
        <p className="flex items-center gap-2 rounded-md bg-brand-orange/10 px-3 py-2 text-xs text-brand-orange">
          <Truck className="size-4 shrink-0" />
          ซื้อเพิ่มอีก {formatTHB(remaining)} เพื่อส่งฟรี
        </p>
      ) : subtotal > 0 ? (
        <p className="flex items-center gap-2 rounded-md bg-brand-green/10 px-3 py-2 text-xs text-brand-green">
          <Truck className="size-4 shrink-0" />
          คุณได้รับสิทธิ์ส่งฟรี
        </p>
      ) : null}
      <Separator className="my-1" />
      <div className="flex justify-between text-base font-semibold">
        <span>ยอดชำระทั้งหมด</span>
        <span className="text-brand-blue">{formatTHB(total)}</span>
      </div>
    </div>
  );
}
