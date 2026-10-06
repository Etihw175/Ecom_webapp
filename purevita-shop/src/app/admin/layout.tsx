import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { default: "หลังร้าน", template: "%s | หลังร้าน PureVita" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware guards /admin/*; this is defence in depth (every server action re-checks too)
  const user = await requireAdmin();
  return (
    <div className="bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-6">
          <div>
            <p className="text-xs text-muted-foreground">ผู้ดูแลระบบ: {user.name}</p>
          </div>
          <AdminMobileNav />
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="hidden md:sticky md:top-40 md:block md:self-start">
            <AdminSidebar />
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </div>
  );
}
