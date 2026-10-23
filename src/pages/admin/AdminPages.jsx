import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import BlockEditor from "../../components/BlockEditor";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const empty = { title: "", slug: "", content: "[]", status: "PUBLISHED" };

export default function AdminPages() {
    const [pages, setPages] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const { t } = useLanguage();
    usePageTitle(t("pages.title"));

    function load() {
        apiFetch("/api/pages").then(setPages).catch(() => {});
    }

    useEffect(load, []);

    function reset() {
        setForm(empty);
        setEditing(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (editing) {
            await apiFetch(`/api/pages/${editing}`, { method: "PUT", body: JSON.stringify(form) });
        } else {
            await apiFetch("/api/pages", { method: "POST", body: JSON.stringify(form) });
        }
        reset();
        load();
    }

    function startEdit(p) {
        setEditing(p.id);
        setForm({
            title: p.title || "",
            slug: p.slug || "",
            content: typeof p.content === "string" ? p.content : JSON.stringify(p.content, null, 2),
            status: p.status || "PUBLISHED",
        });
    }

    async function remove(id) {
        if (!window.confirm(t("pages.confirmDelete"))) return;
        await apiFetch(`/api/pages/${id}`, { method: "DELETE" });
        load();
    }

    return (
        <AdminLayout>
            <h1>{t("pages.title")}</h1>
            <p className="muted">{t("pages.hint")}</p>
            <form className="form" onSubmit={handleSubmit}>
                <h3>{editing ? t("pages.edit") : t("pages.new")}</h3>
                <div className="form-row">
                    <label>{t("pages.name")}<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label>
                    <label>{t("pages.slug")}<input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required /></label>
                </div>
                <div>
                    <label>{t("pages.content")}</label>
                    <BlockEditor
                        value={form.content}
                        onChange={content => setForm({ ...form, content })}
                    />
                </div>
                <div>
                    <button className="btn" type="submit">{editing ? t("pages.save") : t("pages.create")}</button>
                    {editing && <button type="button" className="small-btn" style={{ marginLeft: 8 }} onClick={reset}>{t("pages.cancel")}</button>}
                </div>
            </form>

            <table className="admin-table" style={{ marginTop: 28 }}>
                <thead><tr><th>{t("pages.colTitle")}</th><th>{t("pages.colSlug")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {pages.map(p => (
                        <tr key={p.id}>
                            <td>{p.title}</td>
                            <td className="muted">/{p.slug}</td>
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
