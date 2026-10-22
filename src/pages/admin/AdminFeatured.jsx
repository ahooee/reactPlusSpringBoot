import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const REEL_SIZE = 12;

function thumb(book) {
    return (
        <img
            src={book.coverUrl || `/api/books/${book.id}/cover`}
            alt={book.title || ""}
            loading="lazy"
            style={{
                width: 44,
                height: 62,
                objectFit: "cover",
                borderRadius: 6,
                background: "var(--code-bg)",
                display: "block",
            }}
        />
    );
}

/**
 * Curation of the "Featured" reel on the books page. Mirrors AdminRail:
 * {@code books.featuredIds} key (comma-separated book IDs in display
 * order). An empty list means the public reel rotates daily.
 */
export default function AdminFeatured() {
    const [books, setBooks] = useState([]);
    const [ids, setIds] = useState(null);          // null = loading
    const [query, setQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const { t } = useLanguage();
    usePageTitle(t("admin.featured"));

    useEffect(() => {
        Promise.all([
            apiFetch("/api/books").catch(() => []),
            apiFetch("/api/settings").catch(() => ({})),
        ]).then(([bookList, settings]) => {
            const list = Array.isArray(bookList) ? bookList : [];
            setBooks(list);
            const known = new Set(list.map(b => b.id));
            const raw = String(settings?.["books.featuredIds"] ?? "").trim();
            const parsed = raw
                ? raw.split(/[\s,]+/).filter(v => known.has(v))
                : [];
            setIds(parsed);
        });
    }, []);

    async function persist(next) {
        setIds(next);
        setSaving(true);
        setError(null);
        try {
            await apiFetch("/api/settings", {
                method: "PUT",
                body: JSON.stringify({ "books.featuredIds": next.join(",") }),
            });
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    function move(id, dir) {
        const i = ids.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ids.length) return;
        const next = [...ids];
        [next[i], next[j]] = [next[j], next[i]];
        persist(next);
    }

    if (ids === null) {
        return (
            <AdminLayout>
                <h1>{t("admin.featured")}</h1>
                <p className="muted">{t("common.loading")}</p>
            </AdminLayout>
        );
    }

    const byId = new Map(books.map(b => [b.id, b]));
    const featured = ids.map(id => byId.get(id)).filter(Boolean);
    const inFeatured = new Set(ids);

    const q = query.trim().toLowerCase();
    const catalog = books
        .filter(b =>
            !q || [b.title, b.author, b.categorySlug, b.language]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q))
        .slice(0, 25);

    return (
        <AdminLayout>
            <h1>{t("admin.featured")}</h1>
            <p className="muted">{t("feat.hint")}</p>
            <p className="muted">
                {saving ? `⏳ ${t("feat.saving")}` : `✓ ${t("feat.saved")}`}
                {error && <span className="error" style={{ marginInlineStart: 8 }}>{error}</span>}
            </p>

            <h3>
                {t("feat.selected")} ({featured.length}/{REEL_SIZE})
            </h3>
            {featured.length === 0 && <p className="muted">{t("feat.empty")}</p>}
            <table className="admin-table">
                <thead><tr><th></th><th>{t("products.colName")}</th><th>{t("books.category")}</th><th>{t("books.book")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {featured.map((b, i) => (
                        <tr key={b.id}>
                            <td style={{ width: 60 }}>
                                <span className="muted" style={{ marginInlineEnd: 6 }}>{i + 1}.</span>
                                {thumb(b)}
                            </td>
                            <td>{b.title || b.id}</td>
                            <td>{b.categorySlug || "—"}</td>
                            <td>{b.language || "—"}</td>
                            <td><div className="admin-actions">
                                <button className="small-btn" disabled={i === 0} onClick={() => move(b.id, -1)} title={t("feat.up")}>↑</button>
                                <button className="small-btn" disabled={i === featured.length - 1} onClick={() => move(b.id, 1)} title={t("feat.down")}>↓</button>
                                <button className="small-btn danger" onClick={() => persist(ids.filter(v => v !== b.id))}>{t("feat.remove")}</button>
                            </div></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 style={{ marginTop: 28 }}>{t("feat.catalog")}</h3>
            <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("feat.search")}
                aria-label={t("feat.search")}
                style={{ maxWidth: 320, marginBottom: 10 }}
            />
            <table className="admin-table">
                <thead><tr><th></th><th>{t("products.colName")}</th><th>{t("books.category")}</th><th>{t("books.book")}</th><th></th></tr></thead>
                <tbody>
                    {catalog.map(b => (
                        <tr key={b.id}>
                            <td style={{ width: 60 }}>{thumb(b)}</td>
                            <td>{b.title || b.id}</td>
                            <td>{b.categorySlug || "—"}</td>
                            <td>{b.language || "—"}</td>
                            <td>
                                {inFeatured.has(b.id)
                                    ? <span className="muted">✓ {t("feat.added")}</span>
                                    : <button
                                        className="small-btn"
                                        disabled={ids.length >= REEL_SIZE}
                                        title={ids.length >= REEL_SIZE ? t("feat.cap") : undefined}
                                        onClick={() => persist([...ids, b.id])}
                                    >+ {t("feat.add")}</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {catalog.length === 0 && <p className="muted">{t("shop.empty")}</p>}
        </AdminLayout>
    );
}
