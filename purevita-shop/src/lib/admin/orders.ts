import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStatusMeta, type OrderStatus } from "@/lib/constants";
import { canCancel, canTransition, isOrderStatus } from "@/lib/admin/order-flow";

export const ADMIN_ORDERS_PER_PAGE = 20;

export type AdminOrderFilters = {
  status: OrderStatus | null;
  from: string | null; // YYYY-MM-DD (Asia/Bangkok)
  to: string | null; // YYYY-MM-DD (Asia/Bangkok)
  page: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDay(v: unknown): string | null {
  if (typeof v !== "string" || !DATE_RE.test(v)) return null;
  const d = new Date(`${v}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  // reject impossible dates like 2026-02-31 (Date rolls them over)
  const roundTrip = new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  return roundTrip === v ? v : null;
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Parse /admin/orders searchParams (?status=&from=&to=&page=). Invalid values are ignored. */
export function parseOrderFilters(sp: Record<string, string | string[] | undefined>): AdminOrderFilters {
  const status = first(sp.status);
  let from = validDay(first(sp.from));
  let to = validDay(first(sp.to));
  if (from && to && from > to) [from, to] = [to, from];
  const page = Math.max(1, Math.floor(Number(first(sp.page)) || 1));
  return { status: isOrderStatus(status) ? status : null, from, to, page };
}

/** Bangkok day bounds → UTC Date range */
export function bangkokDayStart(day: string) {
  return new Date(`${day}T00:00:00.000+07:00`);
}
export function bangkokDayEnd(day: string) {
  return new Date(`${day}T23:59:59.999+07:00`);
}

export function buildOrderWhere(f: Pick<AdminOrderFilters, "status" | "from" | "to">): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.from || f.to) {
    where.createdAt = {
      ...(f.from ? { gte: bangkokDayStart(f.from) } : {}),
      ...(f.to ? { lte: bangkokDayEnd(f.to) } : {}),
    };
  }
  return where;
}

/** All orders, newest first, 20/page. Page is clamped to the last page. */
export async function listAdminOrders(filters: AdminOrderFilters) {
  const where = buildOrderWhere(filters);
  const total = await prisma.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PER_PAGE));
  const page = Math.min(filters.page, pageCount);
  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ADMIN_ORDERS_PER_PAGE,
    take: ADMIN_ORDERS_PER_PAGE,
    select: {
      id: true,
      orderNo: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      status: true,
      user: { select: { name: true, email: true } },
    },
  });
  return { orders, total, page, pageCount };
}

export function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: { id: "asc" },
        include: { product: { select: { id: true, slug: true, imageUrl: true, stock: true } } },
      },
    },
  });
}

export type OrderMutationResult =
  | { ok: true; orderNo: string; status: OrderStatus; userId: string | null }
  | { ok: false; message: string };

/**
 * Move an order forward in the flow (see getAllowedNextStatuses). CANCELLED is rejected here —
 * use cancelOrder(). Optimistic guard: only updates if the status is still what we read.
 */
export async function updateOrderStatus(id: string, next: string): Promise<OrderMutationResult> {
  if (!isOrderStatus(next)) return { ok: false, message: "สถานะไม่ถูกต้อง" };
  if (next === "CANCELLED") return { ok: false, message: "กรุณาใช้ปุ่มยกเลิกคำสั่งซื้อเพื่อคืนสต็อกสินค้า" };

  const order = await prisma.order.findUnique({ where: { id }, select: { status: true, orderNo: true, userId: true } });
  if (!order) return { ok: false, message: "ไม่พบคำสั่งซื้อนี้" };
  if (!canTransition(order.status, next)) {
    return {
      ok: false,
      message: `ไม่สามารถเปลี่ยนสถานะจาก "${getStatusMeta(order.status).label}" เป็น "${getStatusMeta(next).label}" ได้`,
    };
  }
  const res = await prisma.order.updateMany({ where: { id, status: order.status }, data: { status: next } });
  if (res.count === 0) return { ok: false, message: "สถานะคำสั่งซื้อถูกเปลี่ยนไปแล้ว กรุณารีเฟรชหน้า" };
  return { ok: true, orderNo: order.orderNo, status: next, userId: order.userId };
}

class CancelRejected extends Error {}

/**
 * Cancel an order and restore stock for every OrderItem, all in ONE transaction.
 * The status flip is a conditional updateMany (status NOT IN CANCELLED/DELIVERED), so a second
 * (or concurrent) cancel matches 0 rows and never restocks twice.
 */
export async function cancelOrder(id: string): Promise<OrderMutationResult & { restocked?: { productId: string; qty: number }[] }> {
  const order = await prisma.order.findUnique({ where: { id }, select: { status: true, orderNo: true, userId: true } });
  if (!order) return { ok: false, message: "ไม่พบคำสั่งซื้อนี้" };
  if (!canCancel(order.status)) {
    return {
      ok: false,
      message:
        order.status === "CANCELLED"
          ? "คำสั่งซื้อนี้ถูกยกเลิกไปแล้ว"
          : "ไม่สามารถยกเลิกคำสั่งซื้อที่ลูกค้าได้รับสินค้าแล้ว",
    };
  }
  try {
    const restocked = await prisma.$transaction(async (tx) => {
      const flipped = await tx.order.updateMany({
        where: { id, status: { notIn: ["CANCELLED", "DELIVERED"] } },
        data: { status: "CANCELLED" },
      });
      if (flipped.count === 0) throw new CancelRejected();
      const items = await tx.orderItem.findMany({ where: { orderId: id }, select: { productId: true, qty: true } });
      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
      }
      return items;
    });
    return { ok: true, orderNo: order.orderNo, status: "CANCELLED", userId: order.userId, restocked };
  } catch (e) {
    if (e instanceof CancelRejected) {
      return { ok: false, message: "สถานะคำสั่งซื้อถูกเปลี่ยนไปแล้ว ไม่สามารถยกเลิกได้ กรุณารีเฟรชหน้า" };
    }
    throw e;
  }
}
