import Link from "next/link";
import { NAV_CATEGORIES } from "@/lib/constants";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-navy text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm">
            วิตามิน อาหารเสริม ถั่งเช่า และเครื่องกรองน้ำคุณภาพ เพื่อสุขภาพที่ดีของทุกคนในครอบครัว
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">หมวดหมู่สินค้า</h3>
          <ul className="space-y-2 text-sm">
            {NAV_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/products?category=${c.slug}`} className="hover:text-brand-sky">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">บริการลูกค้า</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/account/orders" className="hover:text-brand-sky">
                ติดตามคำสั่งซื้อ
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-brand-sky">
                บัญชีของฉัน
              </Link>
            </li>
            <li>ส่งฟรีเมื่อซื้อครบ ฿800</li>
            <li>ชำระเงินโอน / เก็บเงินปลายทาง</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">ติดต่อเรา</h3>
          <ul className="space-y-2 text-sm">
            <li>โทร 02-123-4567</li>
            <li>LINE: @purevita</li>
            <li>จันทร์–เสาร์ 9:00–18:00 น.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} PureVita · เพียววิต้า — เว็บไซต์ตัวอย่างเพื่อการสาธิต
      </div>
    </footer>
  );
}
