import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import RichTextEditor from "../../components/RichTextEditor";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const empty = { title: "", slug: "", content: "", status: "PUBLISHED" };

function isJsonObject(s) {
    if (typeof s !== "string") return false;
    const trimmed = s.trim();
    if (!trimmed.startsWith("{")) return false;
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed);
    } catch {
        return false;
    }
}

export default function AdminPages() {
    const [pages, setPages] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [mode, setMode] = useState("visual");
    const { t } = useLanguage();
    usePageTitle(t("pages.title"));

    function load() {
        apiFetch("/api/pages").then(setPages).catch(() => {});
    }

    useEffect(load, []);

    function reset() {
        setForm(empty);
        setEditing(null);
        setMode("visual");
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
        const raw = typeof p.content === "string" ? p.content : JSON.stringify(p.content, null, 2);
        if (isJsonObject(raw)) {
            setMode("source");
            try {
                setForm({
                    title: p.title || "",
                    slug: p.slug || "",
                    content: JSON.stringify(JSON.parse(raw), null, 2),
                    status: p.status || "PUBLISHED",
                });
            } catch {
                setForm({ title: p.title || "", slug: p.slug || "", content: raw, status: p.status || "PUBLISHED" });
            }
        } else {
            setMode("visual");
            setForm({
                title: p.title || "",
                slug: p.slug || "",
                content: raw || "",
                status: p.status || "PUBLISHED",
            });
        }
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
                    <div className="admin-actions" style={{ marginBottom: 8 }}>
                        <button type="button" className={`small-btn${mode === "visual" ? " active" : ""}`} onClick={() => setMode("visual")}>{t("pages.modeVisual")}</button>
                        <button type="button" className={`small-btn${mode === "source" ? " active" : ""}`} onClick={() => setMode("source")}>{t("pages.modeSource")}</button>
                    </div>
                    {mode === "visual" ? (
                        <RichTextEditor
                            key={editing ?? "new"}
                            value={isJsonObject(form.content) ? "" : form.content}
                            onChange={html => setForm({ ...form, content: html })}
                        />
                    ) : (
                        <textarea
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            rows={12}
                            dir="auto"
                        />
                    )}
                    {isJsonObject(form.content) && mode === "visual" && (
                        <p className="muted" style={{ marginTop: 6 }}>{t("pages.jsonNote")}</p>
                    )}
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
