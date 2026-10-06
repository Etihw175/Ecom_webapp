# PureVita Shop · เพียววิต้า

ร้านค้าออนไลน์ภาษาไทยสำหรับ **วิตามิน อาหารเสริม ถั่งเช่า และเครื่องกรองน้ำ** — ระบบ e-commerce ครบวงจร
ตั้งแต่หน้าร้าน ตะกร้า ชำระเงิน (จำลอง) บัญชีลูกค้า ไปจนถึงหลังร้านสำหรับจัดการสินค้า คำสั่งซื้อ และแดชบอร์ดยอดขาย

A Thai-language e-commerce demo: storefront, cart & checkout, customer accounts, and an admin back office
(inventory, orders, sales dashboard). Prices are in THB; payment is mocked (bank transfer / cash on delivery).

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components, Server Actions) + React 19 + TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), lucide-react, sonner toasts, IBM Plex Sans Thai |
| Data | Prisma 6 + SQLite (`prisma/dev.db`) |
| Auth | next-auth v4 (Credentials + bcryptjs, JWT sessions, roles `CUSTOMER` / `ADMIN`) |
| Validation | zod v4 (schemas shared between forms and API) |
| Charts | recharts |

## Setup

Requires Node.js 20+.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
npx prisma migrate dev      # creates prisma/dev.db and applies migrations
npm run db:seed             # 4 categories, 14 products, 2 users, 15 sample orders
npm run dev                 # http://localhost:3000
```

Production build: `npm run build && npm run start`.

**Fresh demo:** `npm run db:reset` drops the database, re-applies migrations and re-seeds
(`npm run db:seed` alone also wipes and reseeds all tables). After reseeding, log in again —
user ids change, so old sessions no longer match a user.

## Test accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@purevita.test` | `admin1234` |
| Customer | `customer@purevita.test` | `customer1234` |

Seed facts useful for demos: search `ถั่งเช่า` finds 3 products; `calcium-magnesium-zinc` is out of stock;
`vitamin-b-complex` (3/10) and `lutein-zeaxanthin` (5/5) trigger low-stock alerts.

## Features (mapped to the 6 lab features)

1. **Foundation** — Prisma schema (User, Address, Category, Product, Order, OrderItem), seed data, brand theme,
   responsive header (search, cart badge, account menu, mobile Sheet menu) and footer.
2. **Product catalog** — home (hero, best sellers, categories); `/products` with category filter, search in name +
   description, price sort, pagination, empty state; `/products/[slug]` with stock status, benefits, qty selector;
   "สินค้าหมด" badge + disabled button at stock 0.
3. **Cart & checkout** — cart in React context + localStorage (synced with server prices/stock); `/cart` with qty,
   remove, shipping (free from ฿800, otherwise ฿50); `/checkout` with saved-address picker or new address, bank
   transfer / COD; `POST /api/orders` validates and, in **one transaction**, checks stock for every line, creates the
   order + items (name/price snapshots), decrements stock (race-safe); thank-you page `/order/[orderNo]`.
4. **Customer accounts** — register / login / logout; middleware guards `/account/*` and `/admin/*` by role;
   profile (name, password); order history + detail with status timeline; address book CRUD + default address.
5. **Admin inventory & orders** — `/admin/products` table with search/filters, add/edit/soft-delete, image upload to
   `/public/uploads`, stock + low-stock threshold; `/admin/orders` filter by status + date range; order detail,
   change status, cancel → stock restored automatically (exactly once).
6. **Dashboard & polish** — `/admin` dashboard (Asia/Bangkok dates, cancelled orders excluded): sales today / 7 days /
   this month, order count with pending count, average order value, 14-day revenue chart, top 5 products, low-stock
   alerts linking to the edit page, latest 10 orders. Always rendered from the live DB. Thai 404 page, error boundary
   with retry, loading skeletons, empty states, mobile layout checked at 375px, `lang="th"` + title template.

## Demo script

1. Search **"ถั่งเช่า"**, open a product, add **2** to the cart.
2. Register a new user, check out, note the order number.
3. `/account/orders` shows the order as **รอชำระเงิน (PENDING)**.
4. Log in as admin → `/admin`: sales are up and the new order is at the top of "คำสั่งซื้อล่าสุด".
5. Open the order, change the status to **SHIPPED** → the customer sees the updated status.
6. On the dashboard, open a low-stock alert (e.g. วิตามินบีรวม B-Complex), raise its stock, save → the alert disappears.

## Test scripts

Run against a running server (`npm run dev` or `npm run start`). They change the database — run
`npm run db:seed` before and after.

```bash
npx tsx scripts/test-checkout.ts [baseUrl]                  # POST /api/orders API: validation, stock, concurrency, auth (43 checks)
npx tsx scripts/e2e-checkout.ts [baseUrl] [browserPath]     # checkout UI in headless Edge/Chrome over CDP (19 checks)
npx tsx scripts/e2e-admin-dashboard.ts [baseUrl] [browser]  # 375px responsive sweep + dashboard/low-stock flow (45 checks)
```

`browserPath` defaults to Microsoft Edge on Windows; pass a Chrome/Chromium path elsewhere.
Other scripts: `npm run lint`, `npm run typecheck`, `npm run images` (regenerate product SVGs).
