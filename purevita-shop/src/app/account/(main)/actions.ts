"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { changePasswordSchema, profileSchema, type ActionState } from "@/lib/validations/auth";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { ok: true, message: "บันทึกชื่อเรียบร้อยแล้ว" };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { ok: false, message: "ไม่พบบัญชีผู้ใช้" };

  const ok = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!ok) {
    return { ok: false, fieldErrors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] } };
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" };
}
