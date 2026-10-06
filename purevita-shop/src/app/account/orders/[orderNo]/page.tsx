import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseAddressSnapshot } from "@/lib/addresses";
import { formatDateTime, formatTHB } from "@/lib/format";
import { getPaymentLabel, getStatusMeta, ORDER_STATUS_VALUES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

type Params = { params: Promise<{ orderNo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `คำสั่งซื้อ ${decodeURIComponent(orderNo)}` };
}

const FLOW = ORDER_STATUS_VALUES.filter((s) => s !== "CANCELLED");

function StatusTimeline({ status, createdAt, updatedAt }: { status: string; createdAt: Date; updatedAt: Date }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <XCircle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">คำสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
          <p className="text-sm">เมื่อ {formatDateTime(updatedAt)}</p>
        </div>
      </div>
    );
  }
  const current = Math.max(0, FLOW.indexOf(status as (typeof FLOW)[number]));
  return (
    <ol className="grid gap-4 sm:grid-cols-5 sm:gap-2">
      {FLOW.map((s, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={s} className="relative flex items-center gap-3 sm:flex-col sm:text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute hidden h-0.5 sm:block sm:top-4 sm:right-1/2 sm:w-full",
                  i <= current ? "bg-brand-green" : "bg-muted",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done ? "border-brand-green bg-brand-green text-white" : "border-muted bg-white text-muted-foreground",
                isCurrent && "ring-4 ring-brand-green/20",
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <div>
              <p className={cn("text-sm", done ? "font-medium text-brand-navy" : "text-muted-foreground")}>
                {getStatusMeta(s).label}
              </p>
              {i === 0 && <p className="text-xs text-muted-foreground">{formatDateTime(createdAt)}</p>}
              {isCurrent && i > 0 && (
                <p className="text-xs text-muted-foreground">{formatDateTime(updatedAt)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function AccountOrderDetailPage({ params }: Params) {
  const { orderNo: raw } = await params;
  const orderNo = decodeURIComponent(raw);
  const user = await requireUser(`/account/orders/${raw}`);

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: {
      items: { include: { product: { select: { slug: true, imageUrl: true } } } },
    },
  });
  // only the owner may view
  if (!order || order.userId !== user.id) notFound();

  const address = parseAddressSnapshot(order.addressSnapshot);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/account/orders"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-blue"
          >
            <ArrowLeft className="size-4" /> กลับไปคำสั่งซื้อทั้งหมด
          </Link>
          <h2 className="text-xl font-semibold text-brand-navy">คำสั่งซื้อ {order.orderNo}</h2>
          <p className="text-sm text-muted-foreground">สั่งซื้อเมื่อ {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} className="h-7 px-3 text-sm" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">สถานะคำสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline status={order.status} createdAt={order.createdAt} updatedAt={order.updatedAt} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">รายการสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-brand-sky/10">
                    {item.product?.imageUrl && (
                      <Image src={item.product.imageUrl} alt={item.nameSnapshot} fill sizes="56px" className="object-contain" unoptimized />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.product?.slug ? (
                      <Link href={`/products/${item.product.slug}`} className="line-clamp-2 font-medium hover:text-brand-blue">
                        {item.nameSnapshot}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 font-medium">{item.nameSnapshot}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatTHB(item.priceSnapshot)} × {item.qty}
                    </p>
                  </div>
                  <p className="font-semibold">{formatTHB(item.priceSnapshot * item.qty)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-brand-navy">สรุปยอด</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดรวมสินค้า</span>
                <span>{formatTHB(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ค่าจัดส่ง</span>
                <span>{order.shippingFee === 0 ? "ส่งฟรี" : formatTHB(order.shippingFee)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-base font-semibold">
                <span>ยอดชำระทั้งหมด</span>
                <span className="text-brand-blue">{formatTHB(order.total)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">วิธีชำระเงิน</span>
                <span>{getPaymentLabel(order.paymentMethod)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-brand-navy">ที่อยู่จัดส่ง</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {address ? (
                <address className="grid gap-0.5 not-italic">
                  <span className="font-medium">{address.recipientName}</span>
                  <span>โทร {address.phone}</span>
                  <span>{address.line}</span>
                  <span>
                    {address.province} {address.postalCode}
                  </span>
                </address>
              ) : (
                <p className="text-muted-foreground">ไม่มีข้อมูลที่อยู่</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
