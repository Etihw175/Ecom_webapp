"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert, FormField } from "@/components/account/form-field";
import type { ActionState } from "@/lib/validations/auth";
import { registerUser } from "./actions";

export function RegisterForm({ callbackUrl }: { callbackUrl: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await registerUser({}, fd);
      setState(result);
      if (!result.ok) {
        setPending(false);
        return;
      }
      const res = await signIn("credentials", {
        email: String(fd.get("email") ?? "").trim(),
        password: String(fd.get("password") ?? ""),
        redirect: false,
      });
      if (!res || res.error) {
        toast.success("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
        router.push("/login");
        return;
      }
      toast.success("สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!");
      router.replace(callbackUrl ?? "/");
      router.refresh();
    } catch {
      setState({ ok: false, message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
      setPending(false);
    }
  }

  const fe = state.fieldErrors ?? {};
  const loginHref = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-brand-navy">สมัครสมาชิก</CardTitle>
        <CardDescription>สร้างบัญชีเพื่อติดตามคำสั่งซื้อและบันทึกที่อยู่จัดส่ง</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          {!state.ok && <FormAlert message={state.message} />}
          <FormField label="ชื่อ-นามสกุล" name="name" autoComplete="name" required errors={fe.name} />
          <FormField label="อีเมล" name="email" type="email" autoComplete="email" required errors={fe.email} />
          <FormField
            label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            errors={fe.password}
          />
          <FormField
            label="ยืนยันรหัสผ่าน"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            errors={fe.confirmPassword}
          />
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            สมัครสมาชิก
          </Button>
          <p className="text-sm text-muted-foreground">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href={loginHref} className="font-medium text-brand-blue hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
