import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import Reveal from "../components/Reveal";
import BookCard from "../components/BookCard";
import { showPaperSoon } from "../components/PaperSoon";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Shop.css";
import "./Books.css";

const KINDS = ["all", "ebook", "paper"];

function kindOf(prop) {
    return KINDS.includes(prop) ? prop : "all";
}

function typeFor(kind) {
    if (kind === "ebook") return "PDF";
    if (kind === "paper") return "PAPER";
    return "all";
}

/**
 * Digikala-style books catalog, backed exclusively by the `books` table:
 * a top search bar, a category sidebar, and horizontal reel strips
 * (featured / recommended / top sellers) above the results grid.
 *
 *   /books             → all downloaded books
 *   /books/ebooks      → e-books (every row in the table is an e-book)
 *   /books/paper-books → paper books (none exist in this source yet)
 */
export default function Books({ kind: kindProp }) {
    const kind = kindOf(kindProp);
    const wantType = typeFor(kind);
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [reels, setReels] = useState(null);
    const [state, setState] = useState("loading");
    const { t, lang } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const qParam = searchParams.get("q") || "";
    const [query, setQuery] = useState(qParam);
    const activeCat = searchParams.get("category") || "all";
    const title = kind === "ebook"
        ? t("books.titleEbooks")
        : kind === "paper"
            ? t("books.titlePaper")
            : t("books.titleAll");
    usePageTitle(title);

    // The home page search navigates to /books?q=...; the initial state above
    // already picks that up. Typing only changes local state.

    useEffect(() => {
        let cancelled = false;
        apiFetch("/api/books")
            .then(data => {
                if (cancelled) return;
                setBooks(Array.isArray(data) ? data : []);
                setState("done");
            })
            .catch(() => {
                if (!cancelled) setState("error");
            });
        apiFetch("/api/books/categories")
            .then(data => {
                if (!cancelled) setCategories(Array.isArray(data) ? data : []);
            })
            .catch(() => {});
        apiFetch("/api/books/reels")
            .then(data => {
                if (!cancelled) setReels(data || null);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const visible = books.filter(b =>
        wantType === "all" || (b.bookType || "PDF") === wantType
    );
    const hasUncategorized = visible.some(b => !b.categorySlug);
    const searching = !!query.trim();
    const needle = query.trim().toLowerCase();
    const filtered = visible.filter(b => {
        if (needle) {
            const haystack = [b.title, b.author, b.categories, b.description, b.format, b.language]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(needle)) return false;
        }
        if (activeCat === "all") return true;
        if (activeCat === "none") return !b.categorySlug;
        return b.categorySlug === activeCat;
    });

    function pickCategory(slug) {
        const next = {};
        if (slug && slug !== "all") next.category = slug;
        if (query.trim()) next.q = query.trim();
        setSearchParams(next);
    }

    const catName = c => (lang === "fa" && c.nameFa ? c.nameFa : c.name);
    const kindPath = kind === "ebook" ? "/books/ebooks" : kind === "paper" ? "/books/paper-books" : "/books";
    const activeCatObj =
        activeCat !== "all" && activeCat !== "none"
            ? categories.find(c => c.slug === activeCat) || null
            : null;

    // Trail mirrors the drill-down: Home → Books → (E-books →) Category.
    // The last crumb is the current page, so it renders without a link.
    let crumbs = [
        { to: "/", label: t("nav.home") },
        { to: "/books", label: t("books.titleAll") },
        ...(kind !== "all" ? [{ to: kindPath, label: title }] : []),
        ...(activeCatObj ? [{ label: catName(activeCatObj) }] : []),
    ];
    crumbs = crumbs.map((c, i) => (i === crumbs.length - 1 ? { label: c.label } : c));

    const searchingMode = state === "done" && searching;
    // Reels are a main-page feature: shown on the books and e-books landing
    // views only — once a category is picked, a search is active, or the
    // paper-books visit, the listing stands on its own.
    const showReels =
        (kind === "all" || kind === "ebook") && activeCat === "all";

    return (
        <>
            <Navbar />
            <main className="amz-main">
                <Breadcrumbs items={crumbs} />

                {/* Top search bar (Digikala-style pill) */}
                <div className="bk-search">
                    <span className="bk-search-icon" aria-hidden="true">🔍</span>
                    <input
                        placeholder={t("books.search")}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        aria-label={t("books.search")}
                    />
                    {query && (
                        <button
                            className="bk-search-clear"
                            onClick={() => setQuery("")}
                            aria-label={t("common.clear")}
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="bk-body">
                    {/* Category sidebar (desktop) */}
                    <aside className="bk-side">
                        <div className="bk-side-head">{t("books.categories")}</div>
                        <nav className="bk-side-list">
                            <Link
                                className={`bk-side-item${kind === "all" ? " on" : ""}`}
                                to="/books"
                            >
                                <span>📚 {t("books.titleAll")}</span>
                            </Link>
                            <Link
                                className={`bk-side-item${kind === "ebook" ? " on" : ""}`}
                                to="/books/ebooks"
                            >
                                <span>📄 {t("books.titleEbooks")}</span>
                            </Link>
                            <Link
                                className={`bk-side-item${kind === "paper" ? " on" : ""}`}
                                to="/books/paper-books"
                                onClick={e => {
                                    e.preventDefault();
                                    showPaperSoon();
                                }}
                            >
                                <span>📕 {t("books.titlePaper")}</span>
                            </Link>
                            <div className="bk-side-sep" />
                            <button
                                className={`bk-side-item${activeCat === "all" ? " on" : ""}`}
                                onClick={() => pickCategory("all")}
                            >
                                <span>{t("shop.all")}</span>
                                <span className="bk-side-count">{visible.length}</span>
                            </button>
                            {categories.map(c => (
                                <button
                                    key={c.slug}
                                    className={`bk-side-item${activeCat === c.slug ? " on" : ""}`}
                                    onClick={() => pickCategory(c.slug)}
                                >
                                    <span>{catName(c)}</span>
                                    <span className="bk-side-count">{c.count}</span>
                                </button>
                            ))}
                            {hasUncategorized && (
                                <button
                                    className={`bk-side-item${activeCat === "none" ? " on" : ""}`}
                                    onClick={() => pickCategory("none")}
                                >
                                    <span>{t("shop.uncategorized")}</span>
                                </button>
                            )}
                        </nav>
                    </aside>

                    {/* Main column: reels + results */}
                    <div className="bk-main">
                        {state === "done" && !searchingMode && showReels && reels && (
                            <>
                                <Reel
                                    title={t("books.reelFeatured")}
                                    icon="🌟"
                                    items={reels.featured}
                                />
                                <Reel
                                    title={t("books.reelRecommended")}
                                    icon="✨"
                                    items={reels.recommended}
                                />
                                <Reel
                                    title={t("books.reelTopSellers")}
                                    icon="🔥"
                                    items={reels.topSellers}
                                />
                            </>
                        )}

                        <div className="amz-row-head">
                            <h2>{searchingMode ? t("books.results") : title}</h2>
                            <span className="amz-count">{t("books.count", { n: filtered.length })}</span>
                        </div>

                        {/* Kind + category chips (mobile: replaces the sidebar) */}
                        <div className="bk-mobile-cats">
                            <Link className={`cat-chip${kind === "all" ? " on" : ""}`} to="/books">
                                📚 {t("books.titleAll")}
                            </Link>
                            <Link className={`cat-chip${kind === "ebook" ? " on" : ""}`} to="/books/ebooks">
                                📄 {t("books.titleEbooks")}
                            </Link>
                            <Link className={`cat-chip${kind === "paper" ? " on" : ""}`} to="/books/paper-books"
                                onClick={e => {
                                    e.preventDefault();
                                    showPaperSoon();
                                }}
                            >
                                📕 {t("books.titlePaper")}
                            </Link>
                            <button
                                className={`cat-chip${activeCat === "all" ? " on" : ""}`}
                                onClick={() => pickCategory("all")}
                            >
                                {t("shop.all")}
                            </button>
                            {categories.map(c => (
                                <button
                                    key={c.slug}
                                    className={`cat-chip${activeCat === c.slug ? " on" : ""}`}
                                    onClick={() => pickCategory(c.slug)}
                                >
                                    {catName(c)}
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

                        {state === "loading" && <p className="page-state">{t("shop.loading")}</p>}
                        {state === "error" && <p className="page-state">{t("books.error")}</p>}

                        {state === "done" && (
                            <>
                                <div className="amz-grid">
                                    {filtered.map((b, i) => (
                                        <Reveal key={b.id} delay={(i % 4) * 50}>
                                            <BookCard book={b} grid />
                                        </Reveal>
                                    ))}
                                </div>
                                {filtered.length === 0 && (
                                    <p className="muted">
                                        {wantType === "PAPER" ? t("books.emptyPaper") : t("shop.empty")}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

/** Digikala-style horizontal reel: header + scrollable strip with arrows. */
function Reel({ title, icon, items }) {
    const { t, lang } = useLanguage();
    const trackRef = useRef(null);
    const [edge, setEdge] = useState({ start: true, end: false });

    if (!items || items.length === 0) return null;

    function updateEdges() {
        const el = trackRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        const pos = Math.abs(el.scrollLeft);   // RTL scrollLeft goes negative
        setEdge({ start: pos <= 1, end: pos >= max - 1 });
    }

    function slide(dir) {
        const el = trackRef.current;
        if (!el) return;
        const rtl = getComputedStyle(el).direction === "rtl";
        const w = el.clientWidth * 0.9;
        el.scrollBy({ left: dir * (rtl ? -w : w), behavior: "smooth" });
    }

    const startGlyph = lang === "fa" ? "›" : "‹";
    const endGlyph = lang === "fa" ? "‹" : "›";

    return (
        <section className="bk-reel">
            <div className="bk-reel-head">
                <h3>
                    <span className="bk-reel-accent" aria-hidden="true" />
                    {icon} {title}
                </h3>
                <span className="bk-reel-hint">{t("books.reelHint")}</span>
            </div>
            <div className="bk-reel-wrap">
                <button
                    className={`bk-arrow bk-arrow-start${edge.start ? " off" : ""}`}
                    onClick={() => slide(-1)}
                    aria-label={t("common.prev")}
                >
                    {startGlyph}
                </button>
                <div className="bk-reel-track" ref={trackRef} onScroll={updateEdges}>
                    {items.map(b => (
                        <div className="bk-reel-card" key={b.id}>
                            <BookCard book={b} grid />
                        </div>
                    ))}
                </div>
                <button
                    className={`bk-arrow bk-arrow-end${edge.end ? " off" : ""}`}
                    onClick={() => slide(1)}
                    aria-label={t("common.next")}
                >
                    {endGlyph}
                </button>
            </div>
        </section>
    );
}
