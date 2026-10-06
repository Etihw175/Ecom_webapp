/**
 * Full demo-script E2E in a real headless Edge/Chrome over CDP (no extra deps), driven like a presenter:
 * real mouse clicks (Input.dispatchMouseEvent) and keyboard typing (Input.insertText / Enter) — the six demo
 * steps never call the API directly. Prisma is used only to VERIFY the database between steps.
 *
 * Usage: production server running (`npm run build && npm run start`), then
 *   `npx tsx scripts/e2e-demo.ts [baseUrl=http://localhost:3000] [browserPath]`
 * Mutates the DB (registers a user, places/cancels orders, edits products) and finally runs `npm run db:seed`
 * itself (stale-session check), so the DB ends in the seeded state.
 */
import { execSync, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const BROWSER = process.argv[3] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9336;
const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const thb = (s: string | null | undefined) => Number(String(s ?? "").replace(/[^\d]/g, "")) || 0;
const J = JSON.stringify;

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, info?: unknown) {
  if (ok) pass++;
  else {
    fail++;
    failures.push(name);
  }
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && info !== undefined ? `  -> ${J(info)}` : ""}`);
}
function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

type CdpMsg = { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: unknown };

/** One browser tab driven over its own CDP websocket. */
class Tab {
  private id = 0;
  private pending = new Map<number, (m: CdpMsg) => void>();
  /** status of the last top-level document response */
  docStatus = 0;
  /** responses of POST /api/orders seen in this tab */
  orderResponses: number[] = [];
  /** uncaught page exceptions */
  exceptions: string[] = [];

  private constructor(private ws: WebSocket, readonly name: string) {
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(String(e.data)) as CdpMsg;
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg);
        this.pending.delete(msg.id);
      } else if (msg.method === "Network.responseReceived") {
        const p = msg.params as { type: string; response: { url: string; status: number } };
        if (p.type === "Document") this.docStatus = p.response.status;
        if (p.response.url.endsWith("/api/orders")) this.orderResponses.push(p.response.status);
      } else if (msg.method === "Runtime.exceptionThrown") {
        const d = (msg.params as { exceptionDetails: { text: string; exception?: { description?: string } } }).exceptionDetails;
        this.exceptions.push(d.exception?.description?.split("\n")[0] ?? d.text);
      }
    });
  }

  static async open(wsUrl: string, name: string) {
    const ws = new WebSocket(wsUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    const t = new Tab(ws, name);
    await t.send("Page.enable");
    await t.send("Runtime.enable");
    await t.send("Network.enable");
    await t.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    return t;
  }

  send(method: string, params: object = {}) {
    return new Promise<CdpMsg>((resolve) => {
      const n = ++this.id;
      this.pending.set(n, resolve);
      this.ws.send(J({ id: n, method, params }));
    });
  }

  async eval<T>(expression: string): Promise<T> {
    const r = (await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })) as {
      result?: { result?: { value?: T }; exceptionDetails?: unknown };
    };
    if (r.result?.exceptionDetails) throw new Error(J(r.result.exceptionDetails));
    return r.result?.result?.value as T;
  }

  async waitFor(expr: string, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await this.eval<boolean>(`Boolean(${expr})`).catch(() => false)) return true;
      await sleep(150);
    }
    return false;
  }

  async settle() {
    await sleep(300);
    await this.waitFor(`document.readyState === "complete"`);
    await sleep(400);
  }

  /** Address-bar navigation (only used to open the site / for reloads). */
  async goto(path: string) {
    await this.send("Page.navigate", { url: BASE + path });
    await this.settle();
  }

  async reload() {
    await this.send("Page.reload");
    await this.settle();
  }

  path() {
    return this.eval<string>("location.pathname + location.search");
  }

  text() {
    return this.eval<string>("document.body.innerText");
  }

  /**
   * Real mouse click on the first VISIBLE element matched by `finder` (a JS expression returning an
   * element or array of elements). Waits until it exists, is visible and enabled.
   */
  async click(finder: string, label = finder, timeout = 15000) {
    const pick = `(() => { let v = (${finder}); const list = v == null ? [] : (Array.isArray(v) || v instanceof NodeList) ? [...v] : [v];
      return list.find(el => el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.disabled) || null; })()`;
    const ok = await this.waitFor(pick, timeout);
    if (!ok) throw new Error(`[${this.name}] click target not found: ${label}`);
    const box = await this.eval<{ x: number; y: number }>(`(() => { const el = ${pick}; el.scrollIntoView({ block: "center", inline: "center" });
      const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await sleep(80);
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await sleep(150);
  }

  /** Click a field, select its content and type `value` with the keyboard. */
  async type(finder: string, value: string) {
    await this.click(finder);
    await this.eval(`(() => { const el = document.activeElement; if (el && "select" in el) el.select(); })()`);
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    if (value) await this.send("Input.insertText", { text: value });
    await sleep(60);
  }

  async pressEnter() {
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  }

  close() {
    this.ws.close();
  }
}

// ---------- finders (JS expressions evaluated in the page) ----------
const byText = (selector: string, text: string) =>
  `[...document.querySelectorAll(${J(selector)})].filter(el => el.textContent.replace(/\\s+/g, " ").includes(${J(text)}))`;
const field = (name: string) => `document.querySelectorAll('[name=${J(name)}]')`;
const headerCount = `document.querySelector('header [data-slot="cart-count"]')?.textContent ?? ""`;

async function main() {
  const browser = spawn(BROWSER, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "pv-e2e-demo-"))}`,
    "--no-first-run",
    "about:blank",
  ]);
  const tabs: Tab[] = [];
  try {
    let targets: { id: string; type: string; webSocketDebuggerUrl: string }[] = [];
    for (let i = 0; i < 50 && !targets.some((t) => t.type === "page"); i++) {
      await sleep(200);
      targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).catch(() => []);
    }
    const page = await Tab.open(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl, "presenter");
    tabs.push(page);

    // a second, isolated browser context (own cookies + localStorage) for a parallel admin window
    const version = (await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json())) as { webSocketDebuggerUrl: string };
    const openIsolatedTab = async (name: string) => {
      const bws = new WebSocket(version.webSocketDebuggerUrl);
      await new Promise((r) => bws.addEventListener("open", r, { once: true }));
      let n = 0;
      const call = (method: string, params: object) =>
        new Promise<{ result: Record<string, string> }>((resolve) => {
          const id = ++n;
          const h = (e: MessageEvent) => {
            const m = JSON.parse(String(e.data));
            if (m.id === id) {
              bws.removeEventListener("message", h);
              resolve(m);
            }
          };
          bws.addEventListener("message", h);
          bws.send(J({ id, method, params }));
        });
      const ctx = await call("Target.createBrowserContext", {});
      const tgt = await call("Target.createTarget", { url: "about:blank", browserContextId: ctx.result.browserContextId });
      const t = await Tab.open(`ws://127.0.0.1:${PORT}/devtools/page/${tgt.result.targetId}`, name);
      tabs.push(t);
      return t;
    };

    // ---------- presenter helpers (all through the UI) ----------
    const openAccountMenu = (t: Tab) => t.click(`document.querySelector('header [aria-label="เมนูบัญชีผู้ใช้"]')`, "account menu");
    const logout = async (t: Tab) => {
      await openAccountMenu(t);
      await t.click(byText('[role="menuitem"]', "ออกจากระบบ"), "ออกจากระบบ");
      const ok = await t.waitFor(`document.querySelector('header a[href="/login"]')`);
      await t.settle();
      return ok;
    };
    const login = async (t: Tab, email: string, password: string) => {
      await t.click(`document.querySelector('header a[href="/login"]')`, "header เข้าสู่ระบบ");
      await t.waitFor(`location.pathname === "/login" && document.querySelector('input[name="email"]')`);
      await t.type(`document.querySelector('input[name="email"]')`, email);
      await t.type(`document.querySelector('input[name="password"]')`, password);
      await t.click(byText('form button[type="submit"]', "เข้าสู่ระบบ"), "submit login");
      const ok = await t.waitFor(`location.pathname !== "/login" && document.querySelector('header [aria-label="เมนูบัญชีผู้ใช้"]')`);
      await t.settle();
      return ok;
    };
    const goMenu = async (t: Tab, label: string, path: string) => {
      await openAccountMenu(t);
      await t.click(byText('[role="menuitem"]', label), label);
      const ok = await t.waitFor(`location.pathname === ${J(path)}`);
      await t.settle();
      return ok;
    };
    const dashStats = async (t: Tab) => {
      const s = (title: string) => t.eval<string>(`document.querySelector('[data-stat=${J(title)}]')?.textContent ?? ""`);
      return { today: thb(await s("ยอดขายวันนี้")), d7: thb(await s("ยอดขาย 7 วัน")), month: thb(await s("ยอดขายเดือนนี้")), count: thb(await s("จำนวนออเดอร์เดือนนี้")) };
    };
    const orderRowText = (t: Tab, orderNo: string) =>
      t.eval<string>(`[...document.querySelectorAll("tr, li")].filter(el => el.offsetParent && el.textContent.includes(${J(orderNo)})).map(el => el.textContent).join(" | ")`);
    const noErrorPage = async (t: Tab) => !(await t.text()).includes("เกิดข้อผิดพลาดบางอย่าง");

    const cordy = await prisma.product.findUniqueOrThrow({ where: { slug: "cordyceps-tibet-premium" } });
    const stamp = Date.now().toString(36);
    const newUser = { name: `ทดสอบ เดโม ${stamp}`, email: `demo-${stamp}@example.com`, password: "demo12345" };
    const newAddr = { recipientName: "สมหญิง ทดสอบ", phone: "081-234-5678", line: "123/45 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร", province: "กรุงเทพมหานคร", postalCode: "10900" };

    // ---------- baseline: presenter shows the admin dashboard first ----------
    section("Baseline: admin dashboard before the demo");
    await page.goto("/");
    check("baseline: admin login through /login", await login(page, "admin@purevita.test", "admin1234"));
    check("baseline: admin lands on /admin", (await page.path()) === "/admin", await page.path());
    const before = await dashStats(page);
    check("baseline: dashboard stats readable", before.month > 0, before);
    check("baseline: logout via header menu", await logout(page));

    // ---------- Step 1 ----------
    section("Step 1: search ถั่งเช่า, open product, qty 2, add to cart");
    await page.type(`document.querySelectorAll('header input[name="q"]')`, "ถั่งเช่า");
    await page.pressEnter();
    check("1: header search → /products?q=ถั่งเช่า", await page.waitFor(`location.pathname === "/products" && new URLSearchParams(location.search).get("q") === "ถั่งเช่า"`));
    await page.settle();
    const resultCount = await page.eval<number>(`new Set([...document.querySelectorAll('main a[href^="/products/"]')].map(a => a.getAttribute("href"))).size`);
    check("1: 3 ถั่งเช่า products listed", resultCount === 3, resultCount);
    await page.click(`document.querySelectorAll('main a[href="/products/${cordy.slug}"]')`, "product card");
    check("1: product page opened", await page.waitFor(`location.pathname === "/products/${cordy.slug}" && document.querySelector('[aria-label="เพิ่มจำนวน"]')`));
    await page.settle();
    await page.click(`document.querySelector('[aria-label="เพิ่มจำนวน"]')`, "qty +");
    check("1: qty input shows 2", await page.waitFor(`document.querySelector('input[aria-label="จำนวน"]').value === "2"`));
    await page.click(byText("main button", "ใส่ตะกร้า"), "ใส่ตะกร้า");
    check("1: header cart count shows 2", await page.waitFor(`${headerCount} === "2"`), await page.eval(headerCount));
    check("1: success toast", await page.waitFor(`document.body.innerText.includes("เพิ่มลงตะกร้าแล้ว")`, 5000));

    // cross-check: cart survives a reload
    await page.reload();
    check("X cart: count still 2 after reload", await page.waitFor(`${headerCount} === "2"`));

    // ---------- Step 2 ----------
    section("Step 2: register, checkout with a new address, place order");
    await page.click(`document.querySelector('header a[href="/login"]')`, "header เข้าสู่ระบบ");
    await page.waitFor(`location.pathname === "/login"`);
    await page.click(byText("main a", "สมัครสมาชิก"), "สมัครสมาชิก link");
    check("2: /register opened", await page.waitFor(`location.pathname === "/register" && document.querySelector('input[name="confirmPassword"]')`));
    await page.settle();
    await page.type(field("name"), newUser.name);
    await page.type(field("email"), newUser.email);
    await page.type(field("password"), newUser.password);
    await page.type(field("confirmPassword"), newUser.password);
    await page.click(byText('form button[type="submit"]', "สมัครสมาชิก"), "submit register");
    check("2: registered + signed in (header shows account menu)",
      await page.waitFor(`location.pathname === "/" && document.querySelector('header [aria-label="เมนูบัญชีผู้ใช้"]')?.textContent.includes(${J(newUser.name)})`));
    await page.settle();
    const dbUser = await prisma.user.findUnique({ where: { email: newUser.email } });
    check("2: DB user created as CUSTOMER", dbUser?.role === "CUSTOMER" && dbUser.name === newUser.name, dbUser);
    check("X cart: count still 2 after register/login", (await page.eval<string>(headerCount)) === "2");

    await page.click(`document.querySelector('header a[href="/cart"]')`, "header cart");
    check("2: /cart shows the product ×2", await page.waitFor(`location.pathname === "/cart" && document.body.innerText.includes(${J(cordy.name)}) && document.querySelector('main input[type="number"]')?.value === "2"`));
    await page.click(byText("main a", "ดำเนินการสั่งซื้อ"), "ดำเนินการสั่งซื้อ");
    check("2: /checkout new-address form shown (no saved addresses)", await page.waitFor(`location.pathname === "/checkout" && document.querySelector('input[name="phone"]')`));
    await page.settle();
    check("2: logged-in checkout has no guest email field", !(await page.eval<boolean>(`Boolean(document.querySelector('input[name="email"]'))`)));
    await page.type(field("recipientName"), newAddr.recipientName);
    await page.type(field("phone"), newAddr.phone);
    await page.type(field("line"), newAddr.line);
    await page.type(field("province"), newAddr.province);
    await page.type(field("postalCode"), newAddr.postalCode);
    await page.click(byText("label", "เก็บเงินปลายทาง"), "COD");
    check("2: COD selected", await page.eval<boolean>(`document.querySelector('input[name="paymentMethod"][value="COD"]').checked`));
    const stockBefore = (await prisma.product.findUniqueOrThrow({ where: { id: cordy.id } })).stock;
    await page.click(byText('button[type="submit"]', "ยืนยันการสั่งซื้อ"), "ยืนยันการสั่งซื้อ");
    check("2: landed on /order/<orderNo>", await page.waitFor(`location.pathname.startsWith("/order/PV-") && document.querySelector('[data-testid="order-no"]')`));
    await page.settle();
    const orderNo = await page.eval<string>(`document.querySelector('[data-testid="order-no"]').textContent`);
    check("2: thank-you page orderNo matches URL", (await page.path()) === `/order/${orderNo}`, { orderNo, path: await page.path() });
    check("X cart: header count cleared after checkout", await page.waitFor(`!document.querySelector('header [data-slot="cart-count"]')`, 5000));
    check("X cart: localStorage cart emptied", (await page.eval<string>(`localStorage.getItem("purevita-cart")`)) === "[]");

    // DB verification
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNo }, include: { items: true } });
    const stockAfter = (await prisma.product.findUniqueOrThrow({ where: { id: cordy.id } })).stock;
    const snap = JSON.parse(order.addressSnapshot) as Record<string, string>;
    check("2/DB: stock decremented by 2", stockAfter === stockBefore - 2, { stockBefore, stockAfter });
    check("2/DB: order.userId = new user", order.userId === dbUser?.id, { userId: order.userId });
    check("2/DB: PENDING, COD", order.status === "PENDING" && order.paymentMethod === "COD");
    check("2/DB: item snapshot name/price/qty",
      order.items.length === 1 && order.items[0].nameSnapshot === cordy.name && order.items[0].priceSnapshot === cordy.price && order.items[0].qty === 2,
      order.items);
    const expSub = cordy.price * 2;
    check("2/DB: totals (subtotal, shipping rule, total)",
      order.subtotal === expSub && order.shippingFee === (expSub >= 800 ? 0 : 50) && order.total === order.subtotal + order.shippingFee, order);
    check("2/DB: address snapshot (phone normalised)",
      snap.recipientName === newAddr.recipientName && snap.phone === "0812345678" && snap.line === newAddr.line && snap.province === newAddr.province && snap.postalCode === newAddr.postalCode && !snap.email,
      snap);
    const savedAddr = await prisma.address.findMany({ where: { userId: dbUser!.id } });
    check("2/DB: new address saved as default (checkbox pre-checked for first address)", savedAddr.length === 1 && savedAddr[0].isDefault, savedAddr);
    check("2: thank-you page shows total + ชำระเงินปลายทาง", (await page.text()).includes(`฿${order.total.toLocaleString("en-US")}`) && (await page.text()).includes("เก็บเงินปลายทาง"));

    // ---------- Step 3 ----------
    section("Step 3: /account/orders shows the order as PENDING");
    check("3: header menu → คำสั่งซื้อของฉัน", await goMenu(page, "คำสั่งซื้อของฉัน", "/account/orders"));
    const row3 = await orderRowText(page, orderNo);
    check("3: order listed with status รอชำระเงิน", row3.includes("รอชำระเงิน"), row3);

    // ---------- Step 4 ----------
    section("Step 4: admin dashboard shows new order + sales up");
    check("4: customer logout", await logout(page));
    check("4: admin login", await login(page, "admin@purevita.test", "admin1234"));
    check("4: admin lands on /admin dashboard", (await page.path()) === "/admin");
    const after = await dashStats(page);
    check(`4: ยอดขายวันนี้ +${order.total}`, after.today - before.today === order.total, { before, after });
    check("4: 7 วัน / เดือนนี้ up by the same amount, order count +1",
      after.d7 - before.d7 === order.total && after.month - before.month === order.total && after.count === before.count + 1, { before, after });
    const firstLatest = await page.eval<string>(`document.querySelector('[data-testid="latest-orders"] tbody tr a')?.textContent`);
    check("4: new order is first in latest orders", firstLatest === orderNo, firstLatest);

    // ---------- Step 5 ----------
    section("Step 5: admin sets SHIPPED, customer sees it");
    await page.click(byText('[data-testid="latest-orders"] tbody a', orderNo), "latest order link");
    check("5: admin order detail opened", await page.waitFor(`location.pathname === "/admin/orders/${order.id}" && document.querySelector("select#status")`));
    await page.settle();
    await page.click(`document.querySelector("select#status")`, "status select");
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    // native <select> popups are not clickable in headless mode: choose the option like keyboard selection does
    await page.eval(`(() => { const s = document.querySelector("select#status"); s.value = "SHIPPED"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    await page.click(byText('form button[type="submit"]', "บันทึก"), "บันทึก status");
    let shipped = false;
    for (let i = 0; i < 50 && !shipped; i++) {
      await sleep(200);
      shipped = (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status === "SHIPPED";
    }
    check("5/DB: status SHIPPED", shipped);
    check("5: admin page badge shows จัดส่งแล้ว", await page.waitFor(`document.querySelector("main").innerText.includes("จัดส่งแล้ว")`));
    check("5: admin logout", await logout(page));
    check("5: customer login", await login(page, newUser.email, newUser.password));
    check("5: customer lands on /", (await page.path()) === "/");
    await goMenu(page, "คำสั่งซื้อของฉัน", "/account/orders");
    const row5 = await orderRowText(page, orderNo);
    check("5: list shows จัดส่งแล้ว", row5.includes("จัดส่งแล้ว") && !row5.includes("รอชำระเงิน"), row5);
    await page.click(byText("tr", orderNo) + `.map(tr => tr.querySelector("a")).filter(Boolean)`, "ดูรายละเอียด");
    check("5: detail page opened", await page.waitFor(`location.pathname === "/account/orders/${orderNo}"`));
    await page.settle();
    const detailBadge = await page.eval<string>(`document.querySelector("main h2")?.parentElement?.parentElement?.innerText ?? ""`);
    check("5: detail header badge จัดส่งแล้ว", detailBadge.includes("จัดส่งแล้ว"), detailBadge);

    // ---------- Step 6 ----------
    section("Step 6: low-stock alert → raise stock → alert gone");
    await logout(page);
    await login(page, "admin@purevita.test", "admin1234");
    const vitB = await prisma.product.findUniqueOrThrow({ where: { slug: "vitamin-b-complex" } });
    const lowSel = `document.querySelector('[data-low-stock-id=${J(vitB.id)}]')`;
    check("6: low-stock alert lists vitamin-b-complex", await page.waitFor(lowSel, 5000));
    await page.click(lowSel, "low-stock alert");
    check("6: alert → product edit page", await page.waitFor(`location.pathname === "/admin/products/${vitB.id}/edit" && document.querySelector('input[name="stock"]')`));
    await page.settle();
    await page.type(`document.querySelector('input[name="stock"]')`, "60");
    await page.click(byText('button[type="submit"]', "บันทึกการแก้ไข"), "บันทึกการแก้ไข");
    let saved = false;
    for (let i = 0; i < 50 && !saved; i++) {
      await sleep(200);
      saved = (await prisma.product.findUniqueOrThrow({ where: { id: vitB.id } })).stock === 60;
    }
    check("6/DB: stock saved = 60", saved);
    check("6: save toast shown", await page.waitFor(`document.querySelector("[data-sonner-toast]")`, 5000));
    await page.click(byText("aside a, nav a", "แดชบอร์ด"), "sidebar แดชบอร์ด");
    await page.waitFor(`location.pathname === "/admin"`);
    await page.settle();
    check("6: alert for vitamin-b-complex gone", !(await page.eval<boolean>(`Boolean(${lowSel})`)));

    // ================= cross-cutting checks =================
    section("X: admin cancel restores stock, customer sees ยกเลิก; default address preselected");
    await logout(page);
    // guest cart → login keeps it
    await page.goto(`/products/${cordy.slug}`);
    await page.click(byText("main button", "ใส่ตะกร้า"), "ใส่ตะกร้า");
    check("X cart: guest add → count 1", await page.waitFor(`${headerCount} === "1"`));
    await login(page, "customer@purevita.test", "customer1234");
    check("X cart: count kept after customer login", (await page.eval<string>(headerCount)) === "1");
    await page.click(`document.querySelector('header a[href="/cart"]')`, "header cart");
    await page.waitFor(`location.pathname === "/cart"`);
    await page.click(byText("main a", "ดำเนินการสั่งซื้อ"), "ดำเนินการสั่งซื้อ");
    await page.waitFor(`location.pathname === "/checkout" && document.querySelector('input[name="paymentMethod"]')`);
    await page.settle();
    const customer = await prisma.user.findUniqueOrThrow({ where: { email: "customer@purevita.test" }, include: { addresses: true } });
    const defAddr = customer.addresses.find((a) => a.isDefault)!;
    check("X checkout: saved default address preselected",
      await page.eval<boolean>(`document.querySelector('input[name="addressId"][value=${J(defAddr.id)}]')?.checked === true && !document.querySelector('input[name="phone"]')`));
    const stockC0 = (await prisma.product.findUniqueOrThrow({ where: { id: cordy.id } })).stock;
    await page.click(byText('button[type="submit"]', "ยืนยันการสั่งซื้อ"), "ยืนยันการสั่งซื้อ");
    await page.waitFor(`document.querySelector('[data-testid="order-no"]')`);
    const orderNo2 = await page.eval<string>(`document.querySelector('[data-testid="order-no"]').textContent`);
    const order2 = await prisma.order.findUniqueOrThrow({ where: { orderNo: orderNo2 } });
    check("X checkout: order via saved address has userId + address snapshot",
      order2.userId === customer.id && JSON.parse(order2.addressSnapshot).phone === defAddr.phone, order2);
    check("X stock: -1 after order", (await prisma.product.findUniqueOrThrow({ where: { id: cordy.id } })).stock === stockC0 - 1);

    const admin = await openIsolatedTab("admin");
    await admin.goto("/");
    check("X admin window: login", await login(admin, "admin@purevita.test", "admin1234"));
    await admin.click(byText("aside a", "คำสั่งซื้อ"), "sidebar คำสั่งซื้อ");
    await admin.waitFor(`location.pathname === "/admin/orders"`);
    await admin.settle();
    await admin.click(byText("main a", orderNo2), "order link");
    await admin.waitFor(`location.pathname === "/admin/orders/${order2.id}"`);
    await admin.settle();
    await admin.click(byText("main button", "ยกเลิกคำสั่งซื้อ"), "ยกเลิกคำสั่งซื้อ");
    await admin.click(byText('[role="alertdialog"] button', "ยืนยันยกเลิก"), "ยืนยันยกเลิก");
    check("X cancel: admin page shows ยกเลิก", await admin.waitFor(`document.querySelector("main").innerText.includes("ยกเลิก") && !document.querySelector("select#status")`));
    const o2 = await prisma.order.findUniqueOrThrow({ where: { id: order2.id } });
    check("X cancel/DB: CANCELLED + stock restored", o2.status === "CANCELLED" && (await prisma.product.findUniqueOrThrow({ where: { id: cordy.id } })).stock === stockC0);
    await goMenu(page, "คำสั่งซื้อของฉัน", "/account/orders");
    check("X cancel: customer list shows ยกเลิก", (await orderRowText(page, orderNo2)).includes("ยกเลิก"));

    section("X: product soft-deleted while in a cart → graceful Thai error");
    const lingzhi = await prisma.product.findUniqueOrThrow({ where: { slug: "cordyceps-lingzhi" } });
    for (const slug of [lingzhi.slug, cordy.slug]) {
      await page.goto(`/products/${slug}`);
      await page.click(byText("main button", "ใส่ตะกร้า"), "ใส่ตะกร้า");
      await sleep(300);
    }
    check("X softdel: cart has 2 items", await page.waitFor(`${headerCount} === "2"`));
    await page.click(`document.querySelector('header a[href="/cart"]')`, "cart");
    await page.click(byText("main a", "ดำเนินการสั่งซื้อ"), "ดำเนินการสั่งซื้อ");
    await page.waitFor(`location.pathname === "/checkout" && document.querySelector('input[name="paymentMethod"]')`);
    await page.settle();
    // admin soft-deletes lingzhi while the customer sits on /checkout
    await admin.goto(`/admin/products/${lingzhi.id}/edit`);
    await admin.click(byText("main button", "ลบสินค้า (ปิดการขาย)"), "ลบสินค้า");
    await admin.click(byText('[role="alertdialog"] button', "ยืนยัน"), "ยืนยัน soft delete");
    let inactive = false;
    for (let i = 0; i < 50 && !inactive; i++) {
      await sleep(200);
      inactive = !(await prisma.product.findUniqueOrThrow({ where: { id: lingzhi.id } })).isActive;
    }
    check("X softdel/DB: product isActive=false", inactive);
    const ordersBefore = await prisma.order.count();
    page.orderResponses = [];
    await page.click(byText('button[type="submit"]', "ยืนยันการสั่งซื้อ"), "ยืนยันการสั่งซื้อ");
    check("X softdel: Thai alert names the product", await page.waitFor(`document.querySelector('[role="alert"]')?.innerText.includes(${J(lingzhi.name)})`));
    const alertText = await page.eval<string>(`document.querySelector('[role="alert"]')?.innerText`);
    check("X softdel: API answered 409 (not 500)", page.orderResponses[0] === 409, page.orderResponses);
    check("X softdel: still on /checkout, product removed from cart, count 1",
      (await page.path()) === "/checkout" && (await page.eval<string>(headerCount)) === "1", { alertText, count: await page.eval(headerCount) });
    check("X softdel/DB: no order created", (await prisma.order.count()) === ordersBefore);
    check("X softdel: storefront product page 404", (await fetch(`${BASE}/products/${lingzhi.slug}`)).status === 404);
    // the remaining item can still be ordered
    await page.click(byText('button[type="submit"]', "ยืนยันการสั่งซื้อ"), "ยืนยันการสั่งซื้อ (retry)");
    check("X softdel: retry with remaining item succeeds", await page.waitFor(`document.querySelector('[data-testid="order-no"]')`));
    // only the soft-deleted item in a stale cart: /checkout sync drops it → back to /cart with a toast
    await page.goto("/");
    await page.eval(`localStorage.setItem("purevita-cart", ${J(J([{ productId: lingzhi.id, slug: lingzhi.slug, name: lingzhi.name, price: lingzhi.price, imageUrl: lingzhi.imageUrl, stock: lingzhi.stock, qty: 1 }]))})`);
    await page.goto("/checkout");
    check("X softdel: stale-only cart → /cart, removed toast",
      await page.waitFor(`location.pathname === "/cart" && document.body.innerText.includes("ไม่มีจำหน่ายแล้ว")`), await page.text().then((t) => t.slice(0, 300)));
    await admin.goto(`/admin/products/${lingzhi.id}/edit`);
    await admin.click(byText("main button", "เปิดขายอีกครั้ง"), "เปิดขายอีกครั้ง");
    await sleep(1000);

    section("X: stale session after db:seed");
    // put something in the cart, then re-seed underneath both logged-in browsers
    await page.goto(`/products/${cordy.slug}`);
    await page.click(byText("main button", "ใส่ตะกร้า"), "ใส่ตะกร้า");
    execSync("npm run db:seed", { stdio: "ignore", cwd: join(__dirname, "..") });
    for (const p of ["/", "/products", `/products/${cordy.slug}`, "/cart", "/checkout", "/account", "/account/orders", "/account/addresses", "/login"]) {
      await page.goto(p);
      const st = page.docStatus;
      const okPage = st < 500 && (await noErrorPage(page));
      check(`X stale: customer ${p} → ${st} ${await page.path()}`, okPage && st !== 404, { st, path: await page.path() });
    }
    check("X stale: /login shows the login form", (await page.path()).startsWith("/login") && (await page.eval<boolean>(`Boolean(document.querySelector('input[name="password"]'))`)));
    check("X stale: header no longer shows the stale account", !(await page.eval<boolean>(`Boolean(document.querySelector('header [aria-label="เมนูบัญชีผู้ใช้"]'))`)));
    check("X stale: re-login works", await login(page, "customer@purevita.test", "customer1234"));
    // re-seeding gives products new ids, so the old cart lines were dropped by the cart sync (→ empty cart, no crash)
    await page.goto(`/products/${cordy.slug}`);
    await page.click(byText("main button", "ใส่ตะกร้า"), "ใส่ตะกร้า");
    await page.click(`document.querySelector('header a[href="/cart"]')`, "cart");
    await page.click(byText("main a", "ดำเนินการสั่งซื้อ"), "ดำเนินการสั่งซื้อ");
    check("X stale: after re-login checkout works with the fresh default address preselected",
      await page.waitFor(`location.pathname === "/checkout" && document.querySelector('input[name="addressId"]:checked')`));
    for (const p of ["/admin", "/admin/orders", "/admin/products"]) {
      await admin.goto(p);
      check(`X stale: admin ${p} → ${admin.docStatus} ${await admin.path()}`, admin.docStatus < 500 && (await noErrorPage(admin)), admin.docStatus);
    }

    const ex = tabs.flatMap((t) => t.exceptions.map((e) => `${t.name}: ${e}`));
    check("no uncaught page exceptions in any tab", ex.length === 0, ex);
    for (const t of tabs) t.close();
  } finally {
    browser.kill();
    await prisma.$disconnect();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  console.log(`\n${pass} passed, ${fail} failed (aborted)`);
  process.exit(1);
});
