import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatTHB } from "@/lib/format";
import { FREE_SHIPPING_MIN } from "@/lib/constants";
import {
  STOCK_STATUS_META,
  getStockStatus,
  isUnoptimizedImage,
  parseDescription,
  productCardSelect,
} from "@/lib/products";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductGrid } from "@/components/product/product-card";
import { cn } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

const getProduct = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  return product?.isActive ? product : null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "ไม่พบสินค้า" };
  const { intro } = parseDescription(product.description);
  return {
    title: product.name,
    description: intro.slice(0, 160),
    openGraph: { title: product.name, description: intro.slice(0, 160) },
  };
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const status = getStockStatus(product.stock, product.lowStockThreshold);
  const meta = STOCK_STATUS_META[status];
  const { intro, benefits } = parseDescription(product.description);

  const related = await prisma.product.findMany({
    where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: productCardSelect,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="breadcrumb">
        <Link href="/" className="hover:text-brand-blue">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-brand-blue">
          สินค้า
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand-blue">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-2xl border bg-brand-sky/10">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            unoptimized={isUnoptimizedImage(product.imageUrl)}
            className={cn("object-cover", status === "out_of_stock" && "opacity-60 grayscale")}
          />
          {status === "out_of_stock" && (
            <span className="absolute top-4 left-4 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white shadow">
              สินค้าหมด
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <Link
            href={`/products?category=${product.category.slug}`}
            className="w-fit text-sm text-brand-blue hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-brand-navy md:text-3xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-bold text-brand-blue">{formatTHB(product.price)}</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className={cn("rounded-full border px-3 py-0.5 font-medium", meta.className)}>{meta.label}</span>
            {status === "low_stock" && (
              <span className="text-amber-700">เหลือเพียง {product.stock} ชิ้น รีบสั่งก่อนหมด!</span>
            )}
            {status === "in_stock" && <span className="text-muted-foreground">พร้อมส่ง {product.stock} ชิ้น</span>}
            {status === "out_of_stock" && <span className="text-muted-foreground">กรุณารอสินค้าเข้าใหม่เร็ว ๆ นี้</span>}
          </div>

          {intro && <p className="mt-5 leading-relaxed whitespace-pre-line text-foreground/85">{intro}</p>}

          <div className="mt-6 rounded-xl border bg-brand-sky/5 p-4">
            <PurchasePanel
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                stock: product.stock,
              }}
            />
          </div>

          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-brand-green" /> ส่งฟรีเมื่อซื้อครบ {formatTHB(FREE_SHIPPING_MIN)}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand-green" /> สินค้าของแท้ มีเลข อย.
            </li>
          </ul>

          {benefits.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-brand-navy">สรรพคุณ</h2>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-green" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold text-brand-navy">สินค้าในหมวดเดียวกัน</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
