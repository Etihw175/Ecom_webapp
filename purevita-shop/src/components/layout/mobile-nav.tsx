"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NAV_CATEGORIES } from "@/lib/constants";
import type { HeaderUser } from "./types";

const linkClass = "block rounded-md px-3 py-2 text-base text-brand-navy hover:bg-brand-sky/20";

export function MobileNav({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="เปิดเมนู" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-brand-navy">PureVita · เพียววิต้า</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2 pb-6" aria-label="เมนูหลัก">
          <Link href="/" className={linkClass} onClick={close}>
            หน้าแรก
          </Link>
          <Link href="/products" className={linkClass} onClick={close}>
            สินค้าทั้งหมด
          </Link>
          <Separator className="my-2" />
          <p className="px-3 text-xs font-medium text-muted-foreground">หมวดหมู่</p>
          {NAV_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} className={linkClass} onClick={close}>
              {c.name}
            </Link>
          ))}
          <Separator className="my-2" />
          <Link href="/cart" className={linkClass} onClick={close}>
            ตะกร้าสินค้า
          </Link>
          {user ? (
            <>
              <Link href="/account" className={linkClass} onClick={close}>
                บัญชีของฉัน
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className={linkClass} onClick={close}>
                  หลังร้าน (แอดมิน)
                </Link>
              )}
              <button
                type="button"
                className={`${linkClass} text-left text-destructive`}
                onClick={() => {
                  close();
                  signOut({ callbackUrl: "/" });
                }}
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass} onClick={close}>
                เข้าสู่ระบบ
              </Link>
              <Link href="/register" className={linkClass} onClick={close}>
                สมัครสมาชิก
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
