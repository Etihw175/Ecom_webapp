import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserAddresses } from "@/lib/addresses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressFormDialog } from "./address-form-dialog";
import { AddressCardActions } from "./address-card-actions";

export const metadata: Metadata = { title: "ที่อยู่จัดส่ง" };

export default async function AccountAddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await getUserAddresses(user.id);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-lg text-brand-navy">ที่อยู่จัดส่ง</CardTitle>
        {addresses.length > 0 && <AddressFormDialog />}
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <MapPin className="size-12 text-brand-sky" />
            <p className="font-medium text-brand-navy">ยังไม่มีที่อยู่ที่บันทึกไว้</p>
            <p className="text-sm text-muted-foreground">เพิ่มที่อยู่เพื่อให้การสั่งซื้อครั้งต่อไปรวดเร็วขึ้น</p>
            <AddressFormDialog isFirst />
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {addresses.map((a) => (
              <li
                key={a.id}
                className={
                  a.isDefault
                    ? "grid gap-3 rounded-lg border-2 border-brand-blue/60 bg-brand-sky/5 p-4"
                    : "grid gap-3 rounded-lg border p-4"
                }
              >
                <div className="grid gap-0.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-navy">{a.recipientName}</span>
                    {a.isDefault && (
                      <Badge className="bg-brand-blue text-white">ที่อยู่หลัก</Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground">โทร {a.phone}</span>
                  <span>{a.line}</span>
                  <span>
                    {a.province} {a.postalCode}
                  </span>
                </div>
                <AddressCardActions
                  address={{
                    id: a.id,
                    recipientName: a.recipientName,
                    phone: a.phone,
                    line: a.line,
                    province: a.province,
                    postalCode: a.postalCode,
                    isDefault: a.isDefault,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
