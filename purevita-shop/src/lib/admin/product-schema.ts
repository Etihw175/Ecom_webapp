import { z } from "zod";

/** Client-safe product form schema + helpers (no prisma import). */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** ASCII-safe slug from a name; returns "" when nothing ASCII is left (e.g. a pure Thai name). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** "/uploads/x.png", "/products/x.svg" or an absolute http(s) URL */
export function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/")) {
    return !value.startsWith("//") && !value.includes("..") && /^\/[A-Za-z0-9/._-]+$/.test(value);
  }
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const emptyToUndefined = (v: unknown) => {
  if (typeof v === "string") {
    const t = v.trim().replace(/,/g, "");
    return t === "" ? undefined : Number(t);
  }
  return v;
};

function intField(label: string, min: number, max: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .number({
        error: (iss) => (iss.input === undefined ? `กรุณากรอก${label}` : `${label}ต้องเป็นตัวเลข`),
      })
      .int(`${label}ต้องเป็นจำนวนเต็ม`)
      .min(min, `${label}ต้องไม่น้อยกว่า ${min.toLocaleString("th-TH")}`)
      .max(max, `${label}ต้องไม่เกิน ${max.toLocaleString("th-TH")}`),
  );
}

export const productFormSchema = z.object({
  name: z
    .string({ error: "กรุณากรอกชื่อสินค้า" })
    .trim()
    .min(2, "ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(150, "ชื่อสินค้ายาวเกินไป (ไม่เกิน 150 ตัวอักษร)"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, "slug ยาวเกินไป (ไม่เกิน 80 ตัวอักษร)")
    .refine((s) => s === "" || SLUG_RE.test(s), "slug ใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง (-) เช่น vitamin-c-1000")
    .optional()
    .default(""),
  categoryId: z.string({ error: "กรุณาเลือกหมวดหมู่" }).trim().min(1, "กรุณาเลือกหมวดหมู่"),
  price: intField("ราคา", 1, 1_000_000),
  description: z
    .string({ error: "กรุณากรอกรายละเอียดสินค้า" })
    .trim()
    .min(10, "รายละเอียดสินค้าต้องมีอย่างน้อย 10 ตัวอักษร")
    .max(5000, "รายละเอียดสินค้ายาวเกินไป"),
  stock: intField("จำนวนสต็อก", 0, 1_000_000),
  lowStockThreshold: intField("เกณฑ์สต็อกต่ำ", 0, 100_000),
  isActive: z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean()),
  imageUrl: z
    .string({ error: "กรุณาอัปโหลดรูปภาพหรือใส่ URL รูปภาพ" })
    .trim()
    .min(1, "กรุณาอัปโหลดรูปภาพหรือใส่ URL รูปภาพ")
    .max(500, "URL รูปภาพยาวเกินไป")
    .refine(isValidImageUrl, "URL รูปภาพไม่ถูกต้อง (ต้องขึ้นต้นด้วย https:// หรือ /)"),
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductInput = z.output<typeof productFormSchema>;

export const PRODUCT_STATUS_FILTERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "active", label: "เปิดขาย" },
  { value: "inactive", label: "ปิดขาย" },
] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number]["value"];

export function parseProductStatusFilter(v: unknown): ProductStatusFilter {
  return v === "active" || v === "inactive" ? v : "all";
}
