"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Package, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const items = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "สินค้า", icon: Package, exact: false },
  { href: "/admin/orders", label: "คำสั่งซื้อ", icon: ShoppingBag, exact: false },
] as const;

const itemClass = "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูผู้ดูแลระบบ" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(itemClass, active ? "bg-brand-blue text-white" : "text-brand-navy hover:bg-brand-sky/20")}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(itemClass, "mt-2 border-t pt-3 text-muted-foreground hover:bg-brand-sky/20 hover:text-brand-navy")}
      >
        <Store className="size-4" />
        กลับหน้าร้าน
      </Link>
    </nav>
  );
}

/** Desktop sidebar (md+). */
export function AdminSidebar() {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">หลังร้าน</p>
      <NavLinks />
    </div>
  );
}

/** Mobile: menu button opening a Sheet (below md). */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="md:hidden" aria-label="เปิดเมนูหลังร้าน" />}>
        <Menu className="size-4" />
        เมนูหลังร้าน
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-brand-navy">หลังร้าน PureVita</SheetTitle>
        </SheetHeader>
        <div className="px-2 pb-6">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
