import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBuilderLayout from "../../components/PageBuilderLayout";
import "../../components/PageBuilderLayout.css";
import PuckPageBuilder from "../../components/PuckPageBuilder";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const empty = { title: "", slug: "", content: "{}", status: "PUBLISHED" };

export default function PageBuild() {
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    usePageTitle(editing ? t("pages.edit") : t("pages.new"));

    const idParam = searchParams.get("id");

    useEffect(() => {
        if (idParam) {
            apiFetch(`/api/pages/${idParam}`)
                .then(p => {
                    setEditing(p.id);
                    setForm({
                        title: p.title || "",
                        slug: p.slug || "",
                        content: typeof p.content === "string" ? p.content : JSON.stringify(p.content, null, 2),
                        status: p.status || "PUBLISHED",
                    });
                })
                .catch(() => {});
        }
    }, [idParam]);

    function handleChange(content) {
        setForm({ ...form, content });
    }

    async function handlePublish(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                title: form.title,
                slug: form.slug,
                content: form.content,
                status: "PUBLISHED",
            };
            if (editing) {
                await apiFetch(`/api/pages/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
            } else {
                await apiFetch("/api/pages", { method: "POST", body: JSON.stringify(payload) });
            }
            navigate("/admin/pages");
        } catch (err) {
            alert(err.message || "Failed to save page");
        } finally {
            setSubmitting(false);
        }
    }

    function handleCancel() {
        navigate("/admin/pages");
    }

    return (
        <PageBuilderLayout
            title={editing ? t("pages.edit") : t("pages.new")}
            onBack={handleCancel}
        >
            <form className="form" onSubmit={handlePublish}>
                <label>{t("pages.name")}
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </label>
                <div className="form-row">
                    <label>{t("pages.slug")}
                        <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required placeholder="/about-us" />
                    </label>
                    <label>{t("pages.statusLabel") || "Status"}
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="PUBLISHED">{t("pages.statusPublished") || "Published"}</option>
                            <option value="DRAFT">{t("pages.statusDraft") || "Draft"}</option>
                        </select>
                    </label>
                </div>
                <label style={{ marginTop: 16, display: "block", fontWeight: 600 }}>{t("pages.content")}</label>
                <PuckPageBuilder value={form.content} onChange={handleChange} />
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                    <button type="submit" className="btn" disabled={submitting}>
                        {submitting ? t("pages.saving") || "Saving…" : (editing ? t("pages.save") : t("pages.create"))}
                    </button>
                    <button type="button" className="small-btn" onClick={handleCancel} disabled={submitting}>
                        {t("pages.cancel")}
                    </button>
                </div>
            </form>
        </PageBuilderLayout>
    );
}
