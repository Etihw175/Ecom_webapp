import { z } from "zod";

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2, "กรุณากรอกชื่อผู้รับ").max(100, "ชื่อผู้รับยาวเกินไป"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^0\d{9}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0")),
  line: z.string().trim().min(5, "กรุณากรอกที่อยู่").max(300, "ที่อยู่ยาวเกินไป"),
  province: z.string().trim().min(2, "กรุณากรอกจังหวัด").max(100, "ชื่อจังหวัดยาวเกินไป"),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
});

export type AddressInput = z.infer<typeof addressSchema>;
