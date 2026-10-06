import { prisma } from "@/lib/prisma";
import { bangkokDayStart } from "@/lib/admin/orders";

/** Thailand has no DST: Asia/Bangkok is always UTC+7. */
const BKK_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 24 * 3600_000;
const NOT_CANCELLED = { status: { not: "CANCELLED" } } as const;

/** YYYY-MM-DD of `d` in Asia/Bangkok */
export function bangkokDayKey(d: Date): string {
  return new Date(d.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD shifted by `delta` days (pure calendar math, no timezone involved) */
export function shiftDayKey(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  return new Date(d.getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

/** Boundaries (UTC Date) used by the dashboard, all computed in Asia/Bangkok */
export function getDashboardRanges(now = new Date()) {
  const today = bangkokDayKey(now);
  return {
    today,
    todayStart: bangkokDayStart(today),
    last7Start: bangkokDayStart(shiftDayKey(today, -6)), // today + previous 6 days
    monthStart: bangkokDayStart(`${today.slice(0, 7)}-01`),
    chartStartDay: shiftDayKey(today, -13), // 14 days incl. today
  };
}

export type RevenuePoint = { day: string; label: string; revenue: number; orders: number };

async function sumRevenue(gte: Date) {
  const agg = await prisma.order.aggregate({
    where: { ...NOT_CANCELLED, createdAt: { gte } },
    _sum: { total: true },
    _count: { _all: true },
  });
  return { revenue: agg._sum.total ?? 0, orders: agg._count._all };
}

/** Last 14 Bangkok days, zero-filled, oldest first. Excludes CANCELLED orders. */
export async function getRevenueSeries(now = new Date()): Promise<RevenuePoint[]> {
  const { today, chartStartDay } = getDashboardRanges(now);
  const orders = await prisma.order.findMany({
    where: { ...NOT_CANCELLED, createdAt: { gte: bangkokDayStart(chartStartDay) } },
    select: { createdAt: true, total: true },
  });
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const key = bangkokDayKey(o.createdAt);
    const cur = byDay.get(key) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    byDay.set(key, cur);
  }
  const labelFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
  const points: RevenuePoint[] = [];
  for (let i = 0; i < 14; i++) {
    const day = shiftDayKey(chartStartDay, i);
    if (day > today) break;
    const v = byDay.get(day) ?? { revenue: 0, orders: 0 };
    points.push({ day, label: labelFmt.format(new Date(`${day}T00:00:00Z`)), ...v });
  }
  return points;
}

export type TopProduct = { productId: string; name: string; qty: number; revenue: number };

/** Top N products by quantity sold (all time, excluding CANCELLED orders). Revenue = Σ qty × priceSnapshot. */
export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: NOT_CANCELLED },
    select: { productId: true, qty: true, priceSnapshot: true, nameSnapshot: true, product: { select: { name: true } } },
  });
  const map = new Map<string, TopProduct>();
  for (const it of items) {
    const cur = map.get(it.productId) ?? {
      productId: it.productId,
      name: it.product?.name ?? it.nameSnapshot,
      qty: 0,
      revenue: 0,
    };
    cur.qty += it.qty;
    cur.revenue += it.qty * it.priceSnapshot;
    map.set(it.productId, cur);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
}

/** Active products whose stock <= their own lowStockThreshold (lowest stock first). */
export function getLowStockProducts() {
  return prisma.product.findMany({
    where: { isActive: true, stock: { lte: prisma.product.fields.lowStockThreshold } },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, imageUrl: true, stock: true, lowStockThreshold: true },
  });
}

export function getLatestOrders(limit = 10) {
  return prisma.order.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      orderNo: true,
      createdAt: true,
      total: true,
      status: true,
      user: { select: { name: true } },
    },
  });
}

export async function getDashboardData(now = new Date()) {
  const r = getDashboardRanges(now);
  const [today, last7, month, pendingCount, revenueSeries, topProducts, lowStock, latestOrders] = await Promise.all([
    sumRevenue(r.todayStart),
    sumRevenue(r.last7Start),
    sumRevenue(r.monthStart),
    prisma.order.count({ where: { status: "PENDING" } }),
    getRevenueSeries(now),
    getTopProducts(5),
    getLowStockProducts(),
    getLatestOrders(10),
  ]);
  return {
    today: r.today,
    sales: { today, last7, month },
    monthOrderCount: month.orders,
    pendingCount,
    avgOrderValue: month.orders > 0 ? Math.round(month.revenue / month.orders) : 0,
    revenueSeries,
    topProducts,
    lowStock,
    latestOrders,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
