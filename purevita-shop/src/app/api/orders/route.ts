import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderError, placeOrder } from "@/lib/orders";
import {
  createOrderSchema,
  issuesToFieldErrors,
  type CreateOrderError,
  type CreateOrderSuccess,
} from "@/lib/validations/order";
import { addGuestOrder, GUEST_ORDERS_COOKIE, GUEST_ORDERS_MAX_AGE } from "@/lib/guest-orders";

export const dynamic = "force-dynamic";

function fail(status: number, body: CreateOrderError) {
  return NextResponse.json(body, { status });
}

/**
 * POST /api/orders
 * body: { items: [{ productId, qty }], address?: AddressInput, addressId?: string,
 *         paymentMethod: "TRANSFER" | "COD", saveAddress?: boolean, email?: string }
 * 201 { orderNo } | 400 { error, fieldErrors } | 401 | 409 { error, productId, available } | 503 | 500
 */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail(400, { code: "VALIDATION", error: "รูปแบบข้อมูลไม่ถูกต้อง" });
  }

  const parsed = createOrderSchema.safeParse(json);
  if (!parsed.success) {
    return fail(400, {
      code: "VALIDATION",
      error: "กรุณาตรวจสอบข้อมูลให้ถูกต้อง",
      fieldErrors: issuesToFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;

  const session = await getSession();
  let userId: string | null = session?.user?.id ?? null;
  if (userId) {
    // JWT can outlive the user row (e.g. after a re-seed) — avoid an FK error
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) {
      if (input.addressId) {
        return fail(401, { code: "UNAUTHORIZED", error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
      }
      userId = null;
    }
  }

  if (input.addressId && !userId) {
    return fail(401, { code: "UNAUTHORIZED", error: "กรุณาเข้าสู่ระบบเพื่อใช้ที่อยู่ที่บันทึกไว้" });
  }
  if (!userId && !input.email) {
    return fail(400, {
      code: "VALIDATION",
      error: "กรุณากรอกอีเมลสำหรับติดต่อ",
      fieldErrors: { email: ["กรุณากรอกอีเมลสำหรับติดต่อ"] },
    });
  }

  try {
    const result = await placeOrder(input, userId);

    revalidatePath("/", "layout"); // product listings, detail pages, home best sellers, /admin
    const res = NextResponse.json<CreateOrderSuccess>({ orderNo: result.orderNo }, { status: 201 });
    if (!userId) {
      res.cookies.set(GUEST_ORDERS_COOKIE, addGuestOrder(req.cookies.get(GUEST_ORDERS_COOKIE)?.value, result.orderNo), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: GUEST_ORDERS_MAX_AGE,
      });
    }
    return res;
  } catch (e) {
    if (e instanceof OrderError) {
      if (e.code === "ADDRESS_NOT_FOUND") {
        return fail(400, { code: e.code, error: e.message, fieldErrors: { addressId: [e.message] } });
      }
      return fail(e.status, { code: e.code, error: e.message, ...e.extra });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2028" || e.code === "P2034")) {
      return fail(503, { code: "BUSY", error: "ระบบกำลังมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้ง" });
    }
    console.error("[POST /api/orders]", e);
    return fail(500, { code: "SERVER", error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
}
