/**
 * Browser E2E for the admin dashboard + a 375px responsive sweep, using headless Edge/Chrome over CDP (no extra deps).
 * Usage: server running (`npm run start` or `npm run dev`), then
 *   `npx tsx scripts/e2e-admin-dashboard.ts [baseUrl] [browserPath]`
 * Mutates the DB (places an order, edits stock) — run `npm run db:seed` afterwards.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const BROWSER = process.argv[3] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9334;
const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const thb = (s: string | null | undefined) => Number(String(s ?? "").replace(/[^\d]/g, "")) || 0;

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
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "pv-e2e-admin-"))}`,
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
    const waitFor = async (expr: string, timeout = 20000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await evaluate<boolean>(`Boolean(${expr})`).catch(() => false)) return true;
        await sleep(200);
      }
      return false;
    };
    const goto = async (path: string) => {
      await send("Page.navigate", { url: BASE + path });
      await sleep(300);
      await waitFor(`document.readyState === "complete"`);
      await sleep(300);
    };
    const fill = (selector: string, value: string) =>
      evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
      })()`);
    const loginAs = (email: string, password: string) =>
      evaluate(`(async () => {
        const { csrfToken } = await fetch("/api/auth/csrf").then(r => r.json());
        const r = await fetch("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken, email: ${JSON.stringify(email)}, password: ${JSON.stringify(password)}, json: "true" }) });
        return r.status;
      })()`);
    const stat = (title: string) => evaluate<string>(`document.querySelector('[data-stat=${JSON.stringify(title)}]')?.textContent ?? ""`);
    // elements sticking out of the viewport that are NOT inside a horizontal scroll container
    const overflowReport = () =>
      evaluate<{ docWidth: number; vw: number; offenders: string[] }>(`(() => {
        const vw = window.innerWidth;
        const scrollParent = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p !== document.body && p !== document.documentElement) return p; } return null; };
        const offenders = [];
        for (const el of document.body.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1 || r.left < -1) {
            if (scrollParent(el)) continue;
            if (getComputedStyle(el).position === "fixed") continue;
            offenders.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 60) + " right=" + Math.round(r.right));
          }
        }
        return { docWidth: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 5) };
      })()`);

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });

    // ---------- 1) responsive sweep at 375px ----------
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "cordyceps-tibet-premium" } });
    const sweep = async (label: string, paths: string[]) => {
      for (const p of paths) {
        await goto(p);
        const r = await overflowReport();
        check(`375px no horizontal overflow [${label}] ${p}`, r.docWidth <= r.vw && r.offenders.length === 0, r);
      }
    };
    await goto("/");
    await evaluate(`localStorage.setItem("purevita-cart", JSON.stringify(${JSON.stringify([
      { productId: product.id, slug: product.slug, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock, qty: 2 },
    ])}))`);
    await sweep("guest", ["/", "/products", "/products?q=zzzz", `/products/${product.slug}`, "/cart", "/checkout", "/login", "/register", "/no-such-page"]);

    // mobile nav sheet in header
    await goto("/");
    const headerMenu = await evaluate<boolean>(`(() => { const b = [...document.querySelectorAll("header button")].find(b => b.offsetParent && /เมนู/.test(b.getAttribute("aria-label") || b.textContent)); if (!b) return false; b.click(); return true; })()`);
    check("header mobile menu button visible + opens a dialog", headerMenu && (await waitFor(`document.querySelector('[role="dialog"]')`)));

    check("customer login 200", (await loginAs("customer@purevita.test", "customer1234")) === 200);
    await sweep("customer", ["/account", "/account/orders", "/account/addresses", "/checkout"]);
    const custOrder = await prisma.order.findFirst({ where: { user: { email: "customer@purevita.test" } }, orderBy: { createdAt: "desc" } });
    if (custOrder) await sweep("customer", [`/account/orders/${custOrder.orderNo}`]);

    await send("Network.enable");
    await send("Network.clearBrowserCookies");
    check("admin login 200", (await loginAs("admin@purevita.test", "admin1234")) === 200);
    const someOrder = await prisma.order.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
    await sweep("admin", ["/admin", "/admin/orders", "/admin/products", "/admin/products/new", `/admin/orders/${someOrder.id}`, `/admin/products/${product.id}/edit`]);

    await goto("/admin");
    const sheetOpened = await evaluate<boolean>(`(() => { const b = document.querySelector('[aria-label="เปิดเมนูหลังร้าน"]'); if (!b || !b.offsetParent) return false; b.click(); return true; })()`);
    check("admin sidebar Sheet: trigger visible at 375px and opens", sheetOpened && (await waitFor(`document.querySelector('[role="dialog"]')?.innerText.includes("คำสั่งซื้อ")`)));
    const sheetFits = await evaluate<boolean>(`(() => { const d = document.querySelector('[role="dialog"]'); return !!d && d.getBoundingClientRect().right <= window.innerWidth + 1; })()`);
    check("admin Sheet fits in viewport", sheetFits);
    await evaluate(`[...document.querySelectorAll('[role="dialog"] a')].find(a => a.getAttribute("href") === "/admin/orders").click()`);
    check("admin Sheet link navigates to /admin/orders and closes", await waitFor(`location.pathname === "/admin/orders" && !document.querySelector('[role="dialog"]')`));

    // ---------- 2) dashboard reflects a new order immediately ----------
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await goto("/admin");
    check("dashboard: 5 stat cards", (await evaluate<number>(`document.querySelectorAll("[data-stat]").length`)) === 5);
    check("dashboard: recharts chart rendered", await waitFor(`document.querySelector(".recharts-surface")?.getBoundingClientRect().width > 200`));
    const bars = await evaluate<number>(`document.querySelectorAll(".recharts-bar-rectangle").length`);
    const { getRevenueSeries, bangkokDayKey } = await import("../src/lib/admin/dashboard");
    const series = await getRevenueSeries();
    check(
      "dashboard: series = 14 consecutive zero-filled Bangkok days ending today",
      series.length === 14 &&
        series[13].day === bangkokDayKey(new Date()) &&
        series.every((p, i) => i === 0 || Date.parse(p.day) - Date.parse(series[i - 1].day) === 86_400_000),
      series.map((p) => p.day),
    );
    const { getDashboardRanges } = await import("../src/lib/admin/dashboard");
    const rg = getDashboardRanges(new Date("2026-10-31T17:30:00Z")); // = 1 Nov 00:30 in Bangkok
    check(
      "dashboard: Bangkok date math (UTC 31 Oct 17:30 → BKK 1 Nov; month starts 1 Nov 00:00+07)",
      bangkokDayKey(new Date("2026-10-31T17:30:00Z")) === "2026-11-01" &&
        rg.today === "2026-11-01" &&
        rg.monthStart.toISOString() === "2026-10-31T17:00:00.000Z" &&
        rg.last7Start.toISOString() === "2026-10-25T17:00:00.000Z" &&
        rg.chartStartDay === "2026-10-19",
      rg,
    );
    check("dashboard: one bar per day with sales", bars === series.filter((p) => p.revenue > 0).length, { bars });
    check("dashboard: top products list has 5", (await evaluate<number>(`document.querySelectorAll('[data-testid="top-products"] li').length`)) === 5);
    check("dashboard: latest orders table has 10 rows", (await evaluate<number>(`document.querySelectorAll('[data-testid="latest-orders"] tbody tr').length`)) === 10);
    // hover the last bar → THB tooltip
    const box = await evaluate<{ x: number; y: number } | null>(`(() => { const s = document.querySelector(".recharts-surface").getBoundingClientRect(); return { x: s.right - 30, y: s.top + s.height / 2 }; })()`);
    if (box) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
    check("dashboard: hover shows THB tooltip", await waitFor(`/฿[\\d,]+/.test(document.querySelector(".recharts-tooltip-wrapper")?.innerText ?? "")`, 5000));

    const before = { today: thb(await stat("ยอดขายวันนี้")), d7: thb(await stat("ยอดขาย 7 วัน")), month: thb(await stat("ยอดขายเดือนนี้")), count: thb(await stat("จำนวนออเดอร์เดือนนี้")) };
    const pendingBefore = thb(await evaluate<string>(`[...document.querySelectorAll("a")].find(a => a.textContent.includes("รอดำเนินการ"))?.textContent`));
    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: product.id, qty: 2 }],
        address: { recipientName: "ทดสอบ แดชบอร์ด", phone: "0812345678", line: "99 ถนนสุขุมวิท", province: "กรุงเทพมหานคร", postalCode: "10110" },
        paymentMethod: "COD",
        email: "dash@test.co",
      }),
    });
    const { orderNo } = (await res.json()) as { orderNo: string };
    check("POST /api/orders → 201", res.status === 201, res.status);
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNo } });
    await goto("/admin");
    const after = { today: thb(await stat("ยอดขายวันนี้")), d7: thb(await stat("ยอดขาย 7 วัน")), month: thb(await stat("ยอดขายเดือนนี้")), count: thb(await stat("จำนวนออเดอร์เดือนนี้")) };
    const pendingAfter = thb(await evaluate<string>(`[...document.querySelectorAll("a")].find(a => a.textContent.includes("รอดำเนินการ"))?.textContent`));
    check(`dashboard: ยอดขายวันนี้ +${order.total}`, after.today - before.today === order.total, { before, after });
    check("dashboard: 7 วัน and เดือนนี้ grew by the same total", after.d7 - before.d7 === order.total && after.month - before.month === order.total, { before, after });
    check("dashboard: monthly order count +1, pending +1", after.count === before.count + 1 && pendingAfter === pendingBefore + 1, { before, after, pendingBefore, pendingAfter });
    check("dashboard: new order is first row in latest orders, links to /admin/orders/[id]",
      await evaluate<boolean>(`(() => { const a = document.querySelector('[data-testid="latest-orders"] tbody tr a'); return a?.textContent === ${JSON.stringify(orderNo)} && a.getAttribute("href") === ${JSON.stringify(`/admin/orders/${order.id}`)}; })()`));

    // cancelled orders are excluded from sales
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await goto("/admin");
    check("dashboard: cancelling the order removes it from ยอดขายวันนี้", thb(await stat("ยอดขายวันนี้")) === before.today);
    await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING" } });
    await goto("/admin");

    // ---------- 3) low-stock alert disappears after editing stock through the admin form ----------
    const vitB = await prisma.product.findUniqueOrThrow({ where: { slug: "vitamin-b-complex" } });
    const lowSel = `[data-low-stock-id=${JSON.stringify(vitB.id)}]`;
    check("low-stock: vitamin-b-complex alerted, links to edit page",
      await evaluate<boolean>(`document.querySelector('${lowSel}')?.getAttribute("href") === ${JSON.stringify(`/admin/products/${vitB.id}/edit`)}`));
    await evaluate(`document.querySelector('${lowSel}').click()`);
    check("low-stock: click → edit page", await waitFor(`location.pathname === ${JSON.stringify(`/admin/products/${vitB.id}/edit`)} && document.querySelector('input[name="stock"]')`));
    await fill('input[name="stock"]', "50");
    await evaluate(`[...document.querySelectorAll('button[type="submit"]')].find(b => b.textContent.includes("บันทึกการแก้ไข")).click()`);
    let saved = false;
    for (let i = 0; i < 50 && !saved; i++) {
      await sleep(200);
      saved = (await prisma.product.findUniqueOrThrow({ where: { id: vitB.id } })).stock === 50;
    }
    check("low-stock: form save wrote stock 50 to DB", saved);
    await goto("/admin");
    check("low-stock: vitamin-b-complex alert gone after edit", !(await evaluate<boolean>(`Boolean(document.querySelector('${lowSel}'))`)));

    // clear the remaining alerts → empty state
    await prisma.product.updateMany({ where: { isActive: true, stock: { lte: 10 } }, data: { stock: 100 } });
    await goto("/admin");
    check("low-stock: empty state 'สต็อกเพียงพอทุกรายการ'", await waitFor(`document.querySelector('[data-testid="low-stock-empty"]')?.innerText.includes("สต็อกเพียงพอทุกรายการ")`));
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
