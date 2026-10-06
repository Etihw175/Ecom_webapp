import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  const user = await getCurrentUser();
  if (user) redirect(callbackUrl ?? (user.role === "ADMIN" ? "/admin" : "/account"));
  return <LoginForm callbackUrl={callbackUrl} />;
}
