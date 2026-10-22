import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { API_URL, authHeaders, apiFetch, imageSrc } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const empty = { name: "", nameFa: "", slug: "", description: "", imageUrl: "" };

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [attachId, setAttachId] = useState("");
    const [uploading, setUploading] = useState(false);

    // Library book taxonomy: translations + per-book fixes
    const [bookCats, setBookCats] = useState([]);
    const [catEdits, setCatEdits] = useState({});
    const [bookQuery, setBookQuery] = useState("");
    const [onlyUncat, setOnlyUncat] = useState(true);
    const [bookRows, setBookRows] = useState([]);
    const [bookEdits, setBookEdits] = useState({});

    const { t, lang } = useLanguage();
    usePageTitle(t("category.title"));
    const labelOf = (en, fa) => (lang === "fa" && fa ? fa : en);

    const bookInputStyle = {
        width: "100%",
        padding: "6px 10px",
        borderRadius: 7,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text-h)",
        fontSize: 14,
    };

    function load() {
        apiFetch("/api/categories").then(data => {
            const list = Array.isArray(data) ? data : [];
            setCategories(list);
            if (list.length && !selectedId) setSelectedId(list[0].id);
        }).catch(() => {});
        apiFetch("/api/products?all=true")
            .then(data => setProducts(Array.isArray(data) ? data : []))
            .catch(() => {});
    }

    // ── Library book taxonomy (dynamic per books-categories) ──
    function loadBookCats() {
        apiFetch("/api/admin/books/categories").then(data => {
            setBookCats(Array.isArray(data) ? data : []);
            setCatEdits({});
        }).catch(() => {});
    }

    function loadBookRows() {
        const params = new URLSearchParams();
        if (bookQuery.trim()) params.set("query", bookQuery.trim());
        if (onlyUncat) params.set("uncategorized", "true");
        apiFetch(`/api/admin/books?${params.toString()}`).then(data => {
            setBookRows(Array.isArray(data) ? data : []);
            setBookEdits({});
        }).catch(() => {});
    }

    async function saveCategoryName(slug) {
        try {
            const list = await apiFetch(`/api/admin/books/categories/${encodeURIComponent(slug)}`, {
                method: "PUT",
                body: JSON.stringify({ nameFa: catEdits[slug] ?? "" }),
            });
            setBookCats(Array.isArray(list) ? list : []);
            setCatEdits({});
            alert(t("bookCat.saved"));
        } catch (err) {
            alert(err.message);
        }
    }

    async function removeCategoryName(slug) {
        try {
            await apiFetch(`/api/admin/books/categories/${encodeURIComponent(slug)}`, { method: "DELETE" });
            setBookCats(cats => cats.map(c => (c.slug === slug ? { ...c, nameFa: null } : c)));
        } catch (err) {
            alert(err.message);
        }
    }

    async function saveBookCategory(book) {
        try {
            await apiFetch(`/api/admin/books/${book.id}/category`, {
                method: "PUT",
                body: JSON.stringify({ categories: bookEdits[book.id] ?? "" }),
            });
            alert(t("bookCat.saved"));
            loadBookRows();
            loadBookCats();
        } catch (err) {
            alert(err.message);
        }
    }

    useEffect(load, []);
    useEffect(() => {
        loadBookCats();
        loadBookRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        if (editing) {
            await apiFetch(`/api/categories/${editing}`, { method: "PUT", body: JSON.stringify(form) });
        } else {
            await apiFetch("/api/categories", { method: "POST", body: JSON.stringify(form) });
        }
        setForm(empty);
        setEditing(null);
        load();
    }

    function startEdit(c) {
        setEditing(c.id);
        setForm({
            name: c.name || "",
            nameFa: c.nameFa || "",
            slug: c.slug || "",
            description: c.description || "",
            imageUrl: c.imageUrl || "",
        });
    }

    async function remove(id) {
        if (!window.confirm(t("category.confirmDelete"))) return;
        await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
        if (selectedId === id) setSelectedId(null);
        load();
    }

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const data = new FormData();
            data.append("file", file);
            const res = await fetch(`${API_URL}/api/media/upload`, {
                method: "POST",
                headers: { ...authHeaders() },
                body: data,
            });
            if (!res.ok) throw new Error("Upload failed");
            const asset = await res.json();
            if (asset?.url) setForm(f => ({ ...f, imageUrl: asset.url }));
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    const selected = categories.find(c => c.id === selectedId) || null;
    const inCategory = products.filter(p => p.category?.id === selectedId);
    const outside = products.filter(p => p.category?.id !== selectedId);
    const countOf = id => products.filter(p => p.category?.id === id).length;

    async function attach() {
        if (!attachId || !selectedId) return;
        const p = products.find(x => String(x.id) === String(attachId));
        if (!p) return;
        await apiFetch(`/api/products/${p.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...p, category: { id: selectedId } }),
        });
        setAttachId("");
        load();
    }

    async function detach(p) {
        await apiFetch(`/api/products/${p.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...p, category: null }),
        });
        load();
    }

    return (
        <AdminLayout>
            <h1>{t("category.title")}</h1>
            <form className="form" onSubmit={handleSubmit}>
                <h3>{editing ? t("category.edit") : t("category.new")}</h3>
                <div className="form-row">
                    <label>{t("category.name")}<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
                    <label>{t("category.nameFa")}<input value={form.nameFa} onChange={e => setForm({ ...form, nameFa: e.target.value })} /></label>
                </div>
                <div className="form-row">
                    <label>{t("category.slug")}<input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder={t("posts.autoSlug")} dir="ltr" /></label>
                </div>
                <label>{t("category.desc")}<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
                <label>{t("category.image")}
                    <input
                        value={form.imageUrl}
                        onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                        placeholder={t("products.imageHint")}
                        dir="ltr"
                    />
                </label>
                {form.imageUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                            src={imageSrc(form.imageUrl)}
                            alt=""
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                        />
                        <button type="button" className="small-btn danger" onClick={() => setForm({ ...form, imageUrl: "" })}>
                            {t("category.removeImage")}
                        </button>
                    </div>
                )}
                <div>
                    <label className="small-btn" style={{ cursor: "pointer" }}>
                        {uploading ? t("category.uploading") : t("category.upload")}
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                    </label>
                </div>
                <div>
                    <button className="btn" type="submit">{editing ? t("category.save") : t("category.create")}</button>
                    {editing && <button type="button" className="small-btn" style={{ marginInlineStart: 8 }} onClick={() => { setEditing(null); setForm(empty); }}>{t("category.cancel")}</button>}
                </div>
            </form>

            <table className="admin-table" style={{ marginTop: 28 }}>
                <thead><tr><th>{t("category.colName")}</th><th>{t("category.colSlug")}</th><th>{t("category.colProducts")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {categories.map(c => (
                        <tr key={c.id} style={c.id === selectedId ? { background: "var(--accent-soft)" } : {}}>
                            <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    {c.imageUrl && (
                                        <img
                                            src={imageSrc(c.imageUrl)}
                                            alt=""
                                            style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                                        />
                                    )}
                                    {labelOf(c.name, c.nameFa)}
                                </div>
                            </td>
                            <td className="muted" dir="ltr">{c.slug}</td>
                            <td>{countOf(c.id)}</td>
                            <td><div className="admin-actions">
                                <button className="small-btn" onClick={() => setSelectedId(c.id)}>{t("category.productsIn")}</button>
                                <button className="small-btn" onClick={() => startEdit(c)}>{t("common.edit")}</button>
                                <button className="small-btn danger" onClick={() => remove(c.id)}>{t("common.delete")}</button>
                            </div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {categories.length === 0 && <p className="muted">{t("category.empty")}</p>}

            {selected && (
                <div style={{ marginTop: 24 }}>
                    <h3>{t("category.productsIn")} {labelOf(selected.name, selected.nameFa)} » ({inCategory.length})</h3>
                    {inCategory.length === 0 && <p className="muted">{t("category.noProducts")}</p>}
                    {inCategory.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ flex: 1 }}>{p.name}</span>
                            <button className="small-btn danger" onClick={() => detach(p)}>{t("category.detach")}</button>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <select value={attachId} onChange={e => setAttachId(e.target.value)} style={{ flex: 1 }}>
                            <option value="">{t("category.selectProduct")}</option>
                            {outside.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}{p.category ? ` (${labelOf(p.category.name, p.category.nameFa)})` : ""}
                                </option>
                            ))}
                        </select>
                        <button className="small-btn" onClick={attach} disabled={!attachId}>{t("category.addProduct")}</button>
                    </div>
                </div>
            )}

            {/* ── Library book categories (dynamic translations) ── */}
            <h3 style={{ marginTop: 36 }}>{t("bookCat.title")}</h3>
            <p className="muted" style={{ margin: 0 }}>{t("bookCat.hint")}</p>
            <table className="admin-table" style={{ marginTop: 14 }}>
                <thead>
                    <tr>
                        <th>{t("bookCat.colName")}</th>
                        <th>{t("bookCat.colFa")}</th>
                        <th>{t("bookCat.colBooks")}</th>
                        <th>{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {bookCats.map(c => (
                        <tr key={c.slug}>
                            <td dir="ltr">{c.name}</td>
                            <td>
                                <input
                                    dir="rtl"
                                    value={catEdits[c.slug] ?? c.nameFa ?? ""}
                                    onChange={e => setCatEdits(v => ({ ...v, [c.slug]: e.target.value }))}
                                    placeholder={t("bookCat.colFa")}
                                    style={bookInputStyle}
                                    maxLength={120}
                                />
                            </td>
                            <td>{c.count}</td>
                            <td>
                                <div className="admin-actions">
                                    <button className="small-btn" onClick={() => saveCategoryName(c.slug)}>
                                        {t("category.save")}
                                    </button>
                                    <button
                                        className="small-btn danger"
                                        onClick={() => removeCategoryName(c.slug)}
                                        disabled={!c.nameFa}
                                    >
                                        {t("common.delete")}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {bookCats.length === 0 && <p className="muted">{t("bookCat.empty")}</p>}

            {/* ── Taxonomy fixer (null / wrong categories) ── */}
            <h3 style={{ marginTop: 36 }}>{t("bookCat.fixTitle")}</h3>
            <p className="muted" style={{ margin: 0 }}>{t("bookCat.fixHint")}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                <label className="small-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={onlyUncat} onChange={e => setOnlyUncat(e.target.checked)} />
                    {t("bookCat.onlyUncategorized")}
                </label>
                <input
                    value={bookQuery}
                    onChange={e => setBookQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") loadBookRows(); }}
                    placeholder={t("books.search")}
                    dir="ltr"
                    style={{ ...bookInputStyle, flex: 1, minWidth: 180 }}
                />
                <button className="small-btn" onClick={loadBookRows}>{t("common.search")}</button>
            </div>
            <table className="admin-table" style={{ marginTop: 12 }}>
                <thead>
                    <tr>
                        <th style={{ width: "45%" }}>{t("books.book")}</th>
                        <th>{t("bookCat.rawCategories")}</th>
                        <th>{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {bookRows.map(b => (
                        <tr key={b.id}>
                            <td>
                                <Link
                                    to={`/books/${b.id}`}
                                    style={{ color: "var(--accent)", textDecoration: "none" }}
                                >
                                    {b.title}
                                </Link>
                                <div className="muted" dir="ltr" style={{ fontSize: 12 }}>
                                    {[b.language, b.format && b.format.toUpperCase()].filter(Boolean).join(" · ")}
                                </div>
                            </td>
                            <td>
                                <input
                                    dir="ltr"
                                    value={bookEdits[b.id] ?? b.categories ?? ""}
                                    onChange={e => setBookEdits(v => ({ ...v, [b.id]: e.target.value }))}
                                    placeholder='Fiction - Classics'
                                    style={bookInputStyle}
                                />
                            </td>
                            <td>
                                <button className="small-btn" onClick={() => saveBookCategory(b)}>
                                    {t("category.save")}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {bookRows.length === 0 && <p className="muted">{t("bookCat.noMatches")}</p>}
        </AdminLayout>
    );
}
