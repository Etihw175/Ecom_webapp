// Client-safe (no Prisma import): sort options for /products.
export const PRODUCT_SORT_VALUES = ["newest", "price_asc", "price_desc"] as const;
export type ProductSort = (typeof PRODUCT_SORT_VALUES)[number];

export const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "ใหม่ล่าสุด" },
  { value: "price_asc", label: "ราคา: ต่ำ → สูง" },
  { value: "price_desc", label: "ราคา: สูง → ต่ำ" },
];

export function parseSort(value: string | undefined): ProductSort {
  return (PRODUCT_SORT_VALUES as readonly string[]).includes(value ?? "") ? (value as ProductSort) : "newest";
}
