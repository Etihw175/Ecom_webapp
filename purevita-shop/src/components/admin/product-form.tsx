"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert, FormField } from "@/components/account/form-field";
import { slugify } from "@/lib/admin/product-schema";
import type { ActionState } from "@/lib/validations/auth";
import { saveProductAction } from "@/app/admin/products/actions";

export type ProductFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  description: string;
  stock: string;
  lowStockThreshold: string;
  isActive: boolean;
  imageUrl: string;
};

export const EMPTY_PRODUCT_VALUES: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  price: "",
  description: "",
  stock: "0",
  lowStockThreshold: "5",
  isActive: true,
  imageUrl: "",
};

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const nativeSelectClass =
  "h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.[0]) return null;
  return (
    <p id={`${id}-error`} className="text-sm text-destructive">
      {errors[0]}
    </p>
  );
}

export function ProductForm({
  productId,
  initial,
  categories,
}: {
  productId: string | null;
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProductAction.bind(null, productId),
    {},
  );
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "บันทึกแล้ว");
    else if (state.message) toast.error(state.message);
  }, [state]);

  // keep the checkbox in sync when isActive is toggled elsewhere on the page (soft delete / restore)
  useEffect(() => {
    setValues((prev) => ({ ...prev, isActive: initial.isActive }));
  }, [initial.isActive]);

  const fe = state.fieldErrors ?? {};
  const set = <K extends keyof ProductFormValues>(key: K, v: ProductFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const autoSlug = slugify(values.name);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setUploadError("รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ GIF");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setUploadError(data.error ?? "อัปโหลดรูปภาพไม่สำเร็จ");
        return;
      }
      setPreviewBroken(false);
      set("imageUrl", data.url);
      toast.success("อัปโหลดรูปภาพแล้ว อย่าลืมกดบันทึก");
    } catch {
      setUploadError("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">ข้อมูลสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              label="ชื่อสินค้า"
              name="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              required
              errors={fe.name}
            />
            <div className="grid gap-1.5">
              <FormField
                label="Slug (URL สินค้า)"
                name="slug"
                value={values.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder={autoSlug || "เว้นว่างเพื่อสร้างอัตโนมัติ"}
                errors={fe.slug}
                autoCapitalize="none"
                spellCheck={false}
              />
              {!values.slug && (
                <p className="text-xs text-muted-foreground">
                  {autoSlug
                    ? `เว้นว่างไว้ ระบบจะใช้ "${autoSlug}" (เติมตัวเลขต่อท้ายหากซ้ำ)`
                    : "ชื่อภาษาไทยจะได้ slug อัตโนมัติรูปแบบ product-xxxxxx · ใช้ได้เฉพาะ a-z, 0-9 และ -"}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">หมวดหมู่</Label>
              <select
                id="categoryId"
                name="categoryId"
                value={values.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className={nativeSelectClass}
                aria-invalid={fe.categoryId ? true : undefined}
                aria-describedby={fe.categoryId ? "categoryId-error" : undefined}
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError id="categoryId" errors={fe.categoryId} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">รายละเอียดสินค้า</Label>
              <Textarea
                id="description"
                name="description"
                rows={8}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                aria-invalid={fe.description ? true : undefined}
                aria-describedby={fe.description ? "description-error" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                เคล็ดลับ: ขึ้นบรรทัด &quot;สรรพคุณ:&quot; แล้วตามด้วยรายการ &quot;- ...&quot; เพื่อแสดงเป็นหัวข้อย่อยในหน้าสินค้า
              </p>
              <FieldError id="description" errors={fe.description} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">ราคาและสต็อก</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="ราคา (บาท)"
              name="price"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              errors={fe.price}
            />
            <FormField
              label="จำนวนสต็อก"
              name="stock"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.stock}
              onChange={(e) => set("stock", e.target.value)}
              errors={fe.stock}
            />
            <FormField
              label="เกณฑ์แจ้งเตือนสต็อกต่ำ"
              name="lowStockThreshold"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
              errors={fe.lowStockThreshold}
            />
            <p className="text-xs text-muted-foreground sm:col-span-3">
              ระบบจะแจ้งเตือน &quot;สต็อกต่ำ&quot; เมื่อจำนวนสต็อกน้อยกว่าหรือเท่ากับเกณฑ์นี้
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">รูปภาพสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-brand-sky/10">
              {values.imageUrl && !previewBroken ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview must work for any pasted URL
                <img
                  src={values.imageUrl}
                  alt="ตัวอย่างรูปสินค้า"
                  className="size-full object-contain"
                  onError={() => setPreviewBroken(true)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="size-10 text-brand-sky" />
                  {values.imageUrl ? "ไม่สามารถแสดงรูปจาก URL นี้" : "ยังไม่มีรูปภาพ"}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="size-6 animate-spin text-brand-blue" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {uploading ? "กำลังอัปโหลด…" : "อัปโหลดรูปภาพ"}
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP หรือ GIF ขนาดไม่เกิน 2MB</p>
            {uploadError && (
              <p role="alert" className="text-sm text-destructive">
                {uploadError}
              </p>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="imageUrl">หรือวาง URL รูปภาพ</Label>
              <div className="flex gap-1">
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  value={values.imageUrl}
                  onChange={(e) => {
                    setPreviewBroken(false);
                    set("imageUrl", e.target.value);
                  }}
                  placeholder="https://… หรือ /uploads/…"
                  aria-invalid={fe.imageUrl ? true : undefined}
                  aria-describedby={fe.imageUrl ? "imageUrl-error" : undefined}
                />
                {values.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="ล้างรูปภาพ"
                    onClick={() => set("imageUrl", "")}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <FieldError id="imageUrl" errors={fe.imageUrl} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">การแสดงผล</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="isActive"
                checked={values.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="mt-0.5 size-4 accent-brand-blue"
              />
              <span>
                <span className="font-medium">เปิดขาย</span>
                <span className="block text-xs text-muted-foreground">
                  ปิดไว้เพื่อซ่อนสินค้าจากหน้าร้าน (คำสั่งซื้อเดิมไม่ได้รับผลกระทบ)
                </span>
              </span>
            </label>
            <FormAlert message={state.message} ok={state.ok} />
            <Button type="submit" disabled={pending || uploading} size="lg">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {productId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
