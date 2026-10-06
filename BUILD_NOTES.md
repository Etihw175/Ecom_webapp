# PureVita Shop — shared build notes for all agents

Source plan: `purevita-shop-plan.pdf` (Thai). This file is the English summary + fixed conventions.
Every agent: read this file first, then append a short "Phase N done" section at the bottom
(what you built, file paths, anything the next phase must know).

## Fixed conventions (do not change)
- App dir: `C:\Users\informatics\Desktop\webapp\purevita-shop`
- Next.js 15 App Router + TypeScript, `src/` dir, import alias `@/*`
- Tailwind CSS (whatever version create-next-app@15 installs) + shadcn/ui components in `src/components/ui`
- Prisma **v6** (`prisma@6`, `@prisma/client@6`) + SQLite (`prisma/dev.db`). Prisma client singleton at `src/lib/prisma.ts`
- Auth: **next-auth v4** Credentials provider + bcryptjs, JWT sessions, `role` ("CUSTOMER" | "ADMIN") and `id` on session.user. Config in `src/lib/auth.ts`
- Validation: zod
- Charts: recharts (installed in phase 1)
- UI language: **Thai**. Currency: THB, format `฿1,234` via `src/lib/format.ts`
- Brand colors: navy #06345E, blue #0B6FB8, sky #7FD8F5, green #17A45F, orange #E88A2B
- Shipping: free when subtotal >= 800 THB, otherwise 50 THB
- Payment: mock only — `TRANSFER` (bank transfer) or `COD` (cash on delivery)
- Order status flow: PENDING > PAID > PACKING > SHIPPED > DELIVERED, or CANCELLED
- Order stores snapshots: nameSnapshot, priceSnapshot on OrderItem; addressSnapshot (JSON string) on Order
- Seed accounts: admin `admin@purevita.test` / `admin1234`; customer `customer@purevita.test` / `customer1234`
- Only ONE agent at a time runs `npm install` or `next build`. Parallel phases verify with `npx tsc --noEmit` and `npm run lint` only.

## Data model
- User: email, passwordHash, name, role
- Address: userId, recipientName, phone, line (address), province, postalCode, isDefault
- Category: name, slug
- Product: name, slug, description, price, imageUrl, stock, lowStockThreshold, categoryId, isActive
- Order: orderNo, userId (nullable), status, subtotal, shippingFee, total, paymentMethod, addressSnapshot, createdAt
- OrderItem: orderId, productId, nameSnapshot, priceSnapshot, qty

## Phases (2h each in the plan)
1. Foundation: create app, install deps, schema + migrate, seed (4 categories, 12–16 products: vitamins, cordyceps (ถั่งเช่า), water filters; 1 admin, 1 customer), brand colors, header (logo, search, cart, account) + footer
2. Product Catalog: home (hero, best sellers, category cards); /products (category filter, search name+description, sort by price, pagination); /products/[slug] (image, price, benefits, stock status, add-to-cart); "สินค้าหมด" badge + disabled button when stock 0
3. Cart & Checkout: cart in React context + localStorage; /cart (qty, remove, totals, shipping); /checkout (address form, pick saved address if logged in, payment method); POST /api/orders in ONE transaction: check stock every line > create Order+OrderItems > decrement stock > clear cart; /order/[orderNo] thank-you page
4. Customer Accounts: /register /login /logout; middleware protecting /account/* and /admin/* by role; /account profile (edit name, change password); /account/orders history + detail + status; /account/addresses CRUD + set default; checkout stores userId when logged in
5. Admin inventory + orders: /admin layout with sidebar; /admin/products table, search, add/edit/soft-delete (isActive), image upload to /public/uploads; stock + lowStockThreshold in same form; /admin/orders filter by status + date range; /admin/orders/[id] detail, change status, cancel → restock automatically
6. Dashboard + polish: cards (sales today / 7 days / this month, order count, avg order value); 14-day revenue chart (recharts) + top 5 products; low-stock alerts (stock <= lowStockThreshold) linking to edit; latest 10 orders; responsive mobile, empty states, 404 page, README (run steps + test accounts), seed reset script

## Demo script (must work end to end)
1. Search "ถั่งเช่า", open product, add 2 to cart
2. Register new user, checkout, get order number
3. /account/orders shows order PENDING
4. Login as admin — dashboard sales up, new order visible
5. Change status to SHIPPED, customer sees updated status
6. Show low-stock alert, edit stock, alert disappears

---
# Phase log

## Phase 1 done
**Stack as installed:** Next 15.5.27, React 19.1, Tailwind v4 (CSS-first, no tailwind.config), Prisma 6.19, next-auth 4.24, zod **v4**, recharts 3, bcryptjs 3, lucide-react icons.

**IMPORTANT — shadcn style is `base-nova` (Base UI, `@base-ui/react`), NOT Radix.**
- There is no `asChild`. Use the `render` prop instead, e.g. `<SheetTrigger render={<Button variant="ghost" />}>…</SheetTrigger>`, `<DialogTrigger render={<Button />}>`.
- For a link styled as a button: `<Link className={buttonVariants({ variant: "outline" })}>` (import `buttonVariants` from `@/components/ui/button`).
- Button sizes: default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg. `cn` comes from `@/lib/utils` (re-exports shadcn's `cn` npm package).
- UI components present: button input label card badge table select textarea dialog dropdown-menu sheet separator tabs skeleton sonner. Add more with `npx shadcn@latest add <name> -y`.

**Files**
- `prisma/schema.prisma` — User, Address, Category, Product, Order, OrderItem (cuid String ids; role/status/paymentMethod are Strings; prices Int baht; `Order.userId` nullable with onDelete SetNull; Address/OrderItem cascade on parent delete). Migration `prisma/migrations/*_init`. DB `prisma/dev.db`.
- `prisma/seed-data.ts` (categories + 14 products), `prisma/seed.ts` (wipes + reseeds; 2 users, customer default address, 15 orders over last 14 days for the customer, statuses mixed; latest is PENDING).
- `scripts/generate-product-images.ts` → `public/products/<slug>.svg` (product imageUrl = `/products/<slug>.svg`).
- `src/lib/prisma.ts` (`prisma` singleton), `src/lib/format.ts` (`formatTHB`, `formatDate(date, withTime?)`, `formatDateTime`; Thai Buddhist calendar, Asia/Bangkok), `src/lib/order-no.ts` (`generateOrderNo()` → `PV-YYMMDD-XXXX`; use it in POST /api/orders and retry on unique collision), `src/lib/constants.ts` (`FREE_SHIPPING_MIN`, `SHIPPING_FEE`, `calcShipping(subtotal)`, `ORDER_STATUS_VALUES`, `ORDER_STATUSES[status].{label,badgeClass}`, `getStatusMeta()`, `PAYMENT_METHOD_VALUES`, `PAYMENT_METHODS[m].{label,description}`, `getPaymentLabel()`, `ROLES`, `NAV_CATEGORIES`, `SITE_NAME`).
- `src/app/globals.css` — brand colors as Tailwind utilities: `bg-brand-navy|blue|sky|green|orange` (also text-/border-…); shadcn `--primary` = brand blue; chart-1..5 = brand colors. Font: IBM Plex Sans Thai via next/font (`--font-plex-thai`, applied as `font-sans`).
- Layout: `src/app/layout.tsx` (lang="th", Header, `<main>`, Footer, sonner `<Toaster>` — use `import { toast } from "sonner"`).
- `src/components/layout/`: `Header` (server; prop `user?: HeaderUser`), `MobileNav` (client, Sheet), `SearchBox` (GET form → `/products?q=`), `CartLink` (client; **Phase 3: edit `useCartCount()` in `cart-link.tsx` to return the cart context count**, and wrap layout body in `<CartProvider>`), `AccountLink` (→ /login when no user, /account + /admin link for ADMIN), `Footer`, `Logo`, `types.ts` (`HeaderUser`). **Phase 4:** in layout, `const session = await getServerSession(authOptions)` and pass `user={session?.user ?? null}` to `<Header>`.
- Home page `src/app/page.tsx` is a placeholder (hero + perks + category links) — Phase 2 replaces it.
- `.env` / `.env.example`: `DATABASE_URL="file:./dev.db"`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (dev value).

**Seed facts for demo:** category slugs `vitamins`, `supplements`, `cordyceps`, `water-filters`. Out of stock: `calcium-magnesium-zinc` (stock 0). Low stock: `vitamin-b-complex` (3/10), `lutein-zeaxanthin` (5/5). Cordyceps products: `cordyceps-tibet-premium`, `cordyceps-lingzhi`, `cordyceps-drink` (names contain "ถั่งเช่า").

**Scripts** (in `purevita-shop/`): `npm run dev | build | start | lint | typecheck`, `npm run db:migrate`, `npm run db:seed` (prisma db seed → `tsx prisma/seed.ts`), `npm run db:reset` (`prisma migrate reset --force`, re-seeds), `npm run images` (regenerate SVGs). `postinstall` runs `prisma generate`.

**Verified:** `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass; `next start` smoke test served `/` and `/products/*.svg` (server stopped).

**Deviations / notes:**
- `npm run db:reset` is refused by Prisma when invoked by an AI agent (Prisma's AI-safety consent guard). Agents should use `npm run db:seed` instead (seed wipes all tables itself); humans can run db:reset normally.
- `package.json#prisma.seed` prints a deprecation notice in Prisma 6.19 (prisma.config.ts preferred) but works.
- Header nav categories are static (`NAV_CATEGORIES`) to keep the layout static; keep in sync with seeded slugs.

## Phase 4 done
**Auth** (`src/lib/auth.ts`): `authOptions` (Credentials + bcrypt, JWT, `pages.signIn = "/login"`), plus server helpers:
- `getSession()` = `getServerSession(authOptions)`; `getCurrentUser()` → `session.user | null`
- `requireUser(callbackUrl?)` → user or `redirect("/login?callbackUrl=…")`; `requireAdmin()` → anon → /login, non-admin → `/`
- `session.user` = `{ id, name, email, role }` (typed via `src/types/next-auth.d.ts`; `role: Role` from constants). JWT `update()` trigger reloads name/role from DB.
- Route: `src/app/api/auth/[...nextauth]/route.ts`. Middleware `src/middleware.ts` (getToken): `/account/*` needs login, `/admin/*` needs ADMIN (anon → `/login?callbackUrl=…`, customer → `/`). Admin layout should still call `requireAdmin()` (defence in depth).
- Root layout: wrapped in `<SessionProvider session>` (`src/components/providers/session-provider.tsx`) and passes `user={session?.user ?? null}` to `<Header>` (root layout is now dynamic). `useSession()` works in client components.

**Checkout (Phase 3)**: in POST /api/orders (or server component) do `const session = await getServerSession(authOptions)` (or `getSession()`), set `userId: session?.user?.id ?? null`. Saved addresses: `getUserAddresses(userId)` from `src/lib/addresses.ts` (default first). Also exported: `getDefaultAddress(userId)`, `parseAddressSnapshot(json)`, type `AddressSnapshot`. Address zod schema: `addressSchema` in `src/lib/validations/address.ts` (phone 10 digits starting 0, strips spaces/dashes; postal 5 digits) — reuse for the checkout address form.

**Pages**: `/login` (client signIn, Thai error, `callbackUrl` (relative only, `src/lib/safe-callback.ts`), admin default → /admin, others → /), `/register` (server action `registerUser` + auto sign-in → callbackUrl or /) in `src/app/(auth)/`. `/account` layout with `AccountNav` (sidebar desktop, horizontal scroll tabs mobile) incl. logout; `/account` (edit name, change password), `/account/orders` (+ `[orderNo]` detail: items snapshots, timeline, totals, payment, address; 404 if not owner), `/account/addresses` (CRUD + set default via server actions in `src/app/account/addresses/actions.ts`; first address auto-default; deleting default promotes newest). Order checkout links: send users to `/account/orders/<orderNo>` for history.

**Reusable components** (`src/components/account/`): `OrderStatusBadge` (status → Thai label/badge class; Phase 5 can reuse), `FormField`/`FormAlert`, `LogoutButton`, `AccountNav`. Validation schemas in `src/lib/validations/auth.ts` (`ActionState` type for server actions).

**AccountLink** is now a client component: logged-in users get a dropdown (name, หลังร้าน for ADMIN, โปรไฟล์, คำสั่งซื้อของฉัน, ที่อยู่จัดส่ง, ออกจากระบบ). MobileNav got an ออกจากระบบ button.

**Verified**: tsc + lint pass; dev server smoke test (port 3104): middleware redirects, credentials login 200 / wrong pw 401, session has id+role, account pages 200, other user's order 404, customer → /admin redirected to /.

## Phase 2 done
**Pages**
- `src/app/page.tsx` — hero (navy→blue gradient, CTA → /products), perks, category cards (from DB, with active-product counts, → `/products?category=slug`), best sellers (`getBestSellers(8)`: sum of OrderItem.qty over non-CANCELLED orders, padded with newest). `dynamic = "force-dynamic"`.
- `src/app/products/page.tsx` — searchParams `category` (slug), `q` (name OR description `contains`), `sort` (`newest`|`price_asc`|`price_desc`), `page` (12/page, clamped). Only `isActive`. Category chips (mobile, horizontal scroll) / sidebar (desktop), result count, "ล้างคำค้นหา", sort Select, pagination, empty state "ไม่พบสินค้า". generateMetadata.
- `src/app/products/[slug]/page.tsx` — image, category, name, price, stock status (มีสินค้า / เหลือน้อย / สินค้าหมด), intro + "สรรพคุณ" bullets (parsed from description), qty selector + add-to-cart, related products. `notFound()` when missing or `isActive=false`. generateMetadata (uses React `cache`).

**Components / libs**
- `src/components/product/product-card.tsx` — `ProductCard` (image, category link, name, price, "สินค้าหมด" badge + greyed image when stock 0, "เหลือ N ชิ้น" when stock <= lowStockThreshold) and `ProductGrid` (2 → 3 → 4 cols). Expects `ProductCardData` (select with `productCardSelect`).
- `src/components/product/add-to-cart-button.tsx` (client) — props `{ product: {id, slug, name, price, imageUrl, stock}, qty?, size?, className?, onAdded? }`. Calls `useCart().addItem`, sonner toast (success w/ "ดูตะกร้า" action; warning when capped by stock). Disabled + "สินค้าหมด" when stock 0, "ครบจำนวนในสต็อก" when cart qty already = stock.
- `src/components/product/purchase-panel.tsx` (client) — −/input/+ qty selector (1..stock) + AddToCartButton.
- `src/components/product/sort-select.tsx` (client) — shadcn/Base UI Select, pushes `?sort=` and resets page.
- `src/lib/products.ts` (server; imports prisma) — `PRODUCTS_PER_PAGE`, `PRODUCT_SORT_ORDER_BY`, `getStockStatus(stock, threshold)` → `in_stock|low_stock|out_of_stock`, `STOCK_STATUS_META[status].{label,className}`, `productCardSelect`, `ProductCardData`, `parseDescription()`, `getBestSellers()`, `isUnoptimizedImage(src)` (true for .svg/data: — pass as `unoptimized` to next/image; uploaded png/jpg get optimized).
- `src/lib/product-sorts.ts` (client-safe) — `PRODUCT_SORT_OPTIONS`, `parseSort`, `ProductSort`.

**Cart (Phase 3: extend, don't replace)** — `src/components/cart/cart-context.tsx`
- `<CartProvider>` wraps Header/main/Footer in `src/app/layout.tsx` (inside Phase 4's `<SessionProvider>`). `CartLink` now uses `useCartCount()` from it.
- Store: module-level external store + `useSyncExternalStore`, persisted to localStorage key `"purevita-cart"`, cross-tab sync via `storage` event. Server/hydration snapshot is always `[]` → no hydration mismatch; `hydrated` flag becomes true after mount (use it to avoid flashing an empty /cart).
- `CartItem = { productId, slug, name, price, imageUrl, stock, qty }`.
- `useCart()` → `{ items, count, subtotal, hydrated, addItem(product: Omit<CartItem,"qty">, qty=1) → {added, qty, capped}, updateQty(productId, qty) (clamped to 0..stock; 0 removes), removeItem(productId), clear(), replaceItems(items) }`. Also exported: `useCartCount()`, `CART_STORAGE_KEY`, types `CartItem`, `CartProductInput`, `AddItemResult`, `CartContextValue`.
- addItem refreshes the stored name/price/stock snapshot from the latest product data and caps qty at stock. Server must still re-check stock/prices in POST /api/orders (use `replaceItems` to sync the cart with fresh server data if desired).

**Verified:** `npx tsc --noEmit` + `npm run lint` clean. Dev smoke test on :3102: `/`, `/products` (14), `?category=cordyceps` (3), `?q=ถั่งเช่า` (3), `?q=zzzz` (ไม่พบสินค้า), `?sort=price_asc&page=2`, detail pages for in-stock / low-stock / out-of-stock all 200; `/products/nope` 404.
- Note: two dev servers sharing `.next` (parallel agents) can clobber each other's compiled pages (ENOENT …page.js) — restart the dev server if that appears.

## Phase 3 done
**Pages**
- `/cart` (`src/app/cart/page.tsx` → client `src/components/cart/cart-view.tsx`): skeleton until `hydrated`; lines (image, name link, unit price, `QtyStepper` −/input/+ capped at stock, line total, remove); `CartTotals` (subtotal, shipping, "ซื้อเพิ่มอีก ฿X เพื่อส่งฟรี" / "คุณได้รับสิทธิ์ส่งฟรี", total); checkout button; empty state → /products.
- `/checkout` (`src/app/checkout/page.tsx` server: session user + `getUserAddresses()`; treats a JWT whose user row no longer exists as guest) → client `src/components/checkout/checkout-form.tsx`: saved-address radio cards (default preselected) + "ใช้ที่อยู่ใหม่"; new-address form (addressSchema fields) + "บันทึกที่อยู่นี้ไว้ใช้ครั้งต่อไป" (logged-in only; pre-checked when the user has no addresses); guest contact email; TRANSFER/COD radio (TRANSFER shows `BankDetails` mock account); order summary. Empty cart → `router.replace("/cart")`. Validates with the **same** `createOrderSchema` before fetch, then maps API errors to fields / an alert in Thai. On 201: `router.push('/order/<orderNo>')` then `clear()`.
- `/order/[orderNo]` (`src/app/order/[orderNo]/page.tsx`): thank-you page (items w/ snapshots, totals, status badge, payment + bank details while TRANSFER & PENDING, address, guest email). Access: owner, ADMIN, or guest whose signed cookie lists the orderNo — otherwise `notFound()`. Owner gets a "ติดตามคำสั่งซื้อ" link to `/account/orders/<orderNo>`.

**Cart context additions** (`src/components/cart/cart-context.tsx`, API unchanged otherwise): `setStock(productId, stock) → qty` (caps qty, 0 removes), `syncProducts(CartSyncInput[]) → CartSyncChange[]` (refresh name/price/stock, drop inactive/missing/0-stock). Hook `useCartSync()` (`src/components/cart/use-cart-sync.ts`) runs once after hydration on /cart and /checkout (POST /api/cart/sync) and toasts any changes.

**API contract**
- `POST /api/orders` (`src/app/api/orders/route.ts`, logic in `src/lib/orders.ts` `placeOrder()`), schema `createOrderSchema` in `src/lib/validations/order.ts` (client-safe, shared with the form; unknown keys like `price`/`total`/`status`/`userId` are stripped):
  `{ items: [{ productId: string, qty: int 1..99 }] (1..50, unique productIds), address?: {recipientName, phone, line, province, postalCode} | addressId?: string (exactly one), paymentMethod: "TRANSFER"|"COD", saveAddress?: boolean, email?: string (required for guests) }`
  - `201 { orderNo }` (+ guest only: httpOnly cookie `pv_guest_orders`, 2h, HMAC-signed entries, last 5 orders — `src/lib/guest-orders.ts`)
  - `400 { code:"VALIDATION", error, fieldErrors }` — fieldErrors keyed by dotted path: `address.phone`, `items.0.qty`, `paymentMethod`, `email`, `address`, `addressId` (foreign/unknown addressId → `code:"ADDRESS_NOT_FOUND"`)
  - `401 { code:"UNAUTHORIZED", error }` — addressId without a (valid) session
  - `409 { code:"OUT_OF_STOCK"|"UNAVAILABLE", error, productId, productName, available }` — UI calls `setStock(productId, available)` and shows which item is short
  - `503 { code:"BUSY" }` (transaction wait timeout), `500 { code:"SERVER" }`
  - One `prisma.$transaction` (maxWait 15s, timeout 20s): address resolve (+ optional save) → load products → per line `updateMany({where:{id,isActive:true,stock:{gte:qty}}, data:{stock:{decrement}}})`, count 0 → throw 409 → order + items with name/price snapshots, totals via `calcShipping`. orderNo P2002 collision → whole tx retried (max 5). Guest email stored inside `addressSnapshot` JSON as `email` (no schema change). `revalidatePath("/", "layout")` on success.
- `POST /api/cart/sync` `{ productIds: string[] }` → `{ products: [{productId, slug, name, price, imageUrl, stock, isActive}] }`.
- Mock bank account: `src/lib/payment.ts` (`BANK_ACCOUNT`), component `src/components/checkout/bank-details.tsx`.

**Runtime tests** (dev server :3103, real SQLite DB; re-seeded afterwards with `npm run db:seed`)
- `npx tsx scripts/test-checkout.ts [baseUrl]` — API, **43/43 pass**: (a) guest order 201, stock −2, order PENDING/userId null, server totals, OrderItem name/price snapshots, phone normalised, guest cookie httpOnly; /order page 200 with cookie, 404 without / with forged cookie, 200 for admin. (b) credentials login (cookie jar) + addressId → userId set, snapshot from saved address, order listed in /account/orders HTML, owner 200 / anon 404; new address + saveAddress creates Address; foreign addressId 400; addressId w/o session 401. (c) qty>stock → 409 {productId, available}, stock & order count unchanged; multi-line with 2nd line short → 1st line rolled back; stock-0 / unknown product → 409 available 0. (d) 10 concurrent requests, stock 3 → exactly 3×201 + 7×409, stock 0, 3 orders, unique orderNos. (e) invalid JSON / empty items / bad phone+postal (Thai messages) / bad paymentMethod / qty 0 & 1.5 / no address / duplicate productId / guest w/o email → 400 with fieldErrors. (f) body with price:1, total:1, status:"PAID", userId → ignored (DB price, PENDING, userId null).
- `npx tsx scripts/e2e-checkout.ts [baseUrl] [browserPath]` — real headless Edge over CDP (no deps), **19/19 pass**: /cart hydrates + sync fixes stale localStorage price; checkout empty submit shows Thai field errors (no request); stock lowered in DB behind the user → 409 → alert "… เหลือเพียง 2 ชิ้น", cart qty+stock set to 2, still on /checkout; resubmit → /order/PV-…, cart cleared, DB order matches UI; empty cart /checkout → /cart; logged-in customer: default saved address preselected, no email field, order has userId + TRANSFER bank details.
- Note: with another agent editing files, Next dev HMR occasionally forces a full page reload / clobbers `.next` (500 "reading 'call'", ENOENT) mid-E2E; restart the dev server and rerun. Final runs above were clean.

## Phase 5 done
**Guarding:** `src/app/admin/layout.tsx` calls `requireAdmin()`; every admin page and every server action calls `requireAdmin()` again; the upload route handler uses `getAdminOrNull()` and returns 403 JSON (`/api/admin/*` is NOT covered by middleware).

**Pages** (`src/app/admin/`)
- `layout.tsx`: sidebar on desktop (`AdminSidebar`), Sheet on mobile (`AdminMobileNav`), both in `src/components/admin/admin-nav.tsx`. Links: แดชบอร์ด `/admin`, สินค้า, คำสั่งซื้อ, กลับหน้าร้าน.
- `page.tsx`: placeholder "แดชบอร์ด". **Phase 6 replaces this file only.**
- `products/page.tsx`: table (thumb, name+slug, category, price, stock with amber row + icon when `stock <= lowStockThreshold`, active badge, edit link). GET filters `?q=` (name contains) and `?status=all|active|inactive`. Rows carry `data-low-stock="true"`.
- `products/new/page.tsx`, `products/[id]/edit/page.tsx` share `ProductForm` (`src/components/admin/product-form.tsx`, controlled inputs so values survive validation errors). Edit page has `ProductActiveToggle` (soft delete = isActive false, in-page confirm; restore button) and shows "เพิ่มสินค้าเรียบร้อยแล้ว" when `?created=1`. **Phase 6 low-stock alerts should link to `/admin/products/<id>/edit`.**
- `orders/page.tsx`: all orders newest first, 20/page, `?status=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=` (dates are Asia/Bangkok days; invalid values ignored; from>to swapped). Guests show "ผู้เยี่ยมชม".
- `orders/[id]/page.tsx` (by Order.id, not orderNo): items (links to product edit, shows current stock), customer, address snapshot, totals, payment; `OrderStatusForm` + `CancelOrderButton` (in-page confirm).
- Server actions: `src/app/admin/products/actions.ts` → `saveProductAction(productId|null, prev, formData)` (create redirects to `/admin/products/<id>/edit?created=1`; update returns ActionState), `setProductActiveAction(id, isActive)`. `src/app/admin/orders/actions.ts` → `changeOrderStatusAction(orderId, prev, formData{status})`, `cancelOrderAction(orderId)`. They revalidate `/admin`, `/admin/products|orders`, `/account/orders(+/orderNo)`, `/products` (layout), `/`.
- Upload route: `POST /api/admin/uploads` (multipart `file`) → 201 `{url:"/uploads/<uuid>.<ext>"}`; 400 bad type (checked by magic bytes), 413 > 2MB, 403 non-admin. ProductForm uploads on file pick, then puts the URL into the `imageUrl` field (admin can also paste a URL).

**Business logic (directly testable, no next/* imports)** in `src/lib/admin/`:
- `guard.ts`: `getAdminOrNull()`
- `product-schema.ts` (client-safe): `productFormSchema` (zod v4, Thai messages; ints accept "1,290"), `slugify(name)` ("" for pure Thai), `isValidImageUrl(v)` (local `/…` path or http(s)), `SLUG_RE`, `PRODUCT_STATUS_FILTERS`, `parseProductStatusFilter()`, types `ProductInput`, `ProductFormInput`, `ProductStatusFilter`.
- `products.ts`: `parseProductForm(formData|obj)`, `listAdminProducts({q,status})`, `getProductForEdit(id)`, `getCategoryOptions()`, `generateUniqueSlug(name, excludeId?)` (Thai fallback `product-<6hex>`, collisions `-2`, `-3`…), `createProduct(input)`, `updateProduct(id,input)` (returns `previousSlug`), `setProductActive(id,bool)`, `deactivateProduct(id)`. Explicit duplicate slug / unknown category → Thai `fieldErrors`.
- `uploads.ts`: `saveProductImage(file)`, `sniffImageType(buf)`, `MAX_IMAGE_BYTES`, `IMAGE_TYPES`, `UPLOAD_DIR`.
- `order-flow.ts` (client-safe): `ORDER_FLOW`, `getAllowedNextStatuses(status)` (forward only, skipping allowed, e.g. COD PENDING→PACKING; none from DELIVERED/CANCELLED; CANCELLED never offered here), `canTransition(from,to)`, `canCancel(status)` (not CANCELLED/DELIVERED), `isOrderStatus()`.
- `orders.ts`: `ADMIN_ORDERS_PER_PAGE`, `parseOrderFilters(searchParams)`, `buildOrderWhere()`, `bangkokDayStart/End(day)`, `listAdminOrders(filters)` → `{orders,total,page,pageCount}`, `getAdminOrder(id)`, `updateOrderStatus(id,next)` (optimistic `updateMany where status=current`), `cancelOrder(id)` — ONE `prisma.$transaction`: conditional `updateMany(status notIn [CANCELLED,DELIVERED]) → CANCELLED`, abort if 0 rows, then `stock: {increment: qty}` per OrderItem (so double/concurrent cancel can never restock twice).

**Shared-file changes:** `next.config.ts` now has `images.remotePatterns` for any http/https host, because admins can paste external image URLs and storefront `next/image` would otherwise throw. (Restart dev servers to pick it up.) Admin tables/preview use plain `<img>` (`AdminThumb`).

**Verified at runtime (real DB, dev server :3105, then `npm run db:seed` restored):**
- tsx script against `src/lib/admin/*` (57 checks pass): slugify / Thai fallback / `-2` suffix; Thai zod errors; create/update/slug clash/missing; soft delete + restore + list filters; search "ถั่งเช่า" = 3; upload png ok / fake png / >2MB / pdf rejected; filters (invalid date, swap, today range, page clamp); transitions (backward, CANCELLED via select, bogus rejected; skip forward ok); cancel restocks exactly once under **two concurrent cancels**; re-cancel and DELIVERED cancel rejected; cancelled order status locked.
- HTTP as admin via next-auth credentials + cookie jar: all admin pages 200 (incl. filters); anon → 307 to login, customer → 307 to `/`; upload route 201/400/413 and 403 for anon + customer; uploaded file served at `/uploads/…` and through `/_next/image`.
- Real server actions over HTTP (Next-Action header, React reply encoding, same as the browser): invalid form → Thai fieldErrors; dup slug + bad category → fieldErrors; create (Thai name, uploaded image) → 303 to edit page, DB row with `product-xxxxxx` slug, storefront `/products/<slug>` 200; update (new slug, pasted https URL, price/stock) → DB updated, new slug 200 / old slug 404; soft delete → storefront 404 + listed under inactive; restore; status change PAID→SHIPPED and customer's `/account/orders/<orderNo>` shows "จัดส่งแล้ว"; cancel → stock +qty once, second cancel refused, customer sees cancelled; DELIVERED cancel refused; demo step 6 (edit stock of vitamin-b-complex 3→50 → low-stock rows 3→2).
- Only checked by type-check / markup (no real browser): client-side behaviour such as the mobile Sheet open/close, upload button → preview, toasts, in-page confirm toggling. tsc (ignoring transient `.next/types` TS6053 noise) and lint are clean.
- Testing notes: to call bound server actions with curl, send FormData fields as `_1_<name>` **before** field `0` = `[boundArg, prevState, "$K1"]`. A no-JS (MPA) form POST hung in dev, so use the Next-Action route. Reseeding gives users new ids, so log in again after `db:seed` (an old JWT points to a user that no longer exists, and customer order pages return 404).

## Phase 6 done
**Dashboard** `src/app/admin/(dashboard)/page.tsx` (`force-dynamic`, `revalidate = 0`, calls `requireAdmin()`), logic in `src/lib/admin/dashboard.ts`:
- `bangkokDayKey(date)`, `shiftDayKey(day, n)`, `getDashboardRanges(now)` (today / last 7 days incl. today / month start / chart start, all Asia/Bangkok = UTC+7, reuses `bangkokDayStart` from `orders.ts`).
- `getDashboardData()` → sales `{today,last7,month}.{revenue,orders}` (Order.total, status ≠ CANCELLED), `monthOrderCount`, `pendingCount` (all PENDING), `avgOrderValue` (month), `revenueSeries` (14 zero-filled days), `topProducts` (top 5 by qty, revenue = Σ qty×priceSnapshot, non-cancelled, all time), `lowStock` (active, `stock <= lowStockThreshold` via `prisma.product.fields`), `latestOrders` (10).
- Chart: `src/components/admin/revenue-chart.tsx` (client, recharts BarChart, brand blue bars / navy active, THB tooltip). UI hooks for tests: `data-stat="<title>"`, `data-testid="top-products|low-stock|low-stock-empty|latest-orders"`, `data-low-stock-id`.

**Polish**
- `src/app/not-found.tsx` (Thai 404, links home / products), `src/app/error.tsx` (client boundary, retry + home).
- Loading skeletons. **Route groups were introduced so `loading.tsx` does not wrap pages that call `notFound()`** (a loading boundary starts streaming → notFound would return HTTP 200): `src/app/products/(catalog)/{page,loading}.tsx`; `src/app/account/(main)/{page,loading,profile-forms,actions}.tsx` + `(main)/orders/page.tsx` + `(main)/addresses/*` (order detail stays at `account/orders/[orderNo]`); `src/app/admin/(dashboard)/{page,loading}.tsx`. URLs unchanged.
- Empty states already existed everywhere requested (cart, product search, account orders, addresses, admin orders, admin products) — no changes needed.
- Responsive: verified at 375px with a real headless browser — no page-level horizontal overflow on any storefront/account/admin page; admin tables already scroll inside `overflow-x-auto`; header and admin Sheets open, fit, and close on navigation. No CSS fixes were required.
- Metadata already had title template `%s | PureVita`, description, `lang="th"` (admin uses `%s | หลังร้าน PureVita`).
- `README.md` rewritten (stack, setup, accounts, feature map, demo script, test scripts, db:reset).

**New test** `npx tsx scripts/e2e-admin-dashboard.ts [baseUrl=http://localhost:3000] [browserPath]` (headless Edge over CDP) — **45/45 pass** against `npm run start`.

**Verified (production build, `next start` :3000, DB restored with `npm run db:seed`, server stopped):** tsc + lint + build clean. Status checks: `/`, `/products`, product, search, `/cart`, `/checkout`, `/login`, `/register` 200; `/account` & `/admin` anon → 307 login; customer `/account*` 200, `/admin` → 307 `/`; admin `/admin`, `/admin/orders`, `/admin/products`, `/admin/products/new` 200; 404 for bogus URL, `/products/nope`, unknown `/order/…`, `/account/orders/…`, `/admin/orders/…`, `/admin/products/…/edit`. Guest `POST /api/orders` → dashboard HTML immediately shows +total in today/7d/month, order count +1, pending +1, order first in latest table (also confirmed via curl); cancelling removes it from sales; editing vitamin-b-complex stock through the real admin form → alert gone; clearing all low stock → "สต็อกเพียงพอทุกรายการ". `scripts/test-checkout.ts` 43/43 and `scripts/e2e-checkout.ts` 19/19 still pass against the production server.

## Integration done
**New test** `npx tsx scripts/e2e-demo.ts [baseUrl=http://localhost:3000] [browserPath]`: the full 6-step demo in headless Edge over raw CDP (same no-deps setup as the other e2e scripts; playwright-core is not installed). It clicks with real mouse events and types with the keyboard, and the demo steps never call the API directly. Prisma is used only to verify results. It runs **88/88 passing** against `npm run build && npm run start`. It ends by running `npm run db:seed` itself.
- Steps 1–6 all pass: header search → product → qty 2 → header count 2; /register → cart → checkout with a new address + COD → `/order/<orderNo>` (DB: stock −2, userId set, name/price snapshots, totals, phone normalised, address saved as default); /account/orders shows รอชำระเงิน; admin dashboard shows today/7d/month up by the order total, +1 order, and the new order first in the latest-orders table; admin sets SHIPPED → customer list + detail show จัดส่งแล้ว; low-stock alert → edit → stock 60 → alert gone.
- Cross-cutting checks pass: the cart survives reload, register and login; the header count clears after checkout; logged-in checkout preselects the default address; admin cancel (second browser context) restores stock and the customer sees ยกเลิก; when a product is soft-deleted while the customer is on /checkout, submitting gets 409 + a Thai alert naming the product, the line is removed, no order is created, and the retry succeeds; a stale cart holding only that product → /cart with a "ไม่มีจำหน่ายแล้ว" toast; a stale session after db:seed causes no 500 or error page.
- **Bug fixed:** a stale JWT (user row gone after `db:seed`) made the header show the old account. `/login` redirected to `/account`, and the profile page 404'd, so the user could not log in again without clearing cookies. `getCurrentUser()` in `src/lib/auth.ts` now checks that the user row exists (per-request `cache`) and returns null for stale sessions. The root layout (`src/app/layout.tsx`) uses it for `<Header user>` and the `SessionProvider` session. requireUser/requireAdmin/getAdminOrNull inherit the check, so stale sessions are redirected to /login.
- Known and accepted: re-seeding changes product ids, so a browser's old cart lines are dropped by the cart sync (empty cart, no crash).
- Regressions: test-checkout 43/43, e2e-checkout 19/19, e2e-admin-dashboard 45/45 against the production server; tsc, lint and build are clean. DB is re-seeded and the servers/browsers are stopped.
