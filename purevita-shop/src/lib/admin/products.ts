import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  productFormSchema,
  slugify,
  type ProductInput,
  type ProductStatusFilter,
} from "@/lib/admin/product-schema";
import type { FieldErrors } from "@/lib/validations/auth";

type ProductSummary = { id: string; slug: string; name: string; isActive: boolean };

export type ProductMutationResult =
  | { ok: true; product: ProductSummary; previousSlug?: string }
  | { ok: false; message?: string; fieldErrors?: FieldErrors };

/** Validate raw form values (FormData entries or a plain object). */
export function parseProductForm(raw: FormData | Record<string, unknown>) {
  const values = raw instanceof FormData ? Object.fromEntries(raw) : raw;
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: z.flattenError(parsed.error).fieldErrors as FieldErrors };
  }
  return { ok: true as const, data: parsed.data };
}

/** Admin products table: search by name (LIKE, ASCII case-insensitive), filter active/inactive. */
export function listAdminProducts({ q = "", status = "all" }: { q?: string; status?: ProductStatusFilter } = {}) {
  const where: Prisma.ProductWhereInput = {};
  const term = q.trim();
  if (term) where.name = { contains: term };
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  return prisma.product.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      imageUrl: true,
      stock: true,
      lowStockThreshold: true,
      isActive: true,
      category: { select: { name: true } },
    },
  });
}

export function getProductForEdit(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export function getCategoryOptions() {
  return prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

async function slugTaken(slug: string, excludeId?: string) {
  const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  return !!found && found.id !== excludeId;
}

/**
 * Unique ASCII slug from a name/base. Thai-only names slugify to "" → fallback "product-<6 hex>".
 * Appends -2, -3… on collision.
 */
export async function generateUniqueSlug(nameOrBase: string, excludeId?: string): Promise<string> {
  let base = slugify(nameOrBase);
  if (!base) base = `product-${randomBytes(3).toString("hex")}`;
  let candidate = base;
  let i = 2;
  while (await slugTaken(candidate, excludeId)) {
    candidate = i > 50 ? `${base}-${randomBytes(3).toString("hex")}` : `${base}-${i}`;
    i++;
  }
  return candidate;
}

async function resolveSlugAndCategory(
  input: ProductInput,
  excludeId?: string,
): Promise<{ ok: true; slug: string } | { ok: false; fieldErrors: FieldErrors }> {
  const fieldErrors: FieldErrors = {};
  const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
  if (!category) fieldErrors.categoryId = ["ไม่พบหมวดหมู่ที่เลือก"];

  let slug = input.slug;
  if (slug) {
    if (await slugTaken(slug, excludeId)) fieldErrors.slug = ["slug นี้ถูกใช้แล้ว กรุณาใช้ค่าอื่น"];
  } else {
    slug = await generateUniqueSlug(input.name, excludeId);
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, slug };
}

function isUniqueError(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

const SLUG_TAKEN: ProductMutationResult = { ok: false, fieldErrors: { slug: ["slug นี้ถูกใช้แล้ว กรุณาใช้ค่าอื่น"] } };
const resultSelect = { id: true, slug: true, name: true, isActive: true } as const;

function toData(input: ProductInput, slug: string) {
  return {
    name: input.name,
    slug,
    description: input.description,
    price: input.price,
    imageUrl: input.imageUrl,
    stock: input.stock,
    lowStockThreshold: input.lowStockThreshold,
    isActive: input.isActive,
    categoryId: input.categoryId,
  };
}

export async function createProduct(input: ProductInput): Promise<ProductMutationResult> {
  const resolved = await resolveSlugAndCategory(input);
  if (!resolved.ok) return resolved;
  try {
    const product = await prisma.product.create({ data: toData(input, resolved.slug), select: resultSelect });
    return { ok: true, product };
  } catch (e) {
    if (isUniqueError(e)) return SLUG_TAKEN;
    throw e;
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductMutationResult> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return { ok: false, message: "ไม่พบสินค้านี้" };
  const resolved = await resolveSlugAndCategory(input, id);
  if (!resolved.ok) return resolved;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: toData(input, resolved.slug),
      select: resultSelect,
    });
    return { ok: true, product, previousSlug: existing.slug };
  } catch (e) {
    if (isUniqueError(e)) return SLUG_TAKEN;
    throw e;
  }
}

/** Soft delete / restore: only flips isActive (past orders keep referencing the product). */
export async function setProductActive(id: string, isActive: boolean): Promise<ProductMutationResult> {
  try {
    const product = await prisma.product.update({ where: { id }, data: { isActive }, select: resultSelect });
    return { ok: true, product };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, message: "ไม่พบสินค้านี้" };
    }
    throw e;
  }
}

export function deactivateProduct(id: string) {
  return setProductActive(id, false);
}
