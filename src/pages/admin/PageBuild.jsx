import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PuckPageBuilder from "../../components/PuckPageBuilder";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";
import "./PageBuild.css";

const empty = { title: "", slug: "", content: "{}", status: "PUBLISHED" };

export default function PageBuild() {
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const [loadedId, setLoadedId] = useState(null);
    const navigate = useNavigate();
    const { t } = useLanguage();
    usePageTitle(editing ? t("pages.edit") : t("pages.new"));

    const idParam = searchParams.get("id");
    const slugParam = searchParams.get("slug");
    const loadKey = idParam || slugParam;

    useEffect(() => {
        let cancelled = false;

        if (!loadKey) {
            return () => { cancelled = true; };
        }

        async function loadPage() {
            try {
                let page = null;
                if (slugParam) {
                    const res = await apiFetch(`/api/pages/${slugParam}`);
                    page = res?.data ?? res;
                } else {
                    const list = await apiFetch("/api/pages");
                    page = (Array.isArray(list) ? list : []).find(p => String(p.id) === String(idParam));
                }

                if (cancelled || !page) return;
                setEditing(page.id);
                const raw = typeof page.content === "string" ? page.content : JSON.stringify(page.content, null, 2);
                setForm({
                    title: page.title || "",
                    slug: page.slug || "",
                    content: raw || "{}",
                    status: page.status || "PUBLISHED",
                });
            } catch {
                // leave the form empty; the user can still create a new page
            } finally {
                if (!cancelled) setLoadedId(loadKey);
            }
        }

        loadPage();

        return () => { cancelled = true; };
    }, [idParam, slugParam, loadKey]);

    const ready = !loadKey || loadedId === loadKey;

    async function savePage(content) {
        if (!form.title.trim()) {
            alert(t("pages.nameRequired"));
            return;
        }
        if (!form.slug.trim()) {
            alert(t("pages.slugRequired"));
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: form.title,
                slug: form.slug,
                content: content ?? form.content,
                status: form.status || "PUBLISHED",
            };
            if (editing) {
                await apiFetch(`/api/pages/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
            } else {
                await apiFetch("/api/pages", { method: "POST", body: JSON.stringify(payload) });
            }
            navigate("/admin/pages");
        } catch (err) {
            alert(err.message || "Failed to save page");
            throw err;
        } finally {
            setSubmitting(false);
        }
    }

    function handleChange(content) {
        setForm(prev => ({ ...prev, content }));
    }

    function handlePuckPublish(data) {
        const content = JSON.stringify(data, null, 2);
        setForm(prev => ({ ...prev, content }));
        savePage(content).catch(() => {});
    }

    if (!ready) {
        return <div className="page-build-loading">{t("common.loading")}</div>;
    }

    return (
        <div className="page-build-page">
            <header className="page-build-header">
                <button className="page-build-back" type="button" onClick={() => navigate("/admin/pages")}>
                    ← {t("pages.backToPages") || "Back to pages"}
                </button>
                <div className="page-build-fields">
                    <label>
                        <span>{t("pages.name")}</span>
                        <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} required />
                    </label>
                    <label>
                        <span>{t("pages.slug")}</span>
                        <input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} required placeholder="/about-us" />
                    </label>
                    <label className="page-build-status">
                        <span>{t("pages.statusLabel")}</span>
                        <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                            <option value="PUBLISHED">{t("pages.statusPublished")}</option>
                            <option value="DRAFT">{t("pages.statusDraft")}</option>
                        </select>
                    </label>
                </div>
                <button type="button" className="page-build-save-btn" onClick={() => savePage()} disabled={submitting}>
                    {submitting ? (t("pages.saving") || "Saving…") : (editing ? t("pages.save") : t("pages.create"))}
                </button>
            </header>
            <main className="page-build-canvas">
                <PuckPageBuilder
                    value={form.content}
                    onChange={handleChange}
                    onPublish={handlePuckPublish}
                    viewHref={form.slug ? `/${form.slug.replace(/^\/+/, "")}` : undefined}
                    headerPath={form.slug ? `/${form.slug.replace(/^\/+/, "")}` : undefined}
                />
            </main>
        </div>
    );
}
