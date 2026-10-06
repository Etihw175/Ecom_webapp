"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { cancelOrder, updateOrderStatus, type OrderMutationResult } from "@/lib/admin/orders";
import { getStatusMeta } from "@/lib/constants";
import type { ActionState } from "@/lib/validations/auth";

function revalidateOrderPaths(orderId: string, res: Extract<OrderMutationResult, { ok: true }>, stockChanged: boolean) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${res.orderNo}`);
  if (stockChanged) {
    revalidatePath("/admin/products");
    revalidatePath("/products", "layout"); // list + every /products/[slug]
    revalidatePath("/");
  }
}

/** Status select form: bind the order id → changeOrderStatusAction.bind(null, id). Field: "status". */
export async function changeOrderStatusAction(orderId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const next = formData.get("status");
  if (typeof next !== "string" || !next) {
    return { ok: false, fieldErrors: { status: ["กรุณาเลือกสถานะใหม่"] } };
  }
  const res = await updateOrderStatus(orderId, next);
  if (!res.ok) return { ok: false, message: res.message };
  revalidateOrderPaths(orderId, res, false);
  return { ok: true, message: `เปลี่ยนสถานะเป็น "${getStatusMeta(res.status).label}" แล้ว` };
}

/** Cancel + restock (single transaction, guarded against double restock). */
export async function cancelOrderAction(orderId: string): Promise<ActionState> {
  await requireAdmin();
  const res = await cancelOrder(orderId);
  if (!res.ok) return { ok: false, message: res.message };
  revalidateOrderPaths(orderId, res, true);
  return { ok: true, message: "ยกเลิกคำสั่งซื้อและคืนสต็อกสินค้าเรียบร้อยแล้ว" };
}
