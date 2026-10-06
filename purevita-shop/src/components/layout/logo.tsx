import Link from "next/link";
import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)} aria-label="PureVita หน้าแรก">
      <span className="flex size-9 items-center justify-center rounded-full bg-brand-blue text-white">
        <Droplets className="size-5" />
      </span>
      <span className="leading-tight">
        <span className={cn("block text-lg", light ? "text-white" : "text-brand-navy")}>PureVita</span>
        <span className={cn("block text-xs font-normal", light ? "text-brand-sky" : "text-brand-blue")}>
          เพียววิต้า
        </span>
      </span>
    </Link>
  );
}
