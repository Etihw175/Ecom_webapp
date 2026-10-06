import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Inbox, Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/admin/dashboard";
import { formatDate, formatDateTime, formatTHB } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { AdminThumb } from "@/components/admin/admin-thumb";
import { RevenueChart } from "@/components/admin/revenue-chart";

export const metadata: Metadata = { title: "แดชบอร์ด" };
// Always render from the live DB: a new checkout or a stock edit must show immediately.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-brand-navy tabular-nums" data-stat={title}>
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${accent}`}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const d = await getDashboardData();
  const n = (v: number) => v.toLocaleString("th-TH");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">แดชบอร์ด</h1>
          <p className="text-sm text-muted-foreground">
            ข้อมูล ณ วันที่ {formatDate(new Date())} · ยอดขายไม่รวมคำสั่งซื้อที่ยกเลิก
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="ยอดขายวันนี้"
          value={formatTHB(d.sales.today.revenue)}
          sub={`${n(d.sales.today.orders)} คำสั่งซื้อ`}
          icon={Wallet}
          accent="bg-brand-blue/10 text-brand-blue"
        />
        <StatCard
          title="ยอดขาย 7 วัน"
          value={formatTHB(d.sales.last7.revenue)}
          sub={`${n(d.sales.last7.orders)} คำสั่งซื้อ`}
          icon={TrendingUp}
          accent="bg-brand-green/10 text-brand-green"
        />
        <StatCard
          title="ยอดขายเดือนนี้"
          value={formatTHB(d.sales.month.revenue)}
          sub={`${n(d.sales.month.orders)} คำสั่งซื้อ`}
          icon={CalendarDays}
          accent="bg-brand-sky/25 text-brand-navy"
        />
        <StatCard
          title="จำนวนออเดอร์เดือนนี้"
          value={n(d.monthOrderCount)}
          sub={
            <Link href="/admin/orders?status=PENDING" className="text-brand-orange hover:underline">
              <Clock className="mr-1 inline size-3" />
              รอดำเนินการ {n(d.pendingCount)} รายการ
            </Link>
          }
          icon={ShoppingBag}
          accent="bg-brand-orange/10 text-brand-orange"
        />
        <StatCard
          title="ยอดเฉลี่ยต่อออเดอร์"
          value={formatTHB(d.avgOrderValue)}
          sub="เฉลี่ยของเดือนนี้"
          icon={Receipt}
          accent="bg-brand-navy/10 text-brand-navy"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-brand-navy">ยอดขาย 14 วันล่าสุด</CardTitle>
            <CardDescription>
              รวม {formatTHB(d.revenueSeries.reduce((s, p) => s + p.revenue, 0))} · วางเมาส์บนแท่งเพื่อดูรายละเอียด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={d.revenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-brand-navy">สินค้าขายดี 5 อันดับ</CardTitle>
            <CardDescription>ตามจำนวนชิ้นที่ขายได้ (ไม่รวมที่ยกเลิก)</CardDescription>
          </CardHeader>
          <CardContent>
            {d.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มียอดขาย</p>
            ) : (
              <ol className="grid gap-3" data-testid="top-products">
                {d.topProducts.map((p, i) => (
                  <li key={p.productId} className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-sky/25 text-xs font-semibold text-brand-navy">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products/${p.productId}/edit`}
                        className="line-clamp-1 text-sm font-medium text-brand-navy hover:text-brand-blue"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{n(p.qty)} ชิ้น</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatTHB(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-navy">
              <AlertTriangle className="size-4 text-brand-orange" />
              สินค้าใกล้หมด
            </CardTitle>
            <CardDescription>สต็อกน้อยกว่าหรือเท่ากับจุดแจ้งเตือน</CardDescription>
          </CardHeader>
          <CardContent>
            {d.lowStock.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center" data-testid="low-stock-empty">
                <CheckCircle2 className="size-10 text-brand-green" />
                <p className="font-medium text-brand-navy">สต็อกเพียงพอทุกรายการ</p>
              </div>
            ) : (
              <ul className="grid gap-2" data-testid="low-stock">
                {d.lowStock.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      data-low-stock-id={p.id}
                      className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50/60 p-2 transition-colors hover:bg-amber-100/70"
                    >
                      <AdminThumb src={p.imageUrl} alt={p.name} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-brand-navy">{p.name}</p>
                        <p className="text-xs text-muted-foreground">จุดแจ้งเตือน {n(p.lowStockThreshold)} ชิ้น</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.stock === 0 ? "หมด" : `เหลือ ${n(p.stock)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-brand-navy">คำสั่งซื้อล่าสุด</CardTitle>
            <CardDescription>10 รายการล่าสุด (ทุกสถานะ)</CardDescription>
          </CardHeader>
          <CardContent>
            {d.latestOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Inbox className="size-10 text-brand-sky" />
                <p className="font-medium text-brand-navy">ยังไม่มีคำสั่งซื้อ</p>
              </div>
            ) : (
              <>
                <div className="-mx-4 overflow-x-auto px-4">
                  <Table data-testid="latest-orders">
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลขที่</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>วันที่</TableHead>
                        <TableHead className="text-right">ยอดรวม</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.latestOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>
                            <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-navy hover:text-brand-blue">
                              {o.orderNo}
                            </Link>
                          </TableCell>
                          <TableCell>{o.user?.name ?? <span className="text-muted-foreground">ผู้เยี่ยมชม</span>}</TableCell>
                          <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatTHB(o.total)}</TableCell>
                          <TableCell>
                            <OrderStatusBadge status={o.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 text-right">
                  <Link href="/admin/orders" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    ดูคำสั่งซื้อทั้งหมด
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
