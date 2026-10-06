import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  const user = await getCurrentUser();
  if (user) redirect(callbackUrl ?? "/account");
  return <RegisterForm callbackUrl={callbackUrl} />;
}
