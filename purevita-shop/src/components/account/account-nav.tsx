"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./logout-button";

const items = [
  { href: "/account", label: "โปรไฟล์", icon: User, exact: true },
  { href: "/account/orders", label: "คำสั่งซื้อ", icon: Package, exact: false },
  { href: "/account/addresses", label: "ที่อยู่", icon: MapPin, exact: false },
] as const;

const itemClass =
  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors";

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="เมนูบัญชี"
      className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:border-b-0 md:px-0 md:pb-0"
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              itemClass,
              active
                ? "bg-brand-blue text-white"
                : "text-brand-navy hover:bg-brand-sky/20",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      <LogoutButton
        className={cn(itemClass, "text-destructive hover:bg-destructive/10 md:mt-2 md:border-t md:rounded-none md:pt-3")}
      />
    </nav>
  );
}
