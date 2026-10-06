"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField } from "@/components/account/form-field";
import type { ActionState } from "@/lib/validations/auth";
import { saveAddress } from "./actions";

export type AddressFormValues = {
  id: string;
  recipientName: string;
  phone: string;
  line: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

export function AddressFormDialog({
  address,
  trigger,
  isFirst = false,
}: {
  /** omit to add a new address */
  address?: AddressFormValues;
  /** defaults to a "เพิ่มที่อยู่ใหม่" button (pass from client components only) */
  trigger?: React.ReactElement;
  isFirst?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const isEdit = !!address;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveAddress({}, fd);
      setState(result);
      if (result.ok) {
        toast.success(result.message ?? "บันทึกแล้ว");
        setOpen(false);
        setState({});
      }
    });
  }

  const fe = state.fieldErrors ?? {};

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setState({});
      }}
    >
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus /> เพิ่มที่อยู่ใหม่
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</DialogTitle>
          <DialogDescription>ที่อยู่สำหรับจัดส่งสินค้า</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {address && <input type="hidden" name="id" value={address.id} />}
          {!state.ok && <FormAlert message={state.message} />}
          <FormField
            id="addr-recipientName"
            label="ชื่อผู้รับ"
            name="recipientName"
            defaultValue={address?.recipientName}
            autoComplete="name"
            required
            errors={fe.recipientName}
          />
          <FormField
            id="addr-phone"
            label="เบอร์โทร"
            name="phone"
            type="tel"
            inputMode="numeric"
            placeholder="0812345678"
            maxLength={12}
            defaultValue={address?.phone}
            autoComplete="tel"
            required
            errors={fe.phone}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="addr-line">ที่อยู่</Label>
            <Textarea
              id="addr-line"
              name="line"
              rows={3}
              placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ"
              defaultValue={address?.line}
              autoComplete="street-address"
              aria-invalid={fe.line ? true : undefined}
              required
            />
            {fe.line && <p className="text-sm text-destructive">{fe.line[0]}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="addr-province"
              label="จังหวัด"
              name="province"
              defaultValue={address?.province}
              autoComplete="address-level1"
              required
              errors={fe.province}
            />
            <FormField
              id="addr-postalCode"
              label="รหัสไปรษณีย์"
              name="postalCode"
              inputMode="numeric"
              maxLength={5}
              placeholder="10110"
              defaultValue={address?.postalCode}
              autoComplete="postal-code"
              required
              errors={fe.postalCode}
            />
          </div>
          {!address?.isDefault && !isFirst && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" className="size-4 accent-brand-blue" />
              ตั้งเป็นที่อยู่หลัก
            </label>
          )}
          {isFirst && (
            <p className="text-sm text-muted-foreground">ที่อยู่แรกจะถูกตั้งเป็นที่อยู่หลักโดยอัตโนมัติ</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
