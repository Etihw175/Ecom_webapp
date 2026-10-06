import Link from "next/link";
import { ArrowRight, Droplets, Leaf, Pill, ShieldCheck, Sparkles, Truck, Wallet, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import { prisma } from "@/lib/prisma";
import { getBestSellers } from "@/lib/products";
import { FREE_SHIPPING_MIN } from "@/lib/constants";
import { formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERKS = [
  { icon: Truck, title: "ส่งฟรี", text: `เมื่อซื้อครบ ${formatTHB(FREE_SHIPPING_MIN)}` },
  { icon: ShieldCheck, title: "ของแท้ 100%", text: "มีเลข อย. ทุกชิ้น" },
  { icon: Wallet, title: "ชำระเงินสะดวก", text: "โอนเงิน หรือ เก็บเงินปลายทาง" },
];

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; className: string; text: string }> = {
  vitamins: { icon: Pill, className: "from-brand-orange/15 to-brand-orange/5 text-brand-orange", text: "วิตามินจำเป็นสำหรับทุกวัน" },
  supplements: { icon: Sparkles, className: "from-brand-blue/15 to-brand-blue/5 text-brand-blue", text: "เสริมสุขภาพและความงาม" },
  cordyceps: { icon: Leaf, className: "from-brand-green/15 to-brand-green/5 text-brand-green", text: "ถั่งเช่าคัดเกรดพรีเมียม" },
  "water-filters": { icon: Droplets, className: "from-brand-sky/40 to-brand-sky/10 text-brand-navy", text: "น้ำสะอาด ปลอดภัย ทั้งบ้าน" },
};
const DEFAULT_STYLE = { icon: Sparkles, className: "from-brand-sky/30 to-brand-sky/5 text-brand-navy", text: "" };

export default async function HomePage() {
  const [bestSellers, categories] = await Promise.all([
    getBestSellers(8),
    prisma.category.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    }),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-blue text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-sky/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-brand-green/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm text-brand-sky">
            PureVita · เพียววิต้า
          </p>
          <h1 className="max-w-2xl text-3xl leading-tight font-bold md:text-5xl md:leading-tight">
            สุขภาพดีเริ่มต้นที่ตัวคุณ
            <br />
            <span className="text-brand-sky">คัดสรรสิ่งดีที่สุดเพื่อครอบครัว</span>
          </h1>
          <p className="mt-4 max-w-xl text-white/85 md:text-lg">
            วิตามิน อาหารเสริม ถั่งเช่า และเครื่องกรองน้ำคุณภาพ ของแท้ มีเลข อย. ส่งฟรีเมื่อซื้อครบ{" "}
            {formatTHB(FREE_SHIPPING_MIN)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 bg-brand-orange px-6 text-base text-white hover:bg-brand-orange/90",
              )}
            >
              เลือกซื้อสินค้า <ArrowRight />
            </Link>
            <Link
              href="/products?category=cordyceps"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-11 border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white",
              )}
            >
              ถั่งเช่าพรีเมียม
            </Link>
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-xl border p-4">
            <Icon className="size-8 shrink-0 text-brand-green" />
            <div>
              <p className="font-semibold text-brand-navy">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-4 text-xl font-semibold text-brand-navy md:text-2xl">หมวดหมู่สินค้า</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {categories.map((c) => {
            const style = CATEGORY_STYLE[c.slug] ?? DEFAULT_STYLE;
            const Icon = style.icon;
            return (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className={cn(
                  "group flex flex-col rounded-2xl border bg-gradient-to-br p-5 transition hover:-translate-y-0.5 hover:shadow-md",
                  style.className,
                )}
              >
                <Icon className="size-9" />
                <p className="mt-4 text-lg font-semibold text-brand-navy">{c.name}</p>
                {style.text && <p className="mt-0.5 text-sm text-muted-foreground">{style.text}</p>}
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-blue">
                  {c._count.products} รายการ
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Best sellers */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-navy md:text-2xl">สินค้าขายดี</h2>
            <p className="text-sm text-muted-foreground">สินค้าที่ลูกค้าเลือกซื้อมากที่สุด</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline">
            ดูทั้งหมด <ArrowRight className="size-4" />
          </Link>
        </div>
        {bestSellers.length > 0 ? (
          <ProductGrid products={bestSellers} />
        ) : (
          <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">ยังไม่มีสินค้า</p>
        )}
      </section>
    </div>
  );
}
