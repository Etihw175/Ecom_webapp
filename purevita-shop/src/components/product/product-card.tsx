import Image from "next/image";
import Link from "next/link";
import { formatTHB } from "@/lib/format";
import { getStockStatus, isUnoptimizedImage, type ProductCardData } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const status = getStockStatus(product.stock, product.lowStockThreshold);
  const href = `/products/${product.slug}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-brand-sky/10">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          unoptimized={isUnoptimizedImage(product.imageUrl)}
          className={cn(
            "object-cover transition duration-300 group-hover:scale-105",
            status === "out_of_stock" && "opacity-60 grayscale",
          )}
        />
        {status === "out_of_stock" && (
          <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow">
            สินค้าหมด
          </span>
        )}
        {status === "low_stock" && (
          <span className="absolute top-2 left-2 rounded-full bg-brand-orange px-2.5 py-0.5 text-xs font-semibold text-white shadow">
            เหลือ {product.stock} ชิ้น
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          href={`/products?category=${product.category.slug}`}
          className="w-fit text-xs text-brand-blue hover:underline"
        >
          {product.category.name}
        </Link>
        <Link href={href} className="line-clamp-2 min-h-10 text-sm font-medium text-brand-navy hover:text-brand-blue">
          {product.name}
        </Link>
        <p className="mt-auto pt-1 text-lg font-bold text-brand-navy">{formatTHB(product.price)}</p>
      </div>
    </div>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
