"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, MapPin, Package, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HeaderUser } from "./types";

const triggerClass =
  "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-brand-navy outline-none hover:bg-brand-sky/20 focus-visible:ring-2 focus-visible:ring-brand-blue/50";

export function AccountLink({ user }: { user: HeaderUser }) {
  if (!user) {
    return (
      <Link href="/login" className={triggerClass}>
        <User className="size-5" />
        <span className="hidden sm:inline">เข้าสู่ระบบ</span>
      </Link>
    );
  }
  const isAdmin = user.role === "ADMIN";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label="เมนูบัญชีผู้ใช้">
        <User className="size-5" />
        <span className="hidden max-w-32 truncate sm:inline">{user.name ?? "บัญชีของฉัน"}</span>
        <ChevronDown className="hidden size-4 opacity-60 sm:inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.name ?? "บัญชีของฉัน"}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem render={<Link href="/admin" />}>
              <LayoutDashboard />
              หลังร้าน (แอดมิน)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem render={<Link href="/account" />}>
          <User />
          โปรไฟล์
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/orders" />}>
          <Package />
          คำสั่งซื้อของฉัน
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/addresses" />}>
          <MapPin />
          ที่อยู่จัดส่ง
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut />
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
