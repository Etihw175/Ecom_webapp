import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="กำลังโหลด">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid gap-2 rounded-xl border bg-white p-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-4">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
