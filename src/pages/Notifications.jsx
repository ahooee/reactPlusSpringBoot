import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { NOTIF_ICONS } from "../components/NotificationsBell";
import "../components/NotificationsBell.css";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";

function fmtTime(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

export default function Notifications() {
    const { t } = useLanguage();
    usePageTitle(t("notif.title"));
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState("");

    function load() {
        setLoading(true);
        apiFetch("/api/notifications?limit=100")
            .then(data => setItems(Array.isArray(data) ? data : []))
            .catch(e => setNotice(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(load, []);

    async function openItem(n) {
        try {
            if (!n.read) {
                await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" });
            }
        } catch {
            /* best-effort */
        }
        load();
        navigate(n.link || "/");
    }

    async function markAllRead() {
        try {
            await apiFetch("/api/notifications/read-all", { method: "POST" });
            load();
        } catch (e) {
            setNotice(e.message);
        }
    }

    async function remove(id) {
        try {
            await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
            load();
        } catch (e) {
            setNotice(e.message);
        }
    }

    async function clearAll() {
        if (!window.confirm(t("notif.confirmClear"))) return;
        try {
            await apiFetch("/api/notifications", { method: "DELETE" });
            load();
        } catch (e) {
            setNotice(e.message);
        }
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("notif.title") }]} />
                <h1>{t("notif.title")}</h1>
                <p className="muted">{t("notif.desc")}</p>
                {notice && <p className="error">{notice}</p>}

                <div className="notif-page-actions">
                    <button type="button" className="small-btn" onClick={markAllRead}>
                        {t("notif.markAllRead")}
                    </button>
                    {items.length > 0 && (
                        <button type="button" className="small-btn danger" onClick={clearAll}>
                            {t("notif.clear")}
                        </button>
                    )}
                </div>

                {loading && <p className="muted">{t("common.loading")}</p>}
                {!loading && items.length === 0 && (
                    <p className="muted">{t("notif.empty")}</p>
                )}

                <div className="notif-page-list">
                    {items.map(n => (
                        <div key={n.id} className={`notif-page-item${n.read ? "" : " unread"}`}>
                            <span className="notif-icon">{NOTIF_ICONS[n.type] || NOTIF_ICONS.GENERAL}</span>
                            <div className="notif-page-body">
                                <b dir="auto">{t(`notif.type_${(n.type || "general").toLowerCase()}`)}</b>
                                {n.subject && <span className="notif-page-text" dir="auto">{n.subject}</span>}
                                {n.preview && <span className="muted" dir="auto">{n.preview}</span>}
                                <span className="muted notif-time">{fmtTime(n.createdAt)}</span>
                                <div className="admin-actions" style={{ marginTop: 6 }}>
                                    {n.link && (
                                        <button type="button" className="small-btn" onClick={() => openItem(n)}>
                                            {t("notif.view")}
                                        </button>
                                    )}
                                    {!n.read && (
                                        <button type="button" className="small-btn" onClick={() => openItem(n)}>
                                            {t("notif.markRead")}
                                        </button>
                                    )}
                                    <button type="button" className="small-btn danger" onClick={() => remove(n.id)}>
                                        {t("common.delete")}
                                    </button>
                                </div>
                            </div>
                            {!n.read && <span className="notif-dot" />}
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
}
