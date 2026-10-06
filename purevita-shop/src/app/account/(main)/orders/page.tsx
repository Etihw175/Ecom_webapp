import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatTHB } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

export const metadata: Metadata = { title: "คำสั่งซื้อของฉัน" };

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      createdAt: true,
      total: true,
      status: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-brand-navy">คำสั่งซื้อของฉัน</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="size-12 text-brand-sky" />
            <p className="font-medium text-brand-navy">ยังไม่มีคำสั่งซื้อ</p>
            <p className="text-sm text-muted-foreground">เลือกซื้อสินค้าเพื่อสุขภาพที่ดีของคุณได้เลย</p>
            <Link href="/products" className={buttonVariants()}>
              เลือกซื้อสินค้า
            </Link>
          </div>
        ) : (
          <>
            {/* mobile: cards */}
            <ul className="grid gap-3 md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/account/orders/${o.orderNo}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-brand-sky/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-brand-navy">{o.orderNo}</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatDateTime(o.createdAt)}</span>
                        <span className="font-semibold text-foreground">{formatTHB(o.total)}</span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
            {/* desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่คำสั่งซื้อ</TableHead>
                    <TableHead>วันที่สั่งซื้อ</TableHead>
                    <TableHead className="text-right">จำนวนรายการ</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-brand-navy">{o.orderNo}</TableCell>
                      <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                      <TableCell className="text-right">{o._count.items}</TableCell>
                      <TableCell className="text-right font-semibold">{formatTHB(o.total)}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/account/orders/${o.orderNo}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          ดูรายละเอียด
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
