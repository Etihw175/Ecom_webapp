import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "@/lib/constants";
import { addressSchema } from "@/lib/validations/address";

/** Max qty per line accepted by POST /api/orders. */
export const MAX_LINE_QTY = 99;
export const MAX_ORDER_LINES = 50;

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1, "รหัสสินค้าไม่ถูกต้อง").max(100),
  qty: z
    .number({ error: "จำนวนสินค้าต้องเป็นตัวเลข" })
    .int("จำนวนสินค้าต้องเป็นจำนวนเต็ม")
    .min(1, "จำนวนสินค้าต้องอย่างน้อย 1 ชิ้น")
    .max(MAX_LINE_QTY, `สั่งได้สูงสุด ${MAX_LINE_QTY} ชิ้นต่อรายการ`),
});

/**
 * Body of POST /api/orders. Shared by the checkout form (client-side pre-check) and the
 * route handler. Unknown keys (e.g. a tampered `price`) are stripped — prices always come from the DB.
 * Exactly one of `address` (new address) or `addressId` (saved address, login required).
 */
export const createOrderSchema = z
  .object({
    items: z
      .array(orderItemSchema, { error: "ไม่มีสินค้าในคำสั่งซื้อ" })
      .min(1, "ตะกร้าสินค้าว่าง")
      .max(MAX_ORDER_LINES, `สั่งได้สูงสุด ${MAX_ORDER_LINES} รายการ`)
      .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
        message: "มีสินค้าซ้ำกันในคำสั่งซื้อ",
      }),
    address: addressSchema.optional(),
    addressId: z.string().trim().min(1).max(100).optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES, { error: "กรุณาเลือกวิธีชำระเงิน" }),
    saveAddress: z.boolean().optional(),
    /** contact email — required for guests (checked in the route handler) */
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("อีเมลไม่ถูกต้อง"))
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.address && !v.addressId) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "กรุณาระบุที่อยู่จัดส่ง" });
    }
    if (v.address && v.addressId) {
      ctx.addIssue({ code: "custom", path: ["addressId"], message: "ระบุที่อยู่ได้เพียงแบบเดียว" });
    }
  });

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderData = z.output<typeof createOrderSchema>;

/** Field errors keyed by dotted path, e.g. "address.phone", "items.0.qty", "email". */
export type FieldErrors = Record<string, string[]>;

export function issuesToFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Response shapes of POST /api/orders */
export type CreateOrderSuccess = { orderNo: string };
export type CreateOrderError = {
  error: string;
  fieldErrors?: FieldErrors;
  /** 409 only */
  productId?: string;
  productName?: string;
  available?: number;
  /** 400 when some products are gone/inactive */
  code?: "VALIDATION" | "OUT_OF_STOCK" | "UNAVAILABLE" | "UNAUTHORIZED" | "ADDRESS_NOT_FOUND" | "BUSY" | "SERVER";
};
