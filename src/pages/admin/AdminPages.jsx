import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

export default function AdminPages() {
    const [pages, setPages] = useState([]);
    const { t } = useLanguage();
    const navigate = useNavigate();
    usePageTitle(t("pages.title"));

    function load() {
        apiFetch("/api/pages").then(setPages).catch(() => {});
    }

    useEffect(load, []);

    function handleAdd() {
        navigate("/admin/pages/build");
    }

    function startEdit(page) {
        navigate(`/admin/pages/build?id=${page.id}&slug=${encodeURIComponent(page.slug)}`);
    }

    async function remove(id) {
        if (!window.confirm(t("pages.confirmDelete"))) return;
        await apiFetch(`/api/pages/${id}`, { method: "DELETE" });
        load();
    }

    return (
        <AdminLayout>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
                <h1>{t("pages.title")}</h1>
                <button className="btn" type="button" onClick={handleAdd}>
                    {t("pages.addPage") || "+ Build Page"}
                </button>
            </div>
            <p className="muted">{t("pages.hint")}</p>

            <table className="admin-table" style={{ marginTop: 16 }}>
                <thead>
                    <tr>
                        <th>{t("pages.colTitle")}</th>
                        <th>{t("pages.colSlug")}</th>
                        <th>{t("pages.statusLabel") || "Status"}</th>
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
