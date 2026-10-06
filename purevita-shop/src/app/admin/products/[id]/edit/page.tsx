import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getCategoryOptions, getProductForEdit } from "@/lib/admin/products";
import { buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/account/form-field";
import { ProductForm } from "@/components/admin/product-form";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";

export const metadata: Metadata = { title: "แก้ไขสินค้า" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const [product, categories] = await Promise.all([getProductForEdit(id), getCategoryOptions()]);
  if (!product) notFound();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-blue"
          >
            <ArrowLeft className="size-4" /> กลับไปรายการสินค้า
          </Link>
          <h1 className="text-2xl font-semibold text-brand-navy">แก้ไขสินค้า</h1>
          <p className="text-sm text-muted-foreground">{product.name}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {product.isActive && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              <ExternalLink className="size-4" /> ดูหน้าร้าน
            </Link>
          )}
          <ProductActiveToggle productId={product.id} productName={product.name} isActive={product.isActive} />
        </div>
      </div>
      {sp.created === "1" && <FormAlert ok message="เพิ่มสินค้าเรียบร้อยแล้ว" />}
      {!product.isActive && (
        <FormAlert message="สินค้านี้ปิดการขายอยู่ (ไม่แสดงในหน้าร้าน)" />
      )}
      <ProductForm
        productId={product.id}
        categories={categories}
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          price: String(product.price),
          description: product.description,
          stock: String(product.stock),
          lowStockThreshold: String(product.lowStockThreshold),
          isActive: product.isActive,
          imageUrl: product.imageUrl,
        }}
      />
    </div>
  );
}
