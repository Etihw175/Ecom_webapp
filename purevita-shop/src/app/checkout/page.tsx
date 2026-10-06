import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAddresses } from "@/lib/addresses";
import { CheckoutForm, type CheckoutAddress, type CheckoutUser } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "ชำระเงิน" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const sessionUser = await getCurrentUser();
  let user: CheckoutUser | null = null;
  let addresses: CheckoutAddress[] = [];

  if (sessionUser?.id) {
    // the JWT may outlive the DB row (e.g. after re-seeding) — treat as guest then
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, email: true },
    });
    if (dbUser) {
      user = { name: dbUser.name, email: dbUser.email };
      addresses = (await getUserAddresses(dbUser.id)).map((a) => ({
        id: a.id,
        recipientName: a.recipientName,
        phone: a.phone,
        line: a.line,
        province: a.province,
        postalCode: a.postalCode,
        isDefault: a.isDefault,
      }));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-brand-navy">ชำระเงิน</h1>
      <CheckoutForm user={user} addresses={addresses} />
    </div>
  );
}
