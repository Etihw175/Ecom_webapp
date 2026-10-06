import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminOrder } from "@/lib/admin/orders";
import { canCancel, getAllowedNextStatuses } from "@/lib/admin/order-flow";
import { parseAddressSnapshot } from "@/lib/addresses";
import { getPaymentLabel } from "@/lib/constants";
import { formatDateTime, formatTHB } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { AdminThumb } from "@/components/admin/admin-thumb";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { CancelOrderButton } from "@/components/admin/cancel-order-button";

export const metadata: Metadata = { title: "รายละเอียดคำสั่งซื้อ" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const address = parseAddressSnapshot(order.addressSnapshot);
  const allowed = getAllowedNextStatuses(order.status);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-blue"
          >
            <ArrowLeft className="size-4" /> กลับไปรายการคำสั่งซื้อ
          </Link>
          <h1 className="text-2xl font-semibold text-brand-navy">คำสั่งซื้อ {order.orderNo}</h1>
          <p className="text-sm text-muted-foreground">
            สั่งซื้อเมื่อ {formatDateTime(order.createdAt)} · อัปเดตล่าสุด {formatDateTime(order.updatedAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} className="h-7 px-3 text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-brand-navy">รายการสินค้า ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <AdminThumb src={item.product?.imageUrl} alt={item.nameSnapshot} className="size-14" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products/${item.productId}/edit`}
                        className="line-clamp-2 font-medium hover:text-brand-blue"
                      >
                        {item.nameSnapshot}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatTHB(item.priceSnapshot)} × {item.qty}
                        {item.product && <span className="ml-2 text-xs">(สต็อกปัจจุบัน {item.product.stock})</span>}
                      </p>
                    </div>
                    <p className="font-semibold">{formatTHB(item.priceSnapshot * item.qty)}</p>
                  </li>
                ))}
              </ul>
              <Separator className="my-3" />
              <div className="ml-auto grid max-w-xs gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ยอดรวมสินค้า</span>
                  <span>{formatTHB(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ค่าจัดส่ง</span>
                  <span>{order.shippingFee === 0 ? "ส่งฟรี" : formatTHB(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>ยอดชำระทั้งหมด</span>
                  <span className="text-brand-blue">{formatTHB(order.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">วิธีชำระเงิน</span>
                  <span>{getPaymentLabel(order.paymentMethod)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-brand-navy">ลูกค้า</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-0.5 text-sm">
                {order.user ? (
                  <>
                    <span className="font-medium">{order.user.name}</span>
                    <span className="text-muted-foreground">{order.user.email}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">ผู้เยี่ยมชม (ไม่ได้เข้าสู่ระบบ)</span>
                )}
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

        <Card className="content-start self-start">
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">จัดการสถานะ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">สถานะปัจจุบัน</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <OrderStatusForm orderId={order.id} allowed={allowed} />
            {canCancel(order.status) && (
              <>
                <Separator />
                <CancelOrderButton orderId={order.id} orderNo={order.orderNo} itemCount={order.items.length} />
              </>
            )}
            {order.status === "CANCELLED" && (
              <p className="text-sm text-muted-foreground">คำสั่งซื้อนี้ถูกยกเลิกแล้ว ไม่สามารถเปลี่ยนสถานะได้อีก</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
