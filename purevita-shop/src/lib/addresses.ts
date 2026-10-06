import { prisma } from "@/lib/prisma";

export type AddressSnapshot = {
  recipientName: string;
  phone: string;
  line: string;
  province: string;
  postalCode: string;
};

/** User's saved addresses, default first then newest. Used by /account/addresses and Phase 3 checkout. */
export function getUserAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

/** The user's default address (or null). */
export function getDefaultAddress(userId: string) {
  return prisma.address.findFirst({ where: { userId, isDefault: true } });
}

/** Parse Order.addressSnapshot JSON safely. */
export function parseAddressSnapshot(json: string): AddressSnapshot | null {
  try {
    const v = JSON.parse(json) as Partial<AddressSnapshot>;
    if (!v || typeof v !== "object") return null;
    return {
      recipientName: String(v.recipientName ?? ""),
      phone: String(v.phone ?? ""),
      line: String(v.line ?? ""),
      province: String(v.province ?? ""),
      postalCode: String(v.postalCode ?? ""),
    };
  } catch {
    return null;
  }
}
