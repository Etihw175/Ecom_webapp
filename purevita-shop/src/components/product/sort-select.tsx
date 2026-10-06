"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_SORT_OPTIONS, type ProductSort } from "@/lib/product-sorts";

export function SortSelect({ value }: { value: ProductSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === "newest") params.delete("sort");
    else params.set("sort", next);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm whitespace-nowrap text-muted-foreground">เรียงตาม</span>
      <Select items={PRODUCT_SORT_OPTIONS} value={value} onValueChange={(v) => onChange(v as string | null)}>
        <SelectTrigger className="min-w-40 bg-white" aria-label="เรียงสินค้าตาม">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
