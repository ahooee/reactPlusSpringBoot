import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import BlockEditor from "../../components/BlockEditor";
import BlockRenderer from "../../components/BlockRenderer";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";
import "./AdminPages.css";

const empty = { title: "", slug: "", content: "[]", status: "PUBLISHED" };

const MODES = [
    { id: "edit", icon: "✎" },
    { id: "preview", icon: "👁" },
    { id: "split", icon: "🧩" },
];

/**
 * Read-only preview of a page, rendered with the same components the
 * public site uses so the admin sees exactly what visitors will see.
 */
function PagePreview({ blocks, title, t }) {
    return (
        <article className="word-page">
            <header className="word-page-header">
                <h1>{title || t("page.notFound") || "Untitled Page"}</h1>
                <span className="word-page-kicker">Preview</span>
            </header>
            <div className="word-page-body">
                {blocks.length === 0 ? (
                    <div className="word-preview-empty">
                        <span className="word-preview-empty-icon">📄</span>
                        <p>{t("pages.previewEmpty")}</p>
                    </div>
                ) : (
                    blocks.map((block, i) => (
                        <BlockRenderer key={block.id || i} block={block} t={t} />
                    ))
                )}
            </div>
        </article>
    );
}

export default function AdminPages() {
    const [pages, setPages] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [mode, setMode] = useState("split");
    const { t } = useLanguage();
    usePageTitle(t("pages.title"));

    function load() {
        apiFetch("/api/pages").then(setPages).catch(() => {});
    }

    useEffect(load, []);

    function reset() {
        setForm(empty);
        setEditing(null);
        setMode("split");
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

    const blocks = useMemo(() => {
        try {
            const parsed = typeof form.content === "string" ? JSON.parse(form.content || "[]") : form.content;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [form.content]);

    const isRTL = document.dir === "rtl" || document.documentElement.dir === "rtl";

    return (
        <AdminLayout>
            <h1>{t("pages.title")}</h1>
            <p className="muted">{t("pages.hint")}</p>

            {/* ---------------- Word-like ribbon toolbar ---------------- */}
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

                    <div className="word-ribbon-group word-group-modes">
                        <span className="word-modes-label">{t("editor.block")}</span>
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                className={`word-mode-btn ${mode === m.id ? "active" : ""}`}
                                title={
                                    m.id === "edit"
                                        ? t("pages.modeEdit")
                                        : m.id === "preview"
                                            ? t("pages.modePreview")
                                            : t("pages.modeSplit")
                                }
                                onClick={() => setMode(m.id)}
                            >
                                {m.icon}
                            </button>
                        ))}
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

                {/* ---------------- Edit / Preview panes (Word split view) ---------------- */}
                <div className="word-split">
                    {mode !== "preview" && (
                        <section className="word-pane word-pane-editor">
                            <div className="word-pane-header">
                                <span className="word-pane-title">{t("pages.modeEdit")}</span>
                                <span className="word-pane-count">{t("pages.blocksCount", { n: blocks.length })}</span>
                            </div>
                            <BlockEditor
                                value={form.content}
                                onChange={content => setForm({ ...form, content })}
                            />
                        </section>
                    )}
                    {mode !== "edit" && (
                        <section className="word-pane word-pane-preview">
                            <div className="word-pane-header">
                                <span className="word-pane-title">{t("pages.livePreview")}</span>
                            </div>
                            <div className="word-preview-wrap">
                                <PagePreview blocks={blocks} title={form.title} t={t} />
                            </div>
                        </section>
                    )}
                </div>
            </form>

            <p className="muted" style={{ marginTop: 10 }}>
                {t("editor.dragToReorder") || "Drag blocks"} &nbsp;•&nbsp;
                {t("pages.modeSplit")} &nbsp;•&nbsp;
                {isRTL ? "rtl" : "ltr"}
            </p>

            {/* ---------------- Pages list ---------------- */}
            <table className="admin-table" style={{ marginTop: 28 }}>
                <thead>
                    <tr>
                        <th>{t("pages.colTitle")}</th>
                        <th>{t("pages.colSlug")}</th>
                        <th>{t("pages.statusLabel")}</th>
                        <th>{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {pages.map(p => (
                        <tr key={p.id}>
                            <td>{p.title}</td>
                            <td className="muted">/{p.slug}</td>
                            <td>
                                <span
                                    className={`status-chip ${p.status === "PUBLISHED" ? "published" : "draft"}`}
                                >
                                    {p.status === "PUBLISHED" ? t("pages.statusPublished") : t("pages.statusDraft")}
                                </span>
                            </td>
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
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
