"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/account/form-field";
import { getStatusMeta, type OrderStatus } from "@/lib/constants";
import type { ActionState } from "@/lib/validations/auth";
import { changeOrderStatusAction } from "@/app/admin/orders/actions";

export function OrderStatusForm({ orderId, allowed }: { orderId: string; allowed: OrderStatus[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    changeOrderStatusAction.bind(null, orderId),
    {},
  );

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "บันทึกแล้ว");
  }, [state]);

  if (allowed.length === 0) {
    return <p className="text-sm text-muted-foreground">คำสั่งซื้อนี้อยู่ในสถานะสุดท้ายแล้ว ไม่สามารถเปลี่ยนสถานะได้</p>;
  }

  return (
    // key on the first allowed status so the select resets after the status moves forward
    <form key={allowed[0]} action={action} className="grid gap-2">
      <Label htmlFor="status">เปลี่ยนสถานะเป็น</Label>
      <div className="flex gap-2">
        <select
          id="status"
          name="status"
          defaultValue={allowed[0]}
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {allowed.map((s) => (
            <option key={s} value={s}>
              {getStatusMeta(s).label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          บันทึก
        </Button>
      </div>
      {state.fieldErrors?.status?.[0] && <p className="text-sm text-destructive">{state.fieldErrors.status[0]}</p>}
      {!state.ok && <FormAlert message={state.message} />}
    </form>
  );
}
