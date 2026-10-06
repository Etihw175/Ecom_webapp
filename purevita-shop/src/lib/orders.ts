import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcShipping } from "@/lib/constants";
import { generateOrderNo } from "@/lib/order-no";
import type { AddressSnapshot } from "@/lib/addresses";
import type { CreateOrderData } from "@/lib/validations/order";

/** Thrown inside the order transaction → rolls everything back. */
export class OrderError extends Error {
  constructor(
    public status: number,
    public code: "OUT_OF_STOCK" | "UNAVAILABLE" | "ADDRESS_NOT_FOUND",
    message: string,
    public extra: { productId?: string; productName?: string; available?: number } = {},
  ) {
    super(message);
  }
}

export type PlaceOrderResult = { orderNo: string; orderId: string; total: number };

/** Address snapshot stored on the order (guest contact email is kept here too). */
export type OrderAddressSnapshot = AddressSnapshot & { email?: string };

const MAX_ORDER_NO_ATTEMPTS = 5;

function isOrderNoCollision(e: unknown) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const target = (e.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) ? target.includes("orderNo") : String(target ?? "").includes("orderNo");
}

/**
 * Create an order atomically. Prices/names come from the DB, never from the client.
 * Stock is decremented with a conditional updateMany (stock >= qty) so concurrent orders can
 * never oversell; any failure rolls back the whole transaction.
 */
export async function placeOrder(
  input: CreateOrderData,
  userId: string | null,
): Promise<PlaceOrderResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // 1) shipping address
          let snapshot: OrderAddressSnapshot;
          if (input.addressId) {
            const saved = userId
              ? await tx.address.findFirst({ where: { id: input.addressId, userId } })
              : null;
            if (!saved) throw new OrderError(400, "ADDRESS_NOT_FOUND", "ไม่พบที่อยู่ที่เลือก กรุณาเลือกใหม่");
            snapshot = {
              recipientName: saved.recipientName,
              phone: saved.phone,
              line: saved.line,
              province: saved.province,
              postalCode: saved.postalCode,
            };
          } else {
            const a = input.address!;
            snapshot = { ...a };
            if (userId && input.saveAddress) {
              const hasAny = (await tx.address.count({ where: { userId } })) > 0;
              await tx.address.create({ data: { ...a, userId, isDefault: !hasAny } });
            }
          }
          if (!userId && input.email) snapshot.email = input.email;

          // 2) load products (authoritative prices/names)
          const ids = input.items.map((i) => i.productId);
          const products = await tx.product.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, price: true, stock: true, isActive: true },
          });
          const byId = new Map(products.map((p) => [p.id, p]));

          // 3) conditional stock decrement per line
          for (const line of input.items) {
            const p = byId.get(line.productId);
            if (!p || !p.isActive) {
              throw new OrderError(409, "UNAVAILABLE", `สินค้า${p ? ` "${p.name}"` : ""}ไม่มีจำหน่ายแล้ว`, {
                productId: line.productId,
                productName: p?.name,
                available: 0,
              });
            }
            const res = await tx.product.updateMany({
              where: { id: p.id, isActive: true, stock: { gte: line.qty } },
              data: { stock: { decrement: line.qty } },
            });
            if (res.count === 0) {
              const fresh = await tx.product.findUnique({ where: { id: p.id }, select: { stock: true } });
              const available = Math.max(0, fresh?.stock ?? 0);
              throw new OrderError(
                409,
                "OUT_OF_STOCK",
                available > 0
                  ? `สินค้า "${p.name}" เหลือเพียง ${available} ชิ้น`
                  : `สินค้า "${p.name}" หมดแล้ว`,
                { productId: p.id, productName: p.name, available },
              );
            }
          }

          // 4) totals (server-side)
          const subtotal = input.items.reduce((s, l) => s + byId.get(l.productId)!.price * l.qty, 0);
          const shippingFee = calcShipping(subtotal);
          const total = subtotal + shippingFee;

          // 5) order + items with snapshots
          const order = await tx.order.create({
            data: {
              orderNo: generateOrderNo(),
              userId,
              status: "PENDING",
              subtotal,
              shippingFee,
              total,
              paymentMethod: input.paymentMethod,
              addressSnapshot: JSON.stringify(snapshot),
              items: {
                create: input.items.map((l) => {
                  const p = byId.get(l.productId)!;
                  return { productId: p.id, nameSnapshot: p.name, priceSnapshot: p.price, qty: l.qty };
                }),
              },
            },
            select: { id: true, orderNo: true, total: true },
          });
          return { orderNo: order.orderNo, orderId: order.id, total: order.total };
        },
        // SQLite serializes writers: let queued transactions wait instead of failing fast.
        { maxWait: 15_000, timeout: 20_000 },
      );
    } catch (e) {
      if (isOrderNoCollision(e) && attempt < MAX_ORDER_NO_ATTEMPTS) continue;
      throw e;
    }
  }
}
