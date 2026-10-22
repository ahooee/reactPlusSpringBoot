import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { discountOf, finalPrice, hasDiscount, money } from "../../lib/price";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const empty = { name: "", slug: "", description: "", price: "100000", imageUrl: "", stock: 10, maxPerOrder: 1, active: true, categoryId: "", discountPercent: 0, bookType: "PDF", author: "", translator: "", publisher: "", isbn: "", language: "", coverType: "", bookSize: "", pageCount: "", edition: "", weightGrams: "", publishYear: "" };

function numOrNull(v) {
    return v === "" || v == null ? null : Number(v);
}

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const { t, lang } = useLanguage();
    usePageTitle(t("products.title"));
    const catLabel = c => (lang === "fa" ? (c.nameFa || c.name) : (c.name || c.nameFa));

    function load() {
        apiFetch("/api/products?all=true").then(setProducts).catch(() => {});
        apiFetch("/api/categories").then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {});
    }

    useEffect(load, []);

    const isEbookForm = form.bookType !== "PAPER";

    async function handleSubmit(e) {
        e.preventDefault();
        const { categoryId, ...rest } = form;
        const payload = {
            ...rest,
            price: Number(rest.price),
            stock: Number(rest.stock),
            // E-books are immutable: always 1 per order.
            maxPerOrder: isEbookForm ? 1 : Math.max(1, Number(rest.maxPerOrder) || 1),
            bookType: rest.bookType === "PAPER" ? "PAPER" : "PDF",
            discountPercent: Math.max(0, Math.min(100, Number(rest.discountPercent) || 0)),
            pageCount: numOrNull(rest.pageCount),
            edition: numOrNull(rest.edition),
            weightGrams: numOrNull(rest.weightGrams),
            category: categoryId ? { id: Number(categoryId) } : null,
        };
        if (editing) {
            await apiFetch(`/api/products/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
            await apiFetch("/api/products", { method: "POST", body: JSON.stringify(payload) });
        }
        setForm(empty);
        setEditing(null);
        load();
    }

    function startEdit(p) {
        setEditing(p.id);
        setForm({
            name: p.name || "",
            slug: p.slug || "",
            description: p.description || "",
            price: String(p.price ?? "0"),
            imageUrl: p.imageUrl || "",
            stock: p.stock ?? 0,
            maxPerOrder: p.bookType === "PAPER" ? (p.maxPerOrder ?? 1) : 1,
            active: p.active ?? true,
            discountPercent: p.discountPercent ?? 0,
            bookType: p.bookType === "PAPER" ? "PAPER" : "PDF",
            categoryId: p.category?.id ? String(p.category.id) : "",
            author: p.author || "",
            translator: p.translator || "",
            publisher: p.publisher || "",
            isbn: p.isbn || "",
            language: p.language || "",
            coverType: p.coverType || "",
            bookSize: p.bookSize || "",
            pageCount: p.pageCount ?? "",
            edition: p.edition ?? "",
            weightGrams: p.weightGrams ?? "",
            publishYear: p.publishYear || "",
        });
    }

    async function remove(id) {
        if (!window.confirm(t("products.confirmDelete"))) return;
        await apiFetch(`/api/products/${id}`, { method: "DELETE" });
        load();
    }

    return (
        <AdminLayout>
            <h1>{t("products.title")}</h1>
            <form className="form" onSubmit={handleSubmit}>
                <h3>{editing ? t("products.edit") : t("products.new")}</h3>
                <div className="form-row">
                    <label>{t("products.name")}<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
                    <label>{t("products.slug")}<input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></label>
                </div>
                <label>{t("products.desc")}<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
                <label>{t("products.image")}<input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder={t("products.imageHint")} /></label>
                <div className="form-row">
                    <label>{t("products.price")}<input type="number" step="1" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></label>
                    <label>{t("products.discount")}<input type="number" min="0" max="100" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} /></label>
                    <label>{t("products.stock")}<input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></label>
                </div>
                <label>{t("products.maxPerOrder")}
                    <input
                        type="number"
                        min="1"
                        value={isEbookForm ? 1 : form.maxPerOrder}
                        disabled={isEbookForm}
                        title={isEbookForm ? t("products.fixedPerOrderNote") : undefined}
                        onChange={e => setForm({ ...form, maxPerOrder: e.target.value })}
                    />
                    {isEbookForm && <span className="muted">{t("products.fixedPerOrderNote")}</span>}
                </label>
                <label>{t("products.bookType")}
                    <select
                        value={form.bookType}
                        onChange={e => {
                            const nextType = e.target.value;
                            setForm(f => ({
                                ...f,
                                bookType: nextType,
                                maxPerOrder: nextType === "PAPER" ? (f.maxPerOrder ?? 1) : 1,
                            }));
                        }}
                    >
                        <option value="PDF">{t("products.bookTypePdf")}</option>
                        <option value="PAPER">{t("products.bookTypePaper")}</option>
                    </select>
                </label>
                <label>{t("products.category")}
                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                        <option value="">{t("products.uncategorized")}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}
                    </select>
                </label>
                <label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> {t("products.active")}</label>
                <h3 style={{ margin: "8px 0 0" }}>{t("product.detailsTab")}</h3>
                <div className="form-row">
                    <label>{t("product.author")}<input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></label>
                    <label>{t("product.translator")}<input value={form.translator} onChange={e => setForm({ ...form, translator: e.target.value })} /></label>
                </div>
                <div className="form-row">
                    <label>{t("product.publisher")}<input value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} /></label>
                    <label>{t("product.isbn")}<input value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} dir="ltr" /></label>
                </div>
                <div className="form-row">
                    <label>{t("product.language")}<input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} /></label>
                    <label>{t("product.cover")}<input value={form.coverType} onChange={e => setForm({ ...form, coverType: e.target.value })} /></label>
                </div>
                <div className="form-row">
                    <label>{t("product.size")}<input value={form.bookSize} onChange={e => setForm({ ...form, bookSize: e.target.value })} /></label>
                    <label>{t("product.pageCount")}<input type="number" min="1" value={form.pageCount} onChange={e => setForm({ ...form, pageCount: e.target.value })} /></label>
                </div>
                <div className="form-row">
                    <label>{t("product.edition")}<input type="number" min="1" value={form.edition} onChange={e => setForm({ ...form, edition: e.target.value })} /></label>
                    <label>{t("product.weight")} ({t("product.grams")})<input type="number" min="0" value={form.weightGrams} onChange={e => setForm({ ...form, weightGrams: e.target.value })} /></label>
                </div>
                <label>{t("product.year")}<input value={form.publishYear} onChange={e => setForm({ ...form, publishYear: e.target.value })} /></label>
                <div>
                    <button className="btn" type="submit">{editing ? t("products.save") : t("products.create")}</button>
                    {editing && <button type="button" className="small-btn" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm(empty); }}>{t("products.cancel")}</button>}
                </div>
            </form>

            <table className="admin-table" style={{ marginTop: 28 }}>
                <thead><tr><th>{t("products.colName")}</th><th>{t("products.colCategory")}</th><th>{t("products.colType")}</th><th>{t("products.colPrice")}</th><th>{t("products.colStock")}</th><th>{t("products.colMaxPerOrder")}</th><th>{t("products.colActive")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>{p.category ? catLabel(p.category) : <span className="muted">{t("products.uncategorized")}</span>}</td>
                            <td>{p.bookType === "PAPER" ? t("products.bookTypePaper") : t("products.bookTypePdf")}</td>
                            <td>
                                {money(finalPrice(p), lang)}
                                {hasDiscount(p) && <span className="muted"> (−%{discountOf(p)})</span>}
                            </td>
                            <td>{p.stock}</td>
                            <td>{p.bookType === "PAPER" ? (p.maxPerOrder ?? 1) : 1}</td>
                            <td>{p.active ? t("products.yes") : t("products.no")}</td>
                            <td><div className="admin-actions">
                                <button className="small-btn" onClick={() => startEdit(p)}>{t("common.edit")}</button>
                                <button className="small-btn danger" onClick={() => remove(p.id)}>{t("common.delete")}</button>
                            </div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
