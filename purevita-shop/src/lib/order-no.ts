/** Order number format: PV-YYMMDD-XXXX (XXXX = random base36 uppercase). Unique index on Order.orderNo. */
export function generateOrderNo(date: Date = new Date()): string {
  const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000); // Asia/Bangkok
  const yy = String(bkk.getUTCFullYear()).slice(-2);
  const mm = String(bkk.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(bkk.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `PV-${yy}${mm}${dd}-${rand}`;
}
