import { cn } from "@/lib/utils";

/** Small product thumbnail for admin tables (plain <img> so any pasted URL works). */
export function AdminThumb({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  return (
    <div className={cn("size-12 shrink-0 overflow-hidden rounded-md border bg-brand-sky/10", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnails; admin may paste any image URL
        <img src={src} alt={alt} loading="lazy" className="size-full object-contain" />
      ) : null}
    </div>
  );
}
