"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createProduct, parseProductForm, setProductActive, updateProduct } from "@/lib/admin/products";
import type { ActionState } from "@/lib/validations/auth";

function revalidateProductPaths(slugs: (string | undefined)[]) {
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/products");
  revalidatePath("/");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/products/${slug}`);
}

/** Create (productId = null) or update a product. Bind the id: saveProductAction.bind(null, id). */
export async function saveProductAction(
  productId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return { ok: false, message: "กรุณาตรวจสอบข้อมูลที่กรอก", fieldErrors: parsed.fieldErrors };
  }

  if (!productId) {
    const res = await createProduct(parsed.data);
    if (!res.ok) return { ok: false, message: res.message ?? "กรุณาตรวจสอบข้อมูลที่กรอก", fieldErrors: res.fieldErrors };
    revalidateProductPaths([res.product.slug]);
    redirect(`/admin/products/${res.product.id}/edit?created=1`);
  }

  const res = await updateProduct(productId, parsed.data);
  if (!res.ok) return { ok: false, message: res.message ?? "กรุณาตรวจสอบข้อมูลที่กรอก", fieldErrors: res.fieldErrors };
  revalidateProductPaths([res.product.slug, res.previousSlug]);
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อยแล้ว" };
}

/** Soft delete (isActive=false) or restore (isActive=true). */
export async function setProductActiveAction(productId: string, isActive: boolean): Promise<ActionState> {
  await requireAdmin();
  const res = await setProductActive(productId, isActive);
  if (!res.ok) return { ok: false, message: res.message };
  revalidateProductPaths([res.product.slug]);
  revalidatePath(`/admin/products/${productId}/edit`);
  return {
    ok: true,
    message: isActive ? "เปิดขายสินค้าอีกครั้งแล้ว" : "ปิดการขายสินค้าแล้ว (ซ่อนจากหน้าร้าน)",
  };
}
