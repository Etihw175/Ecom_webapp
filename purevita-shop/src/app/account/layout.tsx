import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = { title: { default: "บัญชีของฉัน", template: "%s | PureVita" } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // middleware already guards /account/*; this is defence in depth
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-navy">บัญชีของฉัน</h1>
        <p className="text-sm text-muted-foreground">สวัสดีคุณ {user.name}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-40 md:self-start">
          <AccountNav />
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
