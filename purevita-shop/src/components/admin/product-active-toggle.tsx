"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProductActiveAction } from "@/app/admin/products/actions";

/** Soft delete (isActive=false) with in-page confirmation, or restore. */
export function ProductActiveToggle({
  productId,
  productName,
  isActive,
  compact = false,
}: {
  productId: string;
  productName: string;
  isActive: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const size = compact ? "sm" : "default";

  function run(next: boolean) {
    startTransition(async () => {
      const res = await setProductActiveAction(productId, next);
      if (res.ok) {
        toast.success(res.message ?? "บันทึกแล้ว");
        setConfirming(false);
        router.refresh();
      } else {
        toast.error(res.message ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  if (!isActive) {
    return (
      <Button type="button" variant="outline" size={size} disabled={pending} onClick={() => run(true)}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        เปิดขายอีกครั้ง
      </Button>
    );
  }

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" size={size} onClick={() => setConfirming(true)}>
        {compact ? "ปิดการขาย" : "ลบสินค้า (ปิดการขาย)"}
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label="ยืนยันการปิดการขาย"
      className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm"
    >
      <p className="text-destructive">
        ยืนยันปิดการขาย &quot;{productName}&quot;? สินค้าจะถูกซ่อนจากหน้าร้าน
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => run(false)}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          ยืนยัน
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
