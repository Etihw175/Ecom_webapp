import type { Metadata } from "next";
import Link from "next/link";
import { Home, PackageSearch, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "ไม่พบหน้าที่ต้องการ" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center md:py-24">
      <div className="relative mb-6">
        <span className="block bg-gradient-to-br from-brand-navy to-brand-blue bg-clip-text text-7xl font-bold text-transparent sm:text-8xl">
          404
        </span>
        <PackageSearch className="absolute -top-2 -right-8 size-10 rotate-12 text-brand-sky" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold text-brand-navy">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="mt-2 text-muted-foreground">
        หน้านี้อาจถูกย้าย ลบไปแล้ว หรือพิมพ์ที่อยู่ไม่ถูกต้อง ลองกลับไปหน้าแรกหรือเลือกดูสินค้าของเรา
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          <Home className="size-4" /> กลับหน้าแรก
        </Link>
        <Link href="/products" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <Search className="size-4" /> ดูสินค้าทั้งหมด
        </Link>
      </div>
    </div>
  );
}
