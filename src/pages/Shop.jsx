import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import Reveal from "../components/Reveal";
import ProductCard from "../components/ProductCard";
import { apiFetch, imageSrc } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import { normalizeBookType } from "../context/CartContext";
import "./Shop.css";

function stripHtml(s = "") {
    return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Normalize ?type= / ?bookType= to "PDF" | "PAPER" | "all". */
function activeBookType(searchParams) {
    const raw = (searchParams.get("type") || searchParams.get("bookType") || "all").trim().toLowerCase();
    if (["ebook", "e-book", "ebooks", "pdf", "digital"].includes(raw)) return "PDF";
    if (["paper", "paperbook", "paper-book", "paperbooks", "physical"].includes(raw)) return "PAPER";
    return "all";
}

const HERO_INTERVAL = 6000;

function Hero({ settings, count }) {
    const { t, lang } = useLanguage();
    const [slide, setSlide] = useState(0);
    const timer = useRef(null);

    const slides = [
        {
            eyebrow: lang === "fa" ? (settings.siteNameFa || settings.siteName || "My Store") : (settings.siteName || settings.siteNameFa || "My Store"),
            title: settings.heroTitle || t("home.heroTitle"),
            sub: settings.heroSubtitle || t("home.heroSubtitle"),
            cta: settings.heroButtonText || t("home.shopNow"),
            to: "#all",
            theme: "amz-hero-a",
        },
        {
            eyebrow: t("shop.bestSellers"),
            title: t("shop.slide2title"),
            sub: t("shop.slide2sub"),
            cta: t("shop.shopNow"),
            to: "#best",
            theme: "amz-hero-b",
        },
        {
            eyebrow: t("shop.allProducts"),
            title: t("shop.slide3title", { n: count }),
            sub: t("shop.slide3sub"),
            cta: t("shop.browseAll"),
            to: "#all",
            theme: "amz-hero-c",
        },
    ];

    useEffect(() => {
        timer.current = setInterval(() => setSlide(s => (s + 1) % slides.length), HERO_INTERVAL);
        return () => clearInterval(timer.current);
    }, [slides.length]);

    function go(i) {
        setSlide((i + slides.length) % slides.length);
        clearInterval(timer.current);
        timer.current = setInterval(() => setSlide(s => (s + 1) % slides.length), HERO_INTERVAL);
    }

    const s = slides[slide];

    return (
        <section className={`amz-hero ${s.theme}`}>
            <button className="amz-hero-arrow prev" onClick={() => go(slide - 1)} aria-label="‹">‹</button>
            <div className="amz-hero-inner" key={slide}>
                <span className="amz-eyebrow">{s.eyebrow}</span>
                <h1>{s.title}</h1>
                <p>{s.sub}</p>
                <a className="amz-hero-cta" href={s.to}>{s.cta}</a>
            </div>
            <button className="amz-hero-arrow next" onClick={() => go(slide + 1)} aria-label="›">›</button>
            <div className="amz-dots">
                {slides.map((_, i) => (
                    <button key={i} className={i === slide ? "on" : ""} onClick={() => go(i)} aria-label={`slide ${i + 1}`} />
                ))}
            </div>
        </section>
    );
}

function ShopRow({ id, title, products }) {
    const track = useRef(null);
    const { lang } = useLanguage();

    function scroll(dir) {
        const el = track.current;
        if (!el) return;
        const rtl = lang === "fa" ? -1 : 1;
        el.scrollBy({ left: dir * rtl * el.clientWidth * 0.8, behavior: "smooth" });
    }

    if (!products.length) return null;

    return (
        <section className="amz-row" id={id}>
            <div className="amz-row-head">
                <h2>{title}</h2>
                <div className="amz-row-nav">
                    <button onClick={() => scroll(-1)} aria-label="‹">‹</button>
                    <button onClick={() => scroll(1)} aria-label="›">›</button>
                </div>
            </div>
            <div className="amz-track" ref={track}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
        </section>
    );
}

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({});
    const [state, setState] = useState("loading");
    const { t, lang } = useLanguage();
    usePageTitle(t("shop.title"));
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCat = searchParams.get("category") || "all";
    const activeType = activeBookType(searchParams);
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const catLabel = c => (lang === "fa" ? (c.nameFa || c.name) : (c.name || c.nameFa));

    useEffect(() => {
        apiFetch("/api/products")
            .then(data => { setProducts(Array.isArray(data) ? data : []); setState("done"); })
            .catch(() => setState("error"));
        apiFetch("/api/settings").then(setSettings).catch(() => {});
        apiFetch("/api/categories").then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {});
    }, []);

    const hasUncategorized = products.some(p => !p.category);
    const filtered = products.filter(p => {
        const matchesQuery = (p.name + " " + stripHtml(p.description || "")).toLowerCase().includes(query.toLowerCase());
        if (!matchesQuery) return false;
        if (activeType !== "all" && normalizeBookType(p.bookType) !== activeType) return false;
        if (activeCat === "all") return true;
        if (activeCat === "none") return !p.category;
        return p.category?.slug === activeCat;
    });

    function pickCategory(slug) {
        const next = {};
        if (activeType !== "all") next.type = activeType === "PDF" ? "ebook" : "paper";
        if (slug && slug !== "all") next.category = slug;
        setSearchParams(next);
    }

    function pickType(kind) {
        const next = {};
        if (activeCat !== "all") next.category = activeCat;
        if (kind === "ebook" || kind === "paper") next.type = kind;
        setSearchParams(next);
    }

    // Everything on the page (including Best sellers) respects the type filter,
    // so the E-books / Paper-books submenu views never leak the other kind.
    const visible = activeType === "all"
        ? products
        : products.filter(p => normalizeBookType(p.bookType) === activeType);
    const best = visible.slice(0, 8);

    return (
        <>
            <Navbar />
            <div className="amz-subnav">
                <a href="#best">{t("shop.bestSellers")}</a>
                <a href="#all">{t("shop.allProducts")}</a>
                <span className="amz-count">{t("shop.count", { n: visible.length })}</span>
            </div>
            <main className="amz-main">
                <Breadcrumbs items={[
                    { to: "/", label: t("nav.home") },
                    { to: "/shop", label: t("shop.title") },
                    ...(activeType === "PDF"
                        ? [{ to: "/books/ebooks", label: t("books.titleEbooks") }]
                        : activeType === "PAPER"
                            ? [{ to: "/books/paper-books", label: t("books.titlePaper") }]
                            : []),
                    ...(activeCat !== "all" ? [{ label: activeCat === "none" ? t("shop.uncategorized") : (catLabel(categories.find(c => c.slug === activeCat) || {}) || activeCat) }] : []),
                ]} />
                <Hero settings={settings} count={products.length} />

                {state === "loading" && <p className="page-state">{t("shop.loading")}</p>}
                {state === "error" && <p className="page-state">{t("shop.error")}</p>}

                {state === "done" && (
                    <>
                        <ShopRow id="best" title={t("shop.bestSellers")} products={best} />

                        <section className="amz-row" id="all">
                            <div className="amz-row-head">
                                <h2>{t("shop.allProducts")}</h2>
                            </div>
                            <div className="toolbar">
                                <input
                                    placeholder={t("shop.search")}
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                            </div>
                            <div className="cat-chips">
                                <button
                                    className={`cat-chip${activeType === "all" ? " on" : ""}`}
                                    onClick={() => pickType("all")}
                                >
                                    {t("shop.all")}
                                </button>
                                <button
                                    className={`cat-chip${activeType === "PDF" ? " on" : ""}`}
                                    onClick={() => pickType("ebook")}
                                >
                                    📄 {t("products.bookTypePdf")}
                                </button>
                                <button
                                    className={`cat-chip${activeType === "PAPER" ? " on" : ""}`}
                                    onClick={() => pickType("paper")}
                                >
                                    📕 {t("products.bookTypePaper")}
                                </button>
                            </div>
                            <div className="cat-chips">
                                <button
                                    className={`cat-chip${activeCat === "all" ? " on" : ""}`}
                                    onClick={() => pickCategory("all")}
                                >
                                    {t("shop.all")}
                                </button>
                                {categories.map(c => (
                                    <button
                                        key={c.id}
                                        className={`cat-chip${activeCat === c.slug ? " on" : ""}`}
                                        onClick={() => pickCategory(c.slug)}
                                    >
                                        {c.imageUrl && (
                                            <img className="cat-chip-img" src={imageSrc(c.imageUrl)} alt="" loading="lazy" />
                                        )}
                                        {catLabel(c)}
                                    </button>
                                ))}
                                {hasUncategorized && (
                                    <button
                                        className={`cat-chip${activeCat === "none" ? " on" : ""}`}
                                        onClick={() => pickCategory("none")}
                                    >
                                        {t("shop.uncategorized")}
                                    </button>
                                )}
                            </div>
                            <div className="amz-grid">
                                {filtered.map((p, i) => (
                                    <Reveal key={p.id} delay={(i % 4) * 50}>
                                        <ProductCard product={p} grid />
                                    </Reveal>
                                ))}
                            </div>
                            {filtered.length === 0 && <p className="muted">{t("shop.empty")}</p>}
                        </section>
                    </>
                )}
            </main>
        </>
    );
}
