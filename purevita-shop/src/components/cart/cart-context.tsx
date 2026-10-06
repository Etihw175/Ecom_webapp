"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

/**
 * Cart state: React context backed by a tiny external store persisted in localStorage.
 * - useSyncExternalStore => server render + hydration always see an empty cart (no mismatch);
 *   the real cart appears right after hydration. Use `hydrated` to avoid flashing "empty cart" UI.
 * - Syncs across tabs via the `storage` event.
 */

export const CART_STORAGE_KEY = "purevita-cart";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number; // THB
  imageUrl: string;
  stock: number; // last known stock — qty is capped at this
  qty: number;
};

export type CartProductInput = Omit<CartItem, "qty">;

export type AddItemResult = {
  /** qty actually added (0 when out of stock / already at max) */
  added: number;
  /** qty of this product in the cart after the call */
  qty: number;
  /** true when the requested qty was reduced because of stock */
  capped: boolean;
};

// ---------- external store ----------
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  return raw.filter(
    (i): i is CartItem =>
      !!i &&
      typeof i.productId === "string" &&
      typeof i.slug === "string" &&
      typeof i.name === "string" &&
      typeof i.price === "number" &&
      typeof i.imageUrl === "string" &&
      typeof i.stock === "number" &&
      typeof i.qty === "number" &&
      i.qty > 0,
  );
}

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartItem[] {
  if (cache === null) cache = readStorage();
  return cache;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function emit() {
  listeners.forEach((l) => l());
}

function setItems(next: CartItem[]) {
  cache = next;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full / disabled — keep in-memory state
  }
  emit();
}

function onStorage(e: StorageEvent) {
  if (e.key === CART_STORAGE_KEY || e.key === null) {
    cache = readStorage();
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

// ---------- mutations ----------
function clampQty(qty: number, stock: number) {
  return Math.max(0, Math.min(Math.floor(qty), Math.max(0, stock)));
}

function addItemImpl(product: CartProductInput, qty = 1): AddItemResult {
  const items = getSnapshot();
  const existing = items.find((i) => i.productId === product.productId);
  const current = existing?.qty ?? 0;
  const wanted = current + Math.max(1, Math.floor(qty));
  const nextQty = clampQty(wanted, product.stock);
  const added = Math.max(0, nextQty - current);
  const capped = nextQty < wanted;

  if (nextQty <= 0) {
    if (existing) setItems(items.filter((i) => i.productId !== product.productId));
    return { added: 0, qty: 0, capped };
  }
  const updated: CartItem = { ...product, qty: nextQty };
  setItems(
    existing
      ? items.map((i) => (i.productId === product.productId ? updated : i))
      : [...items, updated],
  );
  return { added, qty: nextQty, capped };
}

function updateQtyImpl(productId: string, qty: number) {
  const items = getSnapshot();
  const item = items.find((i) => i.productId === productId);
  if (!item) return;
  const nextQty = clampQty(qty, item.stock);
  if (nextQty <= 0) {
    setItems(items.filter((i) => i.productId !== productId));
  } else if (nextQty !== item.qty) {
    setItems(items.map((i) => (i.productId === productId ? { ...i, qty: nextQty } : i)));
  }
}

function removeItemImpl(productId: string) {
  setItems(getSnapshot().filter((i) => i.productId !== productId));
}

function clearImpl() {
  setItems([]);
}

/**
 * Update the known stock of a line (e.g. after a 409 from POST /api/orders) and cap its qty.
 * stock <= 0 removes the line. Returns the line's qty afterwards.
 */
function setStockImpl(productId: string, stock: number): number {
  const items = getSnapshot();
  const item = items.find((i) => i.productId === productId);
  if (!item) return 0;
  const nextStock = Math.max(0, Math.floor(stock));
  const nextQty = clampQty(item.qty, nextStock);
  if (nextQty <= 0) {
    setItems(items.filter((i) => i.productId !== productId));
    return 0;
  }
  setItems(items.map((i) => (i.productId === productId ? { ...i, stock: nextStock, qty: nextQty } : i)));
  return nextQty;
}

/** Fresh product data from the server (POST /api/cart/sync). */
export type CartSyncInput = Omit<CartItem, "qty"> & { isActive: boolean };

export type CartSyncChange =
  | { type: "removed"; productId: string; name: string }
  | { type: "qty"; productId: string; name: string; from: number; to: number }
  | { type: "price"; productId: string; name: string; from: number; to: number };

/**
 * Refresh every line's name/price/stock from server data, cap qty at stock and drop lines whose
 * product is missing, inactive or out of stock. Returns what changed (for user feedback).
 */
function syncProductsImpl(products: CartSyncInput[]): CartSyncChange[] {
  const items = getSnapshot();
  const byId = new Map(products.map((p) => [p.productId, p]));
  const changes: CartSyncChange[] = [];
  const next: CartItem[] = [];
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p || !p.isActive || p.stock <= 0) {
      changes.push({ type: "removed", productId: item.productId, name: p?.name ?? item.name });
      continue;
    }
    const qty = clampQty(item.qty, p.stock);
    if (qty !== item.qty) changes.push({ type: "qty", productId: p.productId, name: p.name, from: item.qty, to: qty });
    if (p.price !== item.price)
      changes.push({ type: "price", productId: p.productId, name: p.name, from: item.price, to: p.price });
    next.push({
      productId: item.productId,
      slug: p.slug,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      stock: p.stock,
      qty,
    });
  }
  const changed = next.length !== items.length || next.some((n, i) => JSON.stringify(n) !== JSON.stringify(items[i]));
  if (changed) setItems(next);
  return changes;
}

/** Replace the cart wholesale (e.g. after re-validating prices/stock against the server). */
function replaceItemsImpl(items: CartItem[]) {
  setItems(sanitize(items));
}

// ---------- context ----------
export type CartContextValue = {
  items: CartItem[];
  /** total quantity of all lines (0 until hydrated) */
  count: number;
  /** sum of price * qty */
  subtotal: number;
  /** false during SSR / hydration, true once localStorage has been read */
  hydrated: boolean;
  addItem: (product: CartProductInput, qty?: number) => AddItemResult;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  replaceItems: (items: CartItem[]) => void;
  /** set a line's known stock and cap its qty (0 removes); returns the new qty */
  setStock: (productId: string, stock: number) => number;
  /** refresh lines from server data; returns the list of user-visible changes */
  syncProducts: (products: CartSyncInput[]) => CartSyncChange[];
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const addItem = useCallback(addItemImpl, []);
  const updateQty = useCallback(updateQtyImpl, []);
  const removeItem = useCallback(removeItemImpl, []);
  const clear = useCallback(clearImpl, []);
  const replaceItems = useCallback(replaceItemsImpl, []);
  const setStock = useCallback(setStockImpl, []);
  const syncProducts = useCallback(syncProductsImpl, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return {
      items,
      count,
      subtotal,
      hydrated,
      addItem,
      updateQty,
      removeItem,
      clear,
      replaceItems,
      setStock,
      syncProducts,
    };
  }, [items, hydrated, addItem, updateQty, removeItem, clear, replaceItems, setStock, syncProducts]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function useCartCount(): number {
  return useCart().count;
}
