"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddressFormDialog, type AddressFormValues } from "./address-form-dialog";
import { deleteAddress, setDefaultAddress } from "./actions";

export function AddressCardActions({ address }: { address: AddressFormValues }) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function run(fn: () => Promise<{ ok?: boolean; message?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "สำเร็จ");
      else toast.error(res.message ?? "เกิดข้อผิดพลาด");
      after?.();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AddressFormDialog
        address={address}
        trigger={
          <Button variant="outline" size="sm">
            <Pencil /> แก้ไข
          </Button>
        }
      />
      {!address.isDefault && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setDefaultAddress(address.id))}
        >
          <Star /> ตั้งเป็นที่อยู่หลัก
        </Button>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger
          render={
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />
          }
        >
          <Trash2 /> ลบ
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบที่อยู่นี้?</DialogTitle>
            <DialogDescription>
              {address.recipientName} · {address.line} {address.province} {address.postalCode}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteAddress(address.id), () => setConfirmOpen(false))}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              ลบที่อยู่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
