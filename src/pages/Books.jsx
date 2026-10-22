import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import Reveal from "../components/Reveal";
import BookCard from "../components/BookCard";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Shop.css";

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
 * Dedicated book pages backed exclusively by the `books` table.
 * Only rows with downloaded = true are returned by /api/books.
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
        return () => {
            cancelled = true;
        };
    }, []);

    const visible = books.filter(b =>
        wantType === "all" || (b.bookType || "PDF") === wantType
    );
    const hasUncategorized = visible.some(b => !b.categorySlug);
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
        if (!slug || slug === "all") setSearchParams({});
        else setSearchParams({ category: slug });
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

    return (
        <>
            <Navbar />
            <main className="amz-main">
                <Breadcrumbs items={crumbs} />
                <div className="amz-row-head">
                    <h2>{title}</h2>
                    <span className="amz-count">{t("books.count", { n: filtered.length })}</span>
                </div>

                <div className="cat-chips">
                    <Link className={`cat-chip${kind === "all" ? " on" : ""}`} to="/books">
                        📚 {t("books.titleAll")}
                    </Link>
                    <Link className={`cat-chip${kind === "ebook" ? " on" : ""}`} to="/books/ebooks">
                        📄 {t("books.titleEbooks")}
                    </Link>
                    <Link className={`cat-chip${kind === "paper" ? " on" : ""}`} to="/books/paper-books">
                        📕 {t("books.titlePaper")}
                    </Link>
                </div>

                {state === "loading" && <p className="page-state">{t("shop.loading")}</p>}
                {state === "error" && <p className="page-state">{t("books.error")}</p>}

                {state === "done" && (
                    <>
                        <div className="toolbar">
                            <input
                                placeholder={t("books.search")}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
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
            </main>
        </>
    );
}
