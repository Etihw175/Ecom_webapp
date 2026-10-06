"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert, FormField } from "@/components/account/form-field";
import type { ActionState } from "@/lib/validations/auth";
import { changePassword, updateProfile } from "./actions";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, {});

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "บันทึกแล้ว");
      // refresh the JWT so the header shows the new name
      update().then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="grid max-w-md gap-4">
      <FormField
        key={defaultName}
        label="ชื่อ-นามสกุล"
        name="name"
        defaultValue={defaultName}
        autoComplete="name"
        required
        errors={state.fieldErrors?.name}
      />
      {!state.ok && <FormAlert message={state.message} />}
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          บันทึกชื่อ
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "เปลี่ยนรหัสผ่านแล้ว");
      formRef.current?.reset();
    }
  }, [state]);

  const fe = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="grid max-w-md gap-4">
      <FormField
        label="รหัสผ่านปัจจุบัน"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        errors={fe.currentPassword}
      />
      <FormField
        label="รหัสผ่านใหม่"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={fe.newPassword}
      />
      <FormField
        label="ยืนยันรหัสผ่านใหม่"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={fe.confirmPassword}
      />
      {!state.ok && <FormAlert message={state.message} />}
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          เปลี่ยนรหัสผ่าน
        </Button>
      </div>
    </form>
  );
}
