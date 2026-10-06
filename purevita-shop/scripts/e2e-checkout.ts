/**
 * Browser E2E for the checkout UI using headless Edge/Chrome over CDP (no extra deps).
 * Usage: dev server running, then `npx tsx scripts/e2e-checkout.ts [baseUrl] [browserPath]`.
 * Mutates the DB — run `npm run db:seed` afterwards.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3103";
const BROWSER = process.argv[3] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9333;
const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, info?: unknown) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && info !== undefined ? `  -> ${JSON.stringify(info)}` : ""}`);
}

async function main() {
  const browser = spawn(BROWSER, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "pv-e2e-"))}`,
    "--no-first-run",
    "about:blank",
  ]);
  try {
    let targets: { type: string; webSocketDebuggerUrl: string }[] = [];
    for (let i = 0; i < 50 && !targets.some((t) => t.type === "page"); i++) {
      await sleep(200);
      targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).catch(() => []);
    }
    const ws = new WebSocket(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let id = 0;
    const pending = new Map<number, (v: { result?: unknown; error?: unknown }) => void>();
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg.id && pending.has(msg.id)) pending.get(msg.id)!(msg);
    });
    const send = (method: string, params: object = {}) =>
      new Promise<{ result?: unknown; error?: unknown }>((resolve) => {
        const n = ++id;
        pending.set(n, resolve);
        ws.send(JSON.stringify({ id: n, method, params }));
      });
    const evaluate = async <T>(expression: string): Promise<T> => {
      const r = (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })) as {
        result?: { result?: { value?: T }; exceptionDetails?: unknown };
      };
      if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
      return r.result?.result?.value as T;
    };
    const goto = async (path: string) => {
      await send("Page.navigate", { url: BASE + path });
      await sleep(500);
    };
    const waitFor = async (expr: string, timeout = 30000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await evaluate<boolean>(`Boolean(${expr})`).catch(() => false)) return true;
        await sleep(250);
      }
      return false;
    };
    const fill = (selector: string, value: string) =>
      evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
      })()`);
    const click = (selector: string) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const text = () => evaluate<string>("document.body.innerText");
    const cart = () => evaluate<{ productId: string; qty: number; stock: number }[]>(`JSON.parse(localStorage.getItem("purevita-cart") || "[]")`);
    // warm up dev routes first: an on-demand compile mid-test triggers a Fast Refresh full reload
    for (const path of ["/", "/cart", "/checkout", "/order/warmup", "/api/auth/csrf", "/api/auth/session"]) {
      await fetch(BASE + path).catch(() => null);
    }
    await fetch(BASE + "/api/cart/sync", { method: "POST", body: "{}" }).catch(() => null);
    await fetch(BASE + "/api/orders", { method: "POST", body: "{}" }).catch(() => null);
    await send("Page.enable");
    await send("Runtime.enable");

    const [A, B] = await prisma.product.findMany({ where: { isActive: true, stock: { gte: 10 } }, orderBy: { price: "asc" }, take: 2 });
    await prisma.product.update({ where: { id: B.id }, data: { stock: 5 } });

    // seed the cart in localStorage with a stale price + qty 4 of B
    await goto("/");
    await evaluate(`localStorage.setItem("purevita-cart", JSON.stringify(${JSON.stringify([
      { productId: A.id, slug: A.slug, name: A.name, price: 1, imageUrl: A.imageUrl, stock: A.stock, qty: 2 },
      { productId: B.id, slug: B.slug, name: B.name, price: B.price, imageUrl: B.imageUrl, stock: 50, qty: 4 },
    ])}))`);

    // /cart renders lines after hydration, sync fixes stale price
    await goto("/cart");
    check("/cart shows 2 lines after hydration", await waitFor(`document.querySelectorAll('[data-testid="cart-line"]').length === 2`));
    check("/cart sync corrected stale price from server", await waitFor(`JSON.parse(localStorage.getItem("purevita-cart")).find(i => i.productId === ${JSON.stringify(A.id)}).price === ${A.price}`));
    const cartText = await text();
    check("/cart shows totals + free-shipping hint or free shipping", /ยอดชำระทั้งหมด/.test(cartText) && /(เพื่อส่งฟรี|ส่งฟรี)/.test(cartText));

    // /checkout as guest
    await goto("/checkout");
    check("/checkout form rendered", await waitFor(`document.querySelector('input[name="recipientName"]')`));
    check("/checkout shows mock bank details for TRANSFER", /123-4-56789-0/.test(await text()));

    // 1) client-side validation (same zod schema) — empty form
    await click('button[type="submit"]');
    check("empty form → Thai field errors shown, stays on /checkout", await waitFor(`document.body.innerText.includes("กรุณากรอกชื่อผู้รับ") && document.body.innerText.includes("กรุณากรอกอีเมลสำหรับติดต่อ")`));

    await fill('input[name="recipientName"]', "ทดสอบ อีทูอี");
    await fill('input[name="phone"]', "089-999-8888");
    await fill('textarea[name="line"]', "1 ถนนพระราม 9 แขวงห้วยขวาง");
    await fill('input[name="province"]', "กรุงเทพมหานคร");
    await fill('input[name="postalCode"]', "10310");
    await fill('input[name="email"]', "e2e@test.co");
    await click('input[name="paymentMethod"][value="COD"]');

    // 2) stock drops behind the user's back → 409 → UI explains + cart qty updated
    await prisma.product.update({ where: { id: B.id }, data: { stock: 2 } });
    await click('button[type="submit"]');
    check("409 → alert names the short item with available qty", await waitFor(`document.querySelector('[role="alert"]')?.innerText.includes(${JSON.stringify(B.name)}) && document.querySelector('[role="alert"]').innerText.includes("เหลือเพียง 2 ชิ้น")`), await evaluate(`document.querySelector('[role="alert"]')?.innerText`));
    const c1 = await cart();
    check("409 → cart qty of that item set to 2 (stock 2)", c1.find((i) => i.productId === B.id)?.qty === 2 && c1.find((i) => i.productId === B.id)?.stock === 2, c1);
    check("409 → still on /checkout", (await evaluate<string>("location.pathname")) === "/checkout");

    // 3) submit again → success
    await click('button[type="submit"]');
    check("success → navigated to /order/<orderNo>", await waitFor(`/^\\/order\\/PV-/.test(location.pathname)`), await evaluate("location.pathname"));
    check("thank-you page shows ขอบคุณ + COD text", await waitFor(`document.body.innerText.includes("ขอบคุณสำหรับคำสั่งซื้อ") && document.body.innerText.includes("เก็บเงินปลายทาง")`));
    check("cart cleared after success", (await cart()).length === 0);
    const orderNo = decodeURIComponent((await evaluate<string>("location.pathname")).split("/").pop()!);
    const order = await prisma.order.findUnique({ where: { orderNo }, include: { items: true } });
    check(
      "DB order matches UI (A×2 at DB price, B×2, COD)",
      !!order && order.paymentMethod === "COD" && order.items.find((i) => i.productId === A.id)?.priceSnapshot === A.price &&
        order.items.find((i) => i.productId === B.id)?.qty === 2,
      order,
    );
    check("B stock now 0", (await prisma.product.findUniqueOrThrow({ where: { id: B.id } })).stock === 0);

    // 4) empty cart → /checkout redirects to /cart
    await goto("/checkout");
    check("empty cart: /checkout → /cart", await waitFor(`location.pathname === "/cart"`));

    // 5) logged-in customer: saved addresses radio (default preselected) → order has userId
    const customer = await prisma.user.findUniqueOrThrow({ where: { email: "customer@purevita.test" } });
    const def = await prisma.address.findFirstOrThrow({ where: { userId: customer.id, isDefault: true } });
    await evaluate(`(async () => {
      const { csrfToken } = await fetch("/api/auth/csrf").then(r => r.json());
      await fetch("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, email: "customer@purevita.test", password: "customer1234", json: "true" }) });
      localStorage.setItem("purevita-cart", JSON.stringify(${JSON.stringify([
        { productId: A.id, slug: A.slug, name: A.name, price: A.price, imageUrl: A.imageUrl, stock: A.stock, qty: 1 },
      ])}));
    })()`);
    await goto("/checkout");
    check("logged in: default saved address radio preselected", await waitFor(`document.querySelector('input[name="addressId"][value=${JSON.stringify(def.id)}]')?.checked === true`));
    check("logged in: no guest email field", !(await evaluate<boolean>(`Boolean(document.querySelector('input[name="email"]'))`)));
    await click('button[type="submit"]');
    check("logged in: success → /order/<orderNo>", await waitFor(`/^\\/order\\/PV-/.test(location.pathname)`));
    const no2 = decodeURIComponent((await evaluate<string>("location.pathname")).split("/").pop()!);
    const o2 = await prisma.order.findUnique({ where: { orderNo: no2 } });
    check("logged in: order.userId = customer, TRANSFER, bank details shown", o2?.userId === customer.id && o2.paymentMethod === "TRANSFER" && /123-4-56789-0/.test(await text()), o2);
    ws.close();
  } finally {
    browser.kill();
    await prisma.$disconnect();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
