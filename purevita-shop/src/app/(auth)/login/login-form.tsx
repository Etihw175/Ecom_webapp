"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert, FormField } from "@/components/account/form-field";

export function LoginForm({ callbackUrl }: { callbackUrl: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setPending(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setPending(false);
        return;
      }
      let target = callbackUrl;
      if (!target) {
        const session = await getSession();
        target = session?.user?.role === "ADMIN" ? "/admin" : "/";
      }
      router.replace(target);
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setPending(false);
    }
  }

  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-brand-navy">เข้าสู่ระบบ</CardTitle>
        <CardDescription>ยินดีต้อนรับกลับสู่ PureVita</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4">
          <FormAlert message={error} />
          <FormField label="อีเมล" name="email" type="email" autoComplete="email" required />
          <FormField
            label="รหัสผ่าน"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            เข้าสู่ระบบ
          </Button>
          <p className="text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href={registerHref} className="font-medium text-brand-blue hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
