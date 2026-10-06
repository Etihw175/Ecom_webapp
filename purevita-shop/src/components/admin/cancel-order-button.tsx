"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/account/form-field";
import { cancelOrderAction } from "@/app/admin/orders/actions";

/** Cancel order with in-page confirmation (no window.confirm). Restocks every item server-side. */
export function CancelOrderButton({ orderId, orderNo, itemCount }: { orderId: string; orderNo: string; itemCount: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      const res = await cancelOrderAction(orderId);
      if (res.ok) {
        toast.success(res.message ?? "ยกเลิกแล้ว");
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.message);
        router.refresh();
      }
    });
  }

  if (!confirming) {
    return (
      <div className="grid gap-2">
        <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
          <XCircle className="size-4" /> ยกเลิกคำสั่งซื้อ
        </Button>
        <FormAlert message={error} />
      </div>
    );
  }

  return (
    <div role="alertdialog" aria-label="ยืนยันการยกเลิกคำสั่งซื้อ" className="grid gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="text-destructive">
        ยืนยันยกเลิกคำสั่งซื้อ <strong>{orderNo}</strong>? ระบบจะคืนสต็อกสินค้า {itemCount} รายการ และไม่สามารถย้อนกลับได้
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          ยืนยันยกเลิก
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          ไม่ยกเลิก
        </Button>
      </div>
      <FormAlert message={error} />
    </div>
  );
}
