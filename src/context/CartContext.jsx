import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { getCookie, setCookie, eraseCookie } from "../lib/cookies";
import { finalPrice } from "../lib/price";

const CartContext = createContext(null);
const TOKEN_KEY = "basketToken";
const CACHE_KEY = "cart:v1";

export function normalizeBookType(t) {
    if (t == null || t === undefined) return "PDF";
    const s = String(t).trim().toUpperCase();
    if (s === "PAPER" || s === "PAPERBOOK" || s === "PHYSICAL") return "PAPER";
    return "PDF";
}

export function isEbook(product) {
    return normalizeBookType(product?.bookType) !== "PAPER";
}

/** E-books have an immutable qty of 1: hide the -/+ stepper for them. */
export function isFixedQty(product) {
    if (!product) return false;
    if (product.fixedQty === true) return true;
    return isEbook(product);
}

export function maxFor(product) {
    const stock = Number(product?.stock ?? 0);
    if (!(stock > 0)) return 0;
    if (isEbook(product)) return 1;
    const limit = Number(product?.maxPerOrder ?? 1);
    return Math.max(1, Math.min(Number.isFinite(limit) && limit >= 1 ? limit : 1, stock));
}

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(i => i && i.id != null) : [];
    } catch {
        return [];
    }
}

function cache(items) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
    } catch {
        // storage unavailable — cart still works in memory
    }
}

function basketHeaders() {
    try {
        const token = localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
        return token ? { "X-Basket-Token": token } : {};
    } catch {
        return {};
    }
}

function persistBasketToken(token) {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // ignore
    }
    setCookie(TOKEN_KEY, token);
}

function snapshot(product, qty) {
    const fixed = isFixedQty(product);
    return {
        itemId: null,
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: finalPrice(product),
        bookType: normalizeBookType(product.bookType),
        fixedQty: fixed,
        imageUrl: product.imageUrl || "",
        stock: Number(product.stock ?? 0),
        maxPerOrder: fixed ? 1 : Number(product.maxPerOrder ?? 1),
        qty: fixed ? 1 : qty,
    };
}

function applyBasket(b) {
    try {
        if (b?.token) persistBasketToken(b.token);
    } catch {
        // ignore
    }
    const items = Array.isArray(b?.items)
        ? b.items.map(i => {
            const bookType = normalizeBookType(i.bookType);
            const fixed = i.fixedQty === true || bookType !== "PAPER";
            return {
                itemId: i.id,
                id: i.productId,
                bookId: i.bookId || null,
                slug: i.slug,
                name: i.name,
                price: Number(i.price || 0),
                bookType,
                fixedQty: fixed,
                imageUrl: i.imageUrl || "",
                stock: Number(i.stock ?? 0),
                maxPerOrder: fixed ? 1 : Number(i.maxPerOrder ?? 1),
                qty: fixed ? 1 : Number(i.qty || 0),
            };
        }).filter(i => i.id != null && i.qty > 0)
        : [];
    cache(items);
    return items;
}

function basketNeedsAddress(b) {
    if (!b || !Array.isArray(b.items)) return true;
    if (typeof b.needsAddress === "boolean") return b.needsAddress;
    return b.items.some(i => i.bookType === "PAPER");
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadCache);
    const [open, setOpen] = useState(false);
    const [needsAddress, setNeedsAddress] = useState(true);

    function syncBasket(b) {
        setItems(applyBasket(b));
        setNeedsAddress(basketNeedsAddress(b));
    }

    // Reconcile with the server basket on load (guest token or new basket).
    // Falls back to the cached local cart when the backend is unreachable.
    useEffect(() => {
        let cancelled = false;
        apiFetch("/api/basket", { headers: basketHeaders() })
            .then(async b => {
                if (cancelled) return;
                const serverEmpty = !Array.isArray(b?.items) || b.items.length === 0;
                const cached = loadCache();
                if (serverEmpty && cached.length > 0) {
                    // Migrate a pre-existing local cart up to the server basket.
                    for (const it of cached) {
                        try {
                            await apiFetch("/api/basket/items", {
                                method: "POST",
                                headers: basketHeaders(),
                                body: JSON.stringify({ productId: it.id, qty: it.qty || 1 }),
                            });
                        } catch {
                            // per-item problems (inactive product, no stock) — skip
                        }
                    }
                    try {
                        const fresh = await apiFetch("/api/basket", { headers: basketHeaders() });
                        if (!cancelled) syncBasket(fresh);
                    } catch {
                        if (!cancelled) syncBasket(b);
                    }
                } else {
                    syncBasket(b);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    async function add(product, qty = 1) {
        const cap = maxFor(product);
        if (cap <= 0) return 0;
        const fixed = isFixedQty(product);
        const effectiveQty = fixed ? 1 : qty;
        const cur = items.find(i => i.id === product.id)?.qty || 0;
        if (cur >= cap) return cur;
        const want = fixed ? 1 : Math.min(cur + effectiveQty, cap);
        setItems(prev => {
            const found = prev.find(i => i.id === product.id);
            const next = found
                ? prev.map(i => (i.id === product.id ? { ...snapshot(product, want), itemId: i.itemId ?? null } : i))
                : [...prev, snapshot(product, want)];
            cache(next);
            return next;
        });
        try {
            const b = await apiFetch("/api/basket/items", {
                method: "POST",
                headers: basketHeaders(),
                body: JSON.stringify({ productId: product.id, qty: effectiveQty }),
            });
            syncBasket(b);
        } catch {
            // server unreachable — optimistic local state stands
        }
        return want;
    }

    // qty <= 0 removes the line (the "-1 removes" behavior).
    // Fixed-qty (e-book) lines are immutable at 1: any qty>0 collapses to 1.
    async function setQty(id, qty) {
        if (qty <= 0) return remove(id);
        const target = items.find(i => i.id === id);
        if (!target) return;
        if (isFixedQty(target)) {
            if (target.qty === 1) return;
            setItems(prev => {
                const nextItems = prev.map(i => (i.id === id ? { ...i, qty: 1 } : i));
                cache(nextItems);
                return nextItems;
            });
            if (target.itemId == null) return;
            try {
                const b = await apiFetch(`/api/basket/items/${target.itemId}`, {
                    method: "PUT",
                    headers: basketHeaders(),
                    body: JSON.stringify({ qty: 1 }),
                });
                syncBasket(b);
            } catch {
                // keep optimistic state
            }
            return;
        }
        const next = Math.max(1, Math.min(qty, maxFor(target)));
        setItems(prev => {
            const nextItems = prev.map(i => (i.id === id ? { ...i, qty: next } : i));
            cache(nextItems);
            return nextItems;
        });
        if (target.itemId == null) return;
        try {
            const b = await apiFetch(`/api/basket/items/${target.itemId}`, {
                method: "PUT",
                headers: basketHeaders(),
                body: JSON.stringify({ qty: next }),
            });
            syncBasket(b);
        } catch {
            // keep optimistic state
        }
    }

    async function remove(id) {
        const target = items.find(i => i.id === id);
        setItems(prev => {
            const next = prev.filter(i => i.id !== id);
            cache(next);
            return next;
        });
        if (target?.itemId == null) return;
        try {
            const b = await apiFetch(`/api/basket/items/${target.itemId}`, {
                method: "DELETE",
                headers: basketHeaders(),
            });
            syncBasket(b);
        } catch {
            // keep optimistic state
        }
    }

    async function clear() {
        setItems([]);
        cache([]);
        try {
            const b = await apiFetch("/api/basket", { method: "DELETE", headers: basketHeaders() });
            syncBasket(b);
        } catch {
            // keep optimistic state
        }
    }

    // "Add to cart" for a library book (books catalog, /books pages).
    // The backend turns the book into its shop product on first use and
    // adds it to the basket, returning the same basket response shape.
    async function addLibraryBook(bookId) {
        const b = await apiFetch(`/api/books/${bookId}/purchase`, {
            method: "POST",
            headers: basketHeaders(),
            body: JSON.stringify({ qty: 1 }),
        });
        syncBasket(b);
        return b;
    }

    async function checkout(info) {
        const result = await apiFetch("/api/orders/checkout", {
            method: "POST",
            headers: basketHeaders(),
            body: JSON.stringify(info),
        });
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            // ignore
        }
        eraseCookie(TOKEN_KEY);
        setItems([]);
        cache([]);
        return result;
    }

    const { count, subtotal } = useMemo(() => {
        return items.reduce(
            (acc, i) => ({
                count: acc.count + i.qty,
                subtotal: acc.subtotal + i.qty * Number(i.price || 0),
            }),
            { count: 0, subtotal: 0 }
        );
    }, [items]);

    return (
        <CartContext.Provider
            value={{ items, add, setQty, remove, clear, checkout, addLibraryBook, count, subtotal, open, setOpen, needsAddress }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
