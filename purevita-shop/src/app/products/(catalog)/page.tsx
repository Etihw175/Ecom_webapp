import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import { SortSelect } from "@/components/product/sort-select";
import {
  PRODUCTS_PER_PAGE,
  PRODUCT_SORT_ORDER_BY,
  parseSort,
  productCardSelect,
  type ProductSort,
} from "@/lib/products";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type ListParams = { category?: string; q?: string; sort: ProductSort; page: number };

async function parseParams(searchParams: SearchParams): Promise<ListParams> {
  const sp = await searchParams;
  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const category = first(sp.category)?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);
  return { q, category, sort: parseSort(first(sp.sort)), page };
}

function buildHref(params: ListParams, patch: Partial<ListParams>) {
  const next = { ...params, ...patch };
  const usp = new URLSearchParams();
  if (next.category) usp.set("category", next.category);
  if (next.q) usp.set("q", next.q);
  if (next.sort !== "newest") usp.set("sort", next.sort);
  if (next.page > 1) usp.set("page", String(next.page));
  const qs = usp.toString();
  return qs ? `/products?${qs}` : "/products";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q, category } = await parseParams(searchParams);
  if (q) return { title: `ค้นหา "${q}"` };
  if (category) {
    const c = await prisma.category.findUnique({ where: { slug: category }, select: { name: true } });
    if (c) return { title: c.name };
  }
  return { title: "สินค้าทั้งหมด" };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await parseParams(searchParams);
  const { q, sort } = params;

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
  const activeCategory = categories.find((c) => c.slug === params.category);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(params.category ? { category: { slug: params.category } } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const page = Math.min(params.page, totalPages);
  const products = await prisma.product.findMany({
    where,
    orderBy: PRODUCT_SORT_ORDER_BY[sort],
    skip: (page - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
    select: productCardSelect,
  });
  const current: ListParams = { ...params, page };
  const allCount = categories.reduce((s, c) => s + c._count.products, 0);

  const title = activeCategory?.name ?? "สินค้าทั้งหมด";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="breadcrumb">
        <Link href="/" className="hover:text-brand-blue">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        {activeCategory ? (
          <>
            <Link href="/products" className="hover:text-brand-blue">
              สินค้า
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{activeCategory.name}</span>
          </>
        ) : (
          <span className="text-foreground">สินค้า</span>
        )}
      </nav>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Category filter: chips on mobile, sidebar on desktop */}
        <aside className="md:w-56 md:shrink-0">
          <h2 className="mb-3 hidden text-sm font-semibold text-brand-navy md:block">หมวดหมู่สินค้า</h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0">
            <li className="shrink-0">
              <CategoryLink href={buildHref(current, { category: undefined, page: 1 })} active={!params.category}>
                ทั้งหมด <Count n={allCount} />
              </CategoryLink>
            </li>
            {categories.map((c) => (
              <li key={c.id} className="shrink-0">
                <CategoryLink href={buildHref(current, { category: c.slug, page: 1 })} active={params.category === c.slug}>
                  {c.name} <Count n={c._count.products} />
                </CategoryLink>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">{q ? `ผลการค้นหา "${q}"` : title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                พบสินค้า {total.toLocaleString("th-TH")} รายการ
                {q && activeCategory ? ` ในหมวด ${activeCategory.name}` : ""}
                {q && (
                  <Link
                    href={buildHref(current, { q: undefined, page: 1 })}
                    className="ml-2 inline-flex items-center gap-0.5 text-brand-blue hover:underline"
                  >
                    <X className="size-3.5" /> ล้างคำค้นหา
                  </Link>
                )}
              </p>
            </div>
            <SortSelect value={sort} />
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-16 text-center">
              <PackageSearch className="mb-3 size-12 text-brand-sky" />
              <p className="text-lg font-semibold text-brand-navy">ไม่พบสินค้า</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น
              </p>
              <Link href="/products" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
                ดูสินค้าทั้งหมด
              </Link>
            </div>
          ) : (
            <ProductGrid products={products} priorityCount={4} />
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} hrefFor={(p) => buildHref(current, { page: p })} />
          )}
        </section>
      </div>
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="ml-1 text-xs opacity-70">({n})</span>;
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-full border px-4 py-1.5 text-sm whitespace-nowrap transition md:rounded-lg md:border-transparent md:px-3 md:py-2",
        active
          ? "border-brand-blue bg-brand-blue text-white md:bg-brand-blue"
          : "bg-white text-brand-navy hover:bg-brand-sky/20",
      )}
    >
      {children}
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  const base = buttonVariants({ variant: "outline", size: "icon" });

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="เปลี่ยนหน้า">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={base} aria-label="หน้าก่อนหน้า">
          <ChevronLeft />
        </Link>
      ) : (
        <span className={cn(base, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronLeft />
        </span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: p === page ? "default" : "outline", size: "icon" }),
              p === page && "pointer-events-none",
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={base} aria-label="หน้าถัดไป">
          <ChevronRight />
        </Link>
      ) : (
        <span className={cn(base, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRight />
        </span>
      )}
    </nav>
  );
}
