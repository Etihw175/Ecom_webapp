"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validations/address";
import type { ActionState } from "@/lib/validations/auth";

function revalidate() {
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

/** Create (no id) or update (id) an address. */
export async function saveAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account/addresses");
  const id = formData.get("id");
  const makeDefault = formData.get("isDefault") === "on";
  const parsed = addressSchema.safeParse({
    recipientName: formData.get("recipientName") ?? "",
    phone: formData.get("phone") ?? "",
    line: formData.get("line") ?? "",
    province: formData.get("province") ?? "",
    postalCode: formData.get("postalCode") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  if (typeof id === "string" && id) {
    const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { ok: false, message: "ไม่พบที่อยู่นี้" };
    await prisma.$transaction(async (tx) => {
      if (makeDefault && !existing.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      await tx.address.update({
        where: { id },
        data: { ...parsed.data, isDefault: existing.isDefault || makeDefault },
      });
    });
    revalidate();
    return { ok: true, message: "บันทึกที่อยู่เรียบร้อยแล้ว" };
  }

  await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    const isDefault = count === 0 || makeDefault;
    if (isDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    await tx.address.create({ data: { ...parsed.data, userId: user.id, isDefault } });
  });
  revalidate();
  return { ok: true, message: "เพิ่มที่อยู่เรียบร้อยแล้ว" };
}

export async function deleteAddress(id: string): Promise<ActionState> {
  const user = await requireUser("/account/addresses");
  const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false, message: "ไม่พบที่อยู่นี้" };

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      // promote the newest remaining address to default
      const next = await tx.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  revalidate();
  return { ok: true, message: "ลบที่อยู่เรียบร้อยแล้ว" };
}

export async function setDefaultAddress(id: string): Promise<ActionState> {
  const user = await requireUser("/account/addresses");
  const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false, message: "ไม่พบที่อยู่นี้" };

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidate();
  return { ok: true, message: "ตั้งเป็นที่อยู่หลักแล้ว" };
}
