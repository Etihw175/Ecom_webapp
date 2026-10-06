/**
 * Runtime tests for Phase 3 (POST /api/orders, /order/[orderNo], /account/orders).
 * Usage: start a dev server, then `npx tsx scripts/test-checkout.ts [baseUrl]` (default http://localhost:3103).
 * Mutates the DB — run `npm run db:seed` afterwards.
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3103";
const prisma = new PrismaClient();

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, info?: unknown) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && info !== undefined ? `  -> ${JSON.stringify(info)}` : ""}`);
}

class Jar {
  cookies = new Map<string, string>();
  store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function post(path: string, body: unknown, jar?: Jar, raw = false) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(jar ? { Cookie: jar.header() } : {}) },
    body: raw ? (body as string) : JSON.stringify(body),
  });
  jar?.store(res);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, res };
}

async function get(path: string, jar?: Jar) {
  const res = await fetch(BASE + path, { headers: jar ? { Cookie: jar.header() } : {}, redirect: "manual" });
  return { status: res.status, html: await res.text() };
}

async function login(email: string, password: string) {
  const jar = new Jar();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  jar.store(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.header() },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
    redirect: "manual",
  });
  jar.store(res);
  return jar;
}

const ADDRESS = {
  recipientName: "ทดสอบ ผู้ซื้อ",
  phone: "081-234-5678",
  line: "99/1 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย",
  province: "กรุงเทพมหานคร",
  postalCode: "10110",
};

const stockOf = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

async function main() {
  const products = await prisma.product.findMany({ where: { isActive: true, stock: { gte: 8 } }, orderBy: { price: "asc" } });
  const [A, B, C, D] = products;
  console.log(`Using products: A=${A.slug}(${A.stock}) B=${B.slug}(${B.stock}) C=${C.slug} D=${D.slug}`);

  // ---------- (a) guest order ----------
  {
    const before = A.stock;
    const guest = new Jar();
    const r = await post(
      "/api/orders",
      { items: [{ productId: A.id, qty: 2 }], address: ADDRESS, paymentMethod: "TRANSFER", email: "Guest@Example.com" },
      guest,
    );
    check("(a) guest order → 201 {orderNo}", r.status === 201 && /^PV-\d{6}-[0-9A-Z]{4}$/.test(r.data?.orderNo), r);
    const orderNo = r.data?.orderNo as string;
    check("(a) stock decremented by 2", (await stockOf(A.id)) === before - 2);
    const order = await prisma.order.findUnique({ where: { orderNo }, include: { items: true } });
    const sub = A.price * 2;
    check(
      "(a) order PENDING, userId null, totals server-computed",
      !!order && order.userId === null && order.status === "PENDING" && order.subtotal === sub &&
        order.shippingFee === (sub >= 800 ? 0 : 50) && order.total === sub + order.shippingFee,
      order,
    );
    check(
      "(a) OrderItem snapshots (name/price/qty)",
      order?.items.length === 1 && order.items[0].nameSnapshot === A.name && order.items[0].priceSnapshot === A.price && order.items[0].qty === 2,
      order?.items,
    );
    const snap = JSON.parse(order?.addressSnapshot ?? "{}");
    check("(a) addressSnapshot (phone normalised, email lower-cased)", snap.phone === "0812345678" && snap.email === "guest@example.com", snap);
    check("(a) guest cookie set (httpOnly)", r.res.headers.getSetCookie().some((c) => c.startsWith("pv_guest_orders=") && /httponly/i.test(c)));
    const page = await get(`/order/${orderNo}`, guest);
    check("(a) /order/[orderNo] with guest cookie → 200 + shows order & bank details", page.status === 200 && page.html.includes(orderNo) && page.html.includes("123-4-56789-0"));
    const anon = await get(`/order/${orderNo}`);
    check("(a) /order/[orderNo] without cookie → 404", anon.status === 404, anon.status);
    const forged = new Jar();
    forged.cookies.set("pv_guest_orders", `${orderNo}~AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
    check("(a) forged guest cookie → 404", (await get(`/order/${orderNo}`, forged)).status === 404);
    const admin = await login("admin@purevita.test", "admin1234");
    check("(a) admin can view guest order → 200", (await get(`/order/${orderNo}`, admin)).status === 200);
  }

  // ---------- (b) logged-in customer with addressId ----------
  {
    const customer = await prisma.user.findUniqueOrThrow({ where: { email: "customer@purevita.test" } });
    const addr = await prisma.address.findFirstOrThrow({ where: { userId: customer.id } });
    const jar = await login("customer@purevita.test", "customer1234");
    check("(b) customer login → session cookie", [...jar.cookies.keys()].some((k) => k.includes("session-token")));
    const before = await stockOf(B.id);
    const r = await post("/api/orders", { items: [{ productId: B.id, qty: 1 }, { productId: C.id, qty: 3 }], addressId: addr.id, paymentMethod: "COD" }, jar);
    check("(b) order with addressId → 201", r.status === 201, r.data);
    const orderNo = r.data?.orderNo as string;
    const order = await prisma.order.findUnique({ where: { orderNo }, include: { items: true } });
    check("(b) order.userId = customer, COD, 2 items", order?.userId === customer.id && order.paymentMethod === "COD" && order.items.length === 2, order);
    check("(b) addressSnapshot from saved address", JSON.parse(order!.addressSnapshot).recipientName === addr.recipientName);
    check("(b) stock B decremented", (await stockOf(B.id)) === before - 1);
    check("(b) no guest cookie for logged-in user", !r.res.headers.getSetCookie().some((c) => c.startsWith("pv_guest_orders=")));
    const list = await get("/account/orders", jar);
    check("(b) order appears in /account/orders HTML", list.status === 200 && list.html.includes(orderNo), list.status);
    check("(b) owner can open /order/[orderNo]", (await get(`/order/${orderNo}`, jar)).status === 200);
    check("(b) anonymous cannot open it → 404", (await get(`/order/${orderNo}`)).status === 404);

    // new address + saveAddress
    const addrCount = await prisma.address.count({ where: { userId: customer.id } });
    const r2 = await post("/api/orders", { items: [{ productId: B.id, qty: 1 }], address: { ...ADDRESS, recipientName: "ที่อยู่ใหม่ ทดสอบ" }, saveAddress: true, paymentMethod: "TRANSFER" }, jar);
    check("(b) new address + saveAddress → 201 and address saved", r2.status === 201 && (await prisma.address.count({ where: { userId: customer.id } })) === addrCount + 1, r2.data);

    // someone else's / unknown addressId
    const r3 = await post("/api/orders", { items: [{ productId: B.id, qty: 1 }], addressId: "not-my-address", paymentMethod: "COD" }, jar);
    check("(b) foreign addressId → 400 fieldErrors.addressId", r3.status === 400 && !!r3.data?.fieldErrors?.addressId, r3);

    // 401: addressId without session
    const r4 = await post("/api/orders", { items: [{ productId: B.id, qty: 1 }], addressId: addr.id, paymentMethod: "COD", email: "x@y.com" });
    check("(b) addressId without session → 401", r4.status === 401 && typeof r4.data?.error === "string", r4);
  }

  // ---------- (c) qty > stock ----------
  {
    const before = await stockOf(D.id);
    const orders = await prisma.order.count();
    const r = await post("/api/orders", { items: [{ productId: D.id, qty: before + 1 }], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(c) qty > stock → 409 {error, productId, available}", r.status === 409 && r.data?.productId === D.id && r.data?.available === before && /เหลือเพียง/.test(r.data?.error), r.data);
    check("(c) stock unchanged, no order created", (await stockOf(D.id)) === before && (await prisma.order.count()) === orders);

    // atomicity: first line OK, second line short → nothing decremented
    const beforeA = await stockOf(A.id);
    const r2 = await post("/api/orders", { items: [{ productId: A.id, qty: 1 }, { productId: D.id, qty: before + 5 }], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(c) multi-line: 2nd line short → 409 and 1st line rolled back", r2.status === 409 && (await stockOf(A.id)) === beforeA && (await prisma.order.count()) === orders, r2.data);

    // out-of-stock / inactive product
    const oos = await prisma.product.findFirstOrThrow({ where: { stock: 0 } });
    const r3 = await post("/api/orders", { items: [{ productId: oos.id, qty: 1 }], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(c) stock-0 product → 409 available 0", r3.status === 409 && r3.data?.available === 0, r3.data);
    const r4 = await post("/api/orders", { items: [{ productId: "does-not-exist", qty: 1 }], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(c) unknown product → 409 available 0", r4.status === 409 && r4.data?.available === 0, r4.data);
  }

  // ---------- (d) concurrency ----------
  {
    await prisma.product.update({ where: { id: C.id }, data: { stock: 3 } });
    const ordersBefore = await prisma.order.count({ where: { items: { some: { productId: C.id } } } });
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        post("/api/orders", { items: [{ productId: C.id, qty: 1 }], address: ADDRESS, paymentMethod: "COD", email: `race${i}@test.co` }),
      ),
    );
    const statuses = results.map((r) => r.status);
    const ok = statuses.filter((s) => s === 201).length;
    const conflict = statuses.filter((s) => s === 409).length;
    console.log(`      concurrent statuses: ${statuses.join(",")}`);
    check("(d) 10 concurrent, stock 3 → exactly 3 × 201, 7 × 409", ok === 3 && conflict === 7, statuses);
    check("(d) stock ends at 0", (await stockOf(C.id)) === 0);
    const ordersAfter = await prisma.order.count({ where: { items: { some: { productId: C.id } } } });
    check("(d) exactly 3 new orders contain the product", ordersAfter - ordersBefore === 3);
    const orderNos = results.filter((r) => r.status === 201).map((r) => r.data.orderNo);
    check("(d) orderNos unique", new Set(orderNos).size === orderNos.length);
  }

  // ---------- (e) bad bodies ----------
  {
    const invalidJson = await post("/api/orders", "{not json", undefined, true);
    check("(e) invalid JSON → 400", invalidJson.status === 400 && typeof invalidJson.data?.error === "string");
    const empty = await post("/api/orders", { items: [], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(e) empty items → 400 fieldErrors.items", empty.status === 400 && !!empty.data?.fieldErrors?.items, empty.data);
    const badAddr = await post("/api/orders", { items: [{ productId: A.id, qty: 1 }], address: { ...ADDRESS, phone: "12", postalCode: "abc" }, paymentMethod: "COD", email: "a@b.co" });
    check(
      "(e) bad phone/postal → 400 with Thai fieldErrors address.phone/address.postalCode",
      badAddr.status === 400 && /เบอร์โทร/.test(badAddr.data?.fieldErrors?.["address.phone"]?.[0]) && !!badAddr.data?.fieldErrors?.["address.postalCode"],
      badAddr.data,
    );
    const badPay = await post("/api/orders", { items: [{ productId: A.id, qty: 1 }], address: ADDRESS, paymentMethod: "BITCOIN", email: "a@b.co" });
    check("(e) bad paymentMethod → 400 fieldErrors.paymentMethod", badPay.status === 400 && !!badPay.data?.fieldErrors?.paymentMethod, badPay.data);
    const badQty = await post("/api/orders", { items: [{ productId: A.id, qty: 0 }, { productId: B.id, qty: 1.5 }], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(e) qty 0 / 1.5 → 400 items.0.qty + items.1.qty", badQty.status === 400 && !!badQty.data?.fieldErrors?.["items.0.qty"] && !!badQty.data?.fieldErrors?.["items.1.qty"], badQty.data);
    const noAddr = await post("/api/orders", { items: [{ productId: A.id, qty: 1 }], paymentMethod: "COD", email: "a@b.co" });
    check("(e) no address → 400 fieldErrors.address", noAddr.status === 400 && !!noAddr.data?.fieldErrors?.address, noAddr.data);
    const dup = await post("/api/orders", { items: [{ productId: A.id, qty: 1 }, { productId: A.id, qty: 1 }], address: ADDRESS, paymentMethod: "COD", email: "a@b.co" });
    check("(e) duplicate productId → 400", dup.status === 400, dup.data);
    const noEmail = await post("/api/orders", { items: [{ productId: A.id, qty: 1 }], address: ADDRESS, paymentMethod: "COD" });
    check("(e) guest without email → 400 fieldErrors.email", noEmail.status === 400 && !!noEmail.data?.fieldErrors?.email, noEmail.data);
  }

  // ---------- (f) tampered price ----------
  {
    const r = await post("/api/orders", {
      items: [{ productId: A.id, qty: 1, price: 1, priceSnapshot: 1 }],
      address: ADDRESS,
      paymentMethod: "TRANSFER",
      email: "cheat@test.co",
      subtotal: 1,
      shippingFee: 0,
      total: 1,
      status: "PAID",
      userId: "someone",
    });
    const order = await prisma.order.findUnique({ where: { orderNo: r.data?.orderNo ?? "" }, include: { items: true } });
    check(
      "(f) tampered price/total/status/userId ignored (DB price used)",
      r.status === 201 && order?.items[0].priceSnapshot === A.price && order.subtotal === A.price &&
        order.total === A.price + (A.price >= 800 ? 0 : 50) && order.status === "PENDING" && order.userId === null,
      { status: r.status, order },
    );
  }

  // ---------- cart sync + pages ----------
  {
    const s = await post("/api/cart/sync", { productIds: [A.id, "nope"] });
    check("cart sync returns fresh product data", s.status === 200 && s.data.products.length === 1 && s.data.products[0].price === A.price, s.data);
    for (const p of ["/cart", "/checkout"]) {
      const r = await get(p);
      check(`GET ${p} → 200`, r.status === 200, r.status);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
