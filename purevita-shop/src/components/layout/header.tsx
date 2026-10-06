import Link from "next/link";
import { NAV_CATEGORIES } from "@/lib/constants";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { CartLink } from "./cart-link";
import { AccountLink } from "./account-link";
import { MobileNav } from "./mobile-nav";
import type { HeaderUser } from "./types";

export function Header({ user = null }: { user?: HeaderUser }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="bg-brand-navy px-4 py-1.5 text-center text-xs text-white">
        ส่งฟรีเมื่อซื้อครบ ฿800 · สินค้าของแท้ มีเลข อย.
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <MobileNav user={user} />
        <Logo className="shrink-0" />
        <SearchBox className="mx-4 hidden max-w-xl flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1">
          <AccountLink user={user} />
          <CartLink />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
      <nav className="hidden border-t md:block" aria-label="หมวดหมู่สินค้า">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 text-sm">
          <Link href="/products" className="font-medium text-brand-navy hover:text-brand-blue">
            สินค้าทั้งหมด
          </Link>
          {NAV_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="text-muted-foreground hover:text-brand-blue"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
