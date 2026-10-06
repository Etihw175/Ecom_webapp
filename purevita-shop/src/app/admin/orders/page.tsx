import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAdminOrders, parseOrderFilters, type AdminOrderFilters } from "@/lib/admin/orders";
import { getPaymentLabel, getStatusMeta, ORDER_STATUS_VALUES } from "@/lib/constants";
import { formatDateTime, formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

export const metadata: Metadata = { title: "คำสั่งซื้อ" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function pageHref(f: AdminOrderFilters, page: number) {
  const params = new URLSearchParams();
  if (f.status) params.set("status", f.status);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdmin();
  const filters = parseOrderFilters(await searchParams);
  const { orders, total, page, pageCount } = await listAdminOrders(filters);
  const hasFilter = !!(filters.status || filters.from || filters.to);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">คำสั่งซื้อ</h1>
        <p className="text-sm text-muted-foreground">
          พบ {total.toLocaleString("th-TH")} รายการ{pageCount > 1 && ` · หน้า ${page}/${pageCount}`}
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="f-status">สถานะ</Label>
              <select
                id="f-status"
                name="status"
                defaultValue={filters.status ?? ""}
                className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">ทุกสถานะ</option>
                {ORDER_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {getStatusMeta(s).label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-from">ตั้งแต่วันที่</Label>
              <Input id="f-from" type="date" name="from" defaultValue={filters.from ?? ""} className="w-40 bg-white" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-to">ถึงวันที่</Label>
              <Input id="f-to" type="date" name="to" defaultValue={filters.to ?? ""} className="w-40 bg-white" />
            </div>
            <Button type="submit" variant="outline">
              กรอง
            </Button>
            {hasFilter && (
              <Link href="/admin/orders" className={buttonVariants({ variant: "ghost" })}>
                ล้างตัวกรอง
              </Link>
            )}
          </form>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Inbox className="size-10 text-brand-sky" />
              <p className="font-medium text-brand-navy">ไม่พบคำสั่งซื้อ</p>
              {hasFilter && <p className="text-sm text-muted-foreground">ลองเปลี่ยนตัวกรองสถานะหรือช่วงวันที่</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่คำสั่งซื้อ</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead>การชำระเงิน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-navy hover:text-brand-blue">
                          {o.orderNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {o.user ? (
                          <>
                            <span className="block">{o.user.name}</span>
                            <span className="block text-xs text-muted-foreground">{o.user.email}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">ผู้เยี่ยมชม</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatTHB(o.total)}</TableCell>
                      <TableCell>{getPaymentLabel(o.paymentMethod)}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/orders/${o.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          จัดการ
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pageCount > 1 && (
            <nav aria-label="เปลี่ยนหน้า" className="flex items-center justify-center gap-2">
              <Link
                href={pageHref(filters, page - 1)}
                aria-disabled={page <= 1}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
              >
                <ChevronLeft className="size-4" /> ก่อนหน้า
              </Link>
              <span className="text-sm text-muted-foreground">
                หน้า {page} / {pageCount}
              </span>
              <Link
                href={pageHref(filters, page + 1)}
                aria-disabled={page >= pageCount}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page >= pageCount && "pointer-events-none opacity-50",
                )}
              >
                ถัดไป <ChevronRight className="size-4" />
              </Link>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
