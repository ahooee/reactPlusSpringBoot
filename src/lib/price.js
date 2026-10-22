export function discountOf(p) {
    const d = Number(p?.discountPercent ?? 0);
    return Number.isFinite(d) && d > 0 ? Math.min(100, Math.round(d)) : 0;
}

export function hasDiscount(p) {
    return discountOf(p) > 0;
}

// Price the customer actually pays, rounded to whole rials (mirrors backend).
export function finalPrice(p) {
    const base = Number(p?.price || 0);
    const d = discountOf(p);
    if (!d) return Math.round(base);
    return Math.round(base * (100 - d) / 100);
}

function activeLang(explicit) {
    if (explicit === "fa" || explicit === "en") return explicit;
    try {
        const saved = typeof localStorage !== "undefined" ? localStorage.getItem("language") : null;
        if (saved === "fa" || saved === "en") return saved;
    } catch {
        /* ignore */
    }
    return "en";
}

// Display currency unit for the whole shop (admin-controlled setting,
// mirrored to localStorage as "currency"). Prices are stored in rial;
// toman display divides by 10 (1 تومان = 10 ریال).
export function activeCurrency() {
    try {
        const c = typeof localStorage !== "undefined" ? localStorage.getItem("currency") : null;
        if (c === "TOMAN" || c === "IRR") return c;
    } catch {
        /* ignore */
    }
    return "IRR";
}

// Iranian rial/toman have no minor unit, so amounts render as whole numbers
// with thousands grouping: "1,250,000 IRR" in English, "۱٬۲۵۰٬۰۰۰ ریال" in Persian.
export function money(n, lang) {
    const l = activeLang(lang);
    const raw = Math.round(Number(n || 0));
    const v = activeCurrency() === "TOMAN" ? Math.round(raw / 10) : raw;
    const suffix = activeCurrency() === "TOMAN"
        ? (l === "fa" ? "تومان" : "Toman")
        : (l === "fa" ? "ریال" : "IRR");
    try {
        const fmt = new Intl.NumberFormat(l === "fa" ? "fa-IR" : "en-US", {
            maximumFractionDigits: 0,
        });
        return `${fmt.format(v)} ${suffix}`;
    } catch {
        return `${v} ${suffix}`;
    }
}
