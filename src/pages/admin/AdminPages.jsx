import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import WordPressEditor from "../../components/WordPressEditor";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";
import "./AdminPages.css";

const empty = { title: "", slug: "", content: JSON.stringify({ blocks: [], theme: "default" }), status: "PUBLISHED" };

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
        const payload = {
            ...form,
            content: form.content,
        };
        if (editing) {
            await apiFetch(`/api/pages/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
            await apiFetch("/api/pages", { method: "POST", body: JSON.stringify(payload) });
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

    const initialTheme = useMemo(() => {
        try {
            const parsed = typeof form.content === "string" ? JSON.parse(form.content || "{}") : form.content;
            return parsed && parsed.theme ? parsed.theme : "default";
        } catch { return "default"; }
    }, [form.content]);

    return (
        <AdminLayout>
            <h1>{t("pages.title")}</h1>
            <p className="muted">{t("pages.hint")}</p>

            <form className="word-form" onSubmit={handleSubmit}>
                <div className="word-ribbon">
                    <div className="word-ribbon-group word-group-file">
                        <label className="word-field">
                            <span>{t("pages.name")}</span>
                            <input
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                required
                                placeholder={t("pages.name")}
                            />
                        </label>
                        <label className="word-field">
                            <span>{t("pages.slug")}</span>
                            <input
                                value={form.slug}
                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                required
                                placeholder="/about-us"
                            />
                        </label>
                        <label className="word-field">
                            <span>{t("pages.statusLabel")}</span>
                            <select
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="PUBLISHED">{t("pages.statusPublished")}</option>
                                <option value="DRAFT">{t("pages.statusDraft")}</option>
                            </select>
                        </label>
                    </div>
                    <div className="word-ribbon-group word-group-actions">
                        <button type="submit" className="word-btn word-btn-primary">
                            {editing ? t("pages.save") : t("pages.create")}
                        </button>
                        {editing && (
                            <button type="button" className="word-btn word-btn-secondary" onClick={reset}>
                                {t("pages.cancel")}
                            </button>
                        )}
                    </div>
                </div>

                <WordPressEditor
                    value={form.content}
                    onChange={content => setForm({ ...form, content })}
                    initialTheme={initialTheme}
                />
            </form>

            <p className="muted" style={{ marginTop: 10 }}>
                {t("editor.dragToReorder") || "Drag blocks to reorder"}
            </p>

            <table className="admin-table" style={{ marginTop: 28 }}>
                <thead>
                    <tr>
                        <th>{t("pages.colTitle")}</th>
                        <th>{t("pages.colSlug")}</th>
                        <th>{t("pages.statusLabel")}</th>
                        <th>{t("pages.themeLabel") || "Theme"}</th>
                        <th>{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {pages.map(p => {
                        let theme = "default";
                        try {
                            const parsed = typeof p.content === "string" ? JSON.parse(p.content || "{}") : p.content;
                            if (parsed && parsed.theme) theme = parsed.theme;
                        } catch { /* ignore parse errors */ }
                        return (
                            <tr key={p.id}>
                                <td>{p.title}</td>
                                <td className="muted">/{p.slug}</td>
                                <td>
                                    <span className={`status-chip ${p.status === "PUBLISHED" ? "published" : "draft"}`}>
                                        {p.status === "PUBLISHED" ? t("pages.statusPublished") : t("pages.statusDraft")}
                                    </span>
                                </td>
                                <td>{theme}</td>
                                <td>
                                    <div className="admin-actions">
                                        <button className="small-btn" onClick={() => startEdit(p)}>
                                            {t("common.edit")}
                                        </button>
                                        <button className="small-btn danger" onClick={() => remove(p.id)}>
                                            {t("common.delete")}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </AdminLayout>
    );
}
