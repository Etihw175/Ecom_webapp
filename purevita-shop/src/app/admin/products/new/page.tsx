import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getCategoryOptions } from "@/lib/admin/products";
import { EMPTY_PRODUCT_VALUES, ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "เพิ่มสินค้า" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategoryOptions();
  return (
    <div className="grid gap-4">
      <div>
        <Link
          href="/admin/products"
          className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-blue"
        >
          <ArrowLeft className="size-4" /> กลับไปรายการสินค้า
        </Link>
        <h1 className="text-2xl font-semibold text-brand-navy">เพิ่มสินค้าใหม่</h1>
      </div>
      <ProductForm productId={null} initial={EMPTY_PRODUCT_VALUES} categories={categories} />
    </div>
  );
}
