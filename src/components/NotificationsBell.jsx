import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "./NotificationsBell.css";

export const NOTIF_ICONS = {
    TICKET_ANSWER: "💬",
    TICKET_STATUS: "🎫",
    ORDER_PLACED: "📦",
    ORDER_STATUS: "🚚",
    GENERAL: "🔔",
};

function fmtTime(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

export default function NotificationsBell() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);

    const load = useCallback(async (silent) => {
        if (!user) return;
        try {
            const [list, count] = await Promise.all([
                apiFetch("/api/notifications?limit=10"),
                apiFetch("/api/notifications/unread-count"),
            ]);
            setItems(Array.isArray(list) ? list : []);
            setUnread(Number(count?.unread || 0));
        } catch {
            if (!silent) {
                setItems([]);
            }
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setItems([]);
            setUnread(0);
            setOpen(false);
            return;
        }
        load(false);
        const id = setInterval(() => load(true), 30000);
        return () => clearInterval(id);
    }, [user, load]);

    if (!user) return null;

    async function openItem(n) {
        try {
            if (!n.read) {
                await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" });
            }
        } catch {
            /* best-effort */
        }
        setOpen(false);
        load(true);
        navigate(n.link || "/notifications");
    }

    async function markAllRead(e) {
        e?.stopPropagation();
        try {
            await apiFetch("/api/notifications/read-all", { method: "POST" });
            load(true);
        } catch {
            /* best-effort */
        }
    }

    function viewAll() {
        setOpen(false);
        load(true);
        navigate("/notifications");
    }

    return (
        <div className="notif-wrap">
            <button
                className="cart-btn notif-btn"
                onClick={() => { setOpen(o => !o); load(true); }}
                title={t("nav.notifications")}
                aria-label={t("nav.notifications")}
            >
                🔔
                {unread > 0 && <span className="cart-badge">{unread > 99 ? "99+" : unread}</span>}
            </button>

            {open && (
                <>
                    <div className="notif-backdrop" onClick={() => setOpen(false)} />
                    <div className="notif-panel">
                        <div className="notif-head">
                            <b>{t("notif.title")}</b>
                            {unread > 0 && (
                                <button type="button" className="small-btn" onClick={markAllRead}>
                                    {t("notif.markAllRead")}
                                </button>
                            )}
                        </div>
                        <div className="notif-list">
                            {items.length === 0 && (
                                <p className="muted notif-empty">{t("notif.empty")}</p>
                            )}
                            {items.map(n => (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`notif-item${n.read ? "" : " unread"}`}
                                    onClick={() => openItem(n)}
                                >
                                    <span className="notif-icon">{NOTIF_ICONS[n.type] || NOTIF_ICONS.GENERAL}</span>
                                    <span className="notif-body">
                                        <span className="notif-title" dir="auto">
                                            {t(`notif.type_${(n.type || "general").toLowerCase()}`)}
                                        </span>
                                        {n.subject && (
                                            <span className="notif-subject" dir="auto">{n.subject}</span>
                                        )}
                                        {n.preview && (
                                            <span className="notif-preview" dir="auto">{n.preview}</span>
                                        )}
                                        <span className="muted notif-time">{fmtTime(n.createdAt)}</span>
                                    </span>
                                    {!n.read && <span className="notif-dot" />}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="small-btn notif-view-all" onClick={viewAll}>
                            {t("notif.viewAll")}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
