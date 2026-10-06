import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProductSort } from "@/lib/product-sorts";

export const PRODUCTS_PER_PAGE = 12;

export { parseSort, type ProductSort } from "@/lib/product-sorts";

export const PRODUCT_SORT_ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  price_asc: [{ price: "asc" }, { id: "asc" }],
  price_desc: [{ price: "desc" }, { id: "asc" }],
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getStockStatus(stock: number, lowStockThreshold: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "มีสินค้า", className: "bg-green-100 text-green-800 border-green-200" },
  low_stock: { label: "เหลือน้อย", className: "bg-amber-100 text-amber-800 border-amber-200" },
  out_of_stock: { label: "สินค้าหมด", className: "bg-red-100 text-red-800 border-red-200" },
};

/** Fields needed by ProductCard */
export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  imageUrl: true,
  stock: true,
  lowStockThreshold: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

/**
 * Split a seeded description into intro text + benefit bullets.
 * Format: "<intro>\n\nสรรพคุณ:\n- a\n- b"
 */
export function parseDescription(description: string): { intro: string; benefits: string[] } {
  const marker = description.indexOf("สรรพคุณ:");
  if (marker === -1) return { intro: description.trim(), benefits: [] };
  const intro = description.slice(0, marker).trim();
  const benefits = description
    .slice(marker + "สรรพคุณ:".length)
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
  return { intro, benefits };
}

/** Top-selling active products by total OrderItem qty (non-cancelled orders), padded with newest. */
export async function getBestSellers(limit = 8): Promise<ProductCardData[]> {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "CANCELLED" } }, product: { isActive: true } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.productId);
  const top = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids }, isActive: true }, select: productCardSelect })
    : [];
  const ranked = ids
    .map((id) => top.find((p) => p.id === id))
    .filter((p): p is ProductCardData => !!p);

  if (ranked.length < limit) {
    const filler = await prisma.product.findMany({
      where: { isActive: true, id: { notIn: ranked.map((p) => p.id) } },
      orderBy: { createdAt: "desc" },
      take: limit - ranked.length,
      select: productCardSelect,
    });
    ranked.push(...filler);
  }
  return ranked;
}

/** Local SVG placeholders can't go through the image optimizer without dangerouslyAllowSVG. */
export function isUnoptimizedImage(src: string) {
  return src.endsWith(".svg") || src.startsWith("data:");
}
