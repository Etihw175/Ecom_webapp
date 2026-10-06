import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin/guard";
import { MAX_IMAGE_BYTES, saveProductImage } from "@/lib/admin/uploads";

export const runtime = "nodejs";

/** POST multipart/form-data { file } → { url: "/uploads/<uuid>.<ext>" }. ADMIN only. */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์อัปโหลดไฟล์" }, { status: 403 });
  }

  // cheap early reject before buffering the body
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์รูปภาพ" }, { status: 400 });
  }

  const res = await saveProductImage(file);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ url: res.url }, { status: 201 });
}
