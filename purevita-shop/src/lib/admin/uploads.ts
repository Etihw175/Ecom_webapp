import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

/** Allowed image MIME types → file extension */
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;
export type ImageMime = keyof typeof IMAGE_TYPES;

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Detect the real image type from magic bytes (don't trust the browser's Content-Type). */
export function sniffImageType(buf: Uint8Array): ImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  )
    return "image/png";
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  if (buf.length >= 6 && String.fromCharCode(...buf.subarray(0, 4)) === "GIF8") return "image/gif";
  return null;
}

export type SaveImageResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Validate (type by magic bytes + declared type, size <= 2MB) and save an uploaded image to
 * public/uploads/<uuid>.<ext>. Returns the public URL ("/uploads/<uuid>.<ext>").
 */
export async function saveProductImage(file: File): Promise<SaveImageResult> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    return { ok: false, error: "กรุณาเลือกไฟล์รูปภาพ" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB" };
  }
  if (file.type && !(file.type in IMAGE_TYPES)) {
    return { ok: false, error: "รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ GIF" };
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageType(buf);
  if (!mime) {
    return { ok: false, error: "ไฟล์ไม่ใช่รูปภาพที่รองรับ (JPG, PNG, WEBP, GIF)" };
  }
  const filename = `${randomUUID()}.${IMAGE_TYPES[mime]}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buf);
  return { ok: true, url: `/uploads/${filename}` };
}
