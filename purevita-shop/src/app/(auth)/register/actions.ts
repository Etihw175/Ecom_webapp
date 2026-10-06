"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, type ActionState } from "@/lib/validations/auth";

export async function registerUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, message: "อีเมลนี้ถูกใช้งานแล้ว", fieldErrors: { email: ["อีเมลนี้ถูกใช้งานแล้ว"] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role: "CUSTOMER" } });
  return { ok: true, message: "สมัครสมาชิกสำเร็จ" };
}
