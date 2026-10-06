import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, PackageSearch, Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAdminProducts } from "@/lib/admin/products";
import { PRODUCT_STATUS_FILTERS, parseProductStatusFilter } from "@/lib/admin/product-schema";
import { formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminThumb } from "@/components/admin/admin-thumb";

export const metadata: Metadata = { title: "สินค้า" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const selectClass =
  "h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AdminProductsPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const status = parseProductStatusFilter(sp.status);
  const products = await listAdminProducts({ q, status });
  const lowCount = products.filter((p) => p.isActive && p.stock <= p.lowStockThreshold).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">สินค้า</h1>
          <p className="text-sm text-muted-foreground">
            ทั้งหมด {products.length} รายการ
            {lowCount > 0 && <span className="text-amber-700"> · สต็อกต่ำ {lowCount} รายการ</span>}
          </p>
        </div>
        <Link href="/admin/products/new" className={buttonVariants()}>
          <Plus className="size-4" /> เพิ่มสินค้า
        </Link>
      </div>

      <Card>
        <CardContent className="grid gap-4">
          <form method="get" className="flex flex-wrap items-end gap-2" role="search">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="ค้นหาชื่อสินค้า" aria-label="ค้นหาชื่อสินค้า" className="bg-white pl-8" />
            </div>
            <select name="status" defaultValue={status} aria-label="สถานะการขาย" className={selectClass}>
              {PRODUCT_STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              ค้นหา
            </Button>
            {(q || status !== "all") && (
              <Link href="/admin/products" className={buttonVariants({ variant: "ghost" })}>
                ล้างตัวกรอง
              </Link>
            )}
          </form>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <PackageSearch className="size-10 text-brand-sky" />
              <p className="font-medium text-brand-navy">ไม่พบสินค้า</p>
              <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">รูป</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead className="text-right">ราคา</TableHead>
                    <TableHead className="text-right">สต็อก</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const low = p.stock <= p.lowStockThreshold;
                    return (
                      <TableRow
                        key={p.id}
                        data-low-stock={low ? "true" : undefined}
                        className={cn(low && p.isActive && "bg-amber-50 hover:bg-amber-100/70", !p.isActive && "opacity-60")}
                      >
                        <TableCell>
                          <AdminThumb src={p.imageUrl} alt={p.name} />
                        </TableCell>
                        <TableCell className="max-w-72">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="line-clamp-2 font-medium whitespace-normal text-brand-navy hover:text-brand-blue"
                          >
                            {p.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">/{p.slug}</span>
                        </TableCell>
                        <TableCell>{p.category.name}</TableCell>
                        <TableCell className="text-right">{formatTHB(p.price)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-medium",
                              p.stock === 0 ? "text-red-700" : low ? "text-amber-700" : "",
                            )}
                            title={`เกณฑ์สต็อกต่ำ: ${p.lowStockThreshold}`}
                          >
                            {low && <AlertTriangle className="size-3.5" aria-label="สต็อกต่ำ" />}
                            {p.stock.toLocaleString("th-TH")}
                          </span>
                          <span className="block text-xs text-muted-foreground">เกณฑ์ {p.lowStockThreshold}</span>
                        </TableCell>
                        <TableCell>
                          {p.isActive ? (
                            <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">
                              เปิดขาย
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">
                              ปิดขาย
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            แก้ไข
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
