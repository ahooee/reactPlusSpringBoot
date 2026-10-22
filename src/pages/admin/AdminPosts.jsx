import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import RichTextEditor from "../../components/RichTextEditor";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const empty = { title: "", slug: "", excerpt: "", content: "", coverImage: "", status: "PUBLISHED" };

export default function AdminPosts() {
    const [posts, setPosts] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const { user } = useAuth();
    const { t } = useLanguage();
    usePageTitle(t("posts.title"));

    function load() {
        apiFetch("/api/posts?all=true").then(setPosts).catch(() => {});
    }

    useEffect(load, []);

    async function handleSubmit(e) {
        e.preventDefault();
        const payload = { ...form, authorUsername: user?.username || "admin" };
        if (editing) {
            await apiFetch(`/api/posts/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
            await apiFetch("/api/posts", { method: "POST", body: JSON.stringify(payload) });
        }
        setForm(empty);
        setEditing(null);
        load();
    }

    function startEdit(p) {
        setEditing(p.id);
        setForm({
            title: p.title || "",
            slug: p.slug || "",
            excerpt: p.excerpt || "",
            content: p.content || "",
            coverImage: p.coverImage || "",
            status: p.status || "PUBLISHED",
        });
    }

    async function remove(id) {
        if (!window.confirm(t("posts.confirmDelete"))) return;
        await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
        load();
    }

    return (
        <AdminLayout>
            <h1>{t("posts.title")}</h1>
            <form className="form" onSubmit={handleSubmit}>
                <h3>{editing ? t("posts.edit") : t("posts.new")}</h3>
                <label>{t("posts.name")}<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label>
                <div className="form-row">
                    <label>{t("posts.slug")}<input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder={t("posts.autoSlug")} /></label>
                    <label>{t("posts.status")}
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="PUBLISHED">{t("posts.published")}</option>
                            <option value="DRAFT">{t("posts.draft")}</option>
                        </select>
                    </label>
                </div>
                <label>{t("posts.excerpt")}<input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} /></label>
                <label>{t("posts.cover")}<input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} /></label>
                <label>{t("posts.content")}<RichTextEditor key={editing ?? "new"} value={form.content} onChange={html => setForm({ ...form, content: html })} /></label>
                <div>
                    <button className="btn" type="submit">{editing ? t("posts.save") : t("posts.create")}</button>
                    {editing && <button type="button" className="small-btn" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm(empty); }}>{t("posts.cancel")}</button>}
                </div>
            </form>

            <table className="admin-table" style={{ marginTop: 28 }}>
                <thead><tr><th>{t("posts.colTitle")}</th><th>{t("posts.colSlug")}</th><th>{t("posts.colStatus")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {posts.map(p => (
                        <tr key={p.id}>
                            <td>{p.title}</td>
                            <td className="muted">{p.slug}</td>
                            <td>{p.status}</td>
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
