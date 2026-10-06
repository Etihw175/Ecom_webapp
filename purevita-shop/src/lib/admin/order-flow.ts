import { ORDER_STATUS_VALUES, type OrderStatus } from "@/lib/constants";

/** Client-safe order status rules (no prisma import). */

/** Main flow PENDING > PAID > PACKING > SHIPPED > DELIVERED (CANCELLED is separate). */
export const ORDER_FLOW = ["PENDING", "PAID", "PACKING", "SHIPPED", "DELIVERED"] as const satisfies readonly OrderStatus[];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUS_VALUES as readonly string[]).includes(v);
}

/**
 * Statuses the admin may move an order to via the status select: any LATER step in the flow
 * (forward only, skipping allowed — e.g. COD orders go PENDING → PACKING). CANCELLED is not
 * offered here; it goes through cancelOrder() so stock is restored. DELIVERED / CANCELLED are final.
 */
export function getAllowedNextStatuses(current: string): OrderStatus[] {
  const idx = ORDER_FLOW.indexOf(current as (typeof ORDER_FLOW)[number]);
  if (idx === -1) return [];
  return ORDER_FLOW.slice(idx + 1);
}

export function canTransition(from: string, to: string): boolean {
  return (getAllowedNextStatuses(from) as string[]).includes(to);
}

/** Cancel (with restock) is allowed unless already CANCELLED or DELIVERED. */
export function canCancel(status: string): boolean {
  return isOrderStatus(status) && status !== "CANCELLED" && status !== "DELIVERED";
}
