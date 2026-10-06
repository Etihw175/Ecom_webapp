import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived httpOnly cookie that lets a guest view the orders they just placed
 * (/order/[orderNo]). Value: "orderNo~sig|orderNo~sig" — each entry HMAC-signed with
 * NEXTAUTH_SECRET so the list cannot be forged.
 */
export const GUEST_ORDERS_COOKIE = "pv_guest_orders";
export const GUEST_ORDERS_MAX_AGE = 60 * 60 * 2; // 2 hours
const MAX_ENTRIES = 5;

function secret() {
  return process.env.NEXTAUTH_SECRET ?? "purevita-dev-secret";
}

function sign(orderNo: string) {
  return createHmac("sha256", secret()).update(`guest-order:${orderNo}`).digest("base64url").slice(0, 32);
}

function verify(orderNo: string, sig: string) {
  const expected = Buffer.from(sign(orderNo));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Verified orderNos contained in the cookie value. */
export function readGuestOrders(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((entry) => entry.split("~"))
    .filter(([no, sig]) => !!no && !!sig && verify(no, sig))
    .map(([no]) => no);
}

/** New cookie value with `orderNo` added (keeps the newest MAX_ENTRIES). */
export function addGuestOrder(value: string | undefined | null, orderNo: string): string {
  const list = [...readGuestOrders(value).filter((n) => n !== orderNo), orderNo].slice(-MAX_ENTRIES);
  return list.map((n) => `${n}~${sign(n)}`).join("|");
}
