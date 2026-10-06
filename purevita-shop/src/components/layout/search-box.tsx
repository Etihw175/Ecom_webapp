import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Plain GET form -> /products?q=... (works without JS) */
export function SearchBox({ className, defaultValue }: { className?: string; defaultValue?: string }) {
  return (
    <form action="/products" method="get" role="search" className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="ค้นหาสินค้า เช่น ถั่งเช่า, วิตามินซี"
        aria-label="ค้นหาสินค้า"
        className="h-10 w-full rounded-full border border-input bg-white pr-4 pl-9 text-sm outline-none focus-visible:border-brand-blue focus-visible:ring-3 focus-visible:ring-brand-blue/20"
      />
    </form>
  );
}
