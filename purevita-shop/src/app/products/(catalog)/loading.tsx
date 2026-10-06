import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10" aria-busy="true" aria-label="กำลังโหลดสินค้า">
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <div className="flex gap-2 overflow-hidden md:flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 shrink-0 md:w-full" />
            ))}
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-44" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid gap-2 rounded-xl border p-2 sm:p-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
