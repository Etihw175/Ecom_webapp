import { Badge } from "@/components/ui/badge";
import { getStatusMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = getStatusMeta(status);
  return (
    <Badge variant="outline" className={cn(meta.badgeClass, className)}>
      {meta.label}
    </Badge>
  );
}
