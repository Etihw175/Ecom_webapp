export const FREE_SHIPPING_MIN = 800;
export const SHIPPING_FEE = 50;

export function calcShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : SHIPPING_FEE;
}

export const ROLES = ["CUSTOMER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

/** Thai label + Tailwind badge classes for each order status */
export const ORDER_STATUSES: Record<OrderStatus, { label: string; badgeClass: string }> = {
  PENDING: { label: "รอชำระเงิน", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  PAID: { label: "ชำระเงินแล้ว", badgeClass: "bg-sky-100 text-sky-800 border-sky-200" },
  PACKING: { label: "กำลังแพ็กสินค้า", badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  SHIPPED: { label: "จัดส่งแล้ว", badgeClass: "bg-blue-100 text-blue-800 border-blue-200" },
  DELIVERED: { label: "ได้รับสินค้าแล้ว", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  CANCELLED: { label: "ยกเลิก", badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

export const PAYMENT_METHOD_VALUES = ["TRANSFER", "COD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string; description: string }> = {
  TRANSFER: { label: "โอนเงินผ่านธนาคาร", description: "โอนเงินเข้าบัญชีร้าน (จำลอง)" },
  COD: { label: "เก็บเงินปลายทาง", description: "ชำระเงินสดเมื่อได้รับสินค้า" },
};

export function getStatusMeta(status: string) {
  return ORDER_STATUSES[status as OrderStatus] ?? { label: status, badgeClass: "" };
}

export function getPaymentLabel(method: string) {
  return PAYMENT_METHODS[method as PaymentMethod]?.label ?? method;
}

/** Static nav categories (must match seeded Category.slug values) */
export const NAV_CATEGORIES = [
  { name: "วิตามิน", slug: "vitamins" },
  { name: "อาหารเสริม", slug: "supplements" },
  { name: "ถั่งเช่า", slug: "cordyceps" },
  { name: "เครื่องกรองน้ำ", slug: "water-filters" },
] as const;

export const SITE_NAME = "PureVita · เพียววิต้า";
