import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร")
  .max(100, "ชื่อยาวเกินไป");

export const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(100, "รหัสผ่านยาวเกินไป");

export const registerSchema = z
  .object({
    name: nameSchema,
    email: z.string().trim().toLowerCase().email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({ name: nameSchema });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "รหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
};
