import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";
import "../Support.css";

function fmtDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

const FILTERS = ["ALL", "OPEN", "ANSWERED", "CLOSED"];

export default function AdminTickets() {
    const { t } = useLanguage();
    usePageTitle(t("admin.tickets"));
    const [tickets, setTickets] = useState([]);
    const [filter, setFilter] = useState("ALL");
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");

    function load(nextFilter = filter) {
        setNotice("");
        const q = nextFilter && nextFilter !== "ALL" ? `?status=${nextFilter}` : "";
        apiFetch(`/api/admin/tickets${q}`)
            .then(data => setTickets(Array.isArray(data) ? data : []))
            .catch(e => setNotice(e.message));
    }

    useEffect(() => { load("ALL"); }, []);

    useEffect(() => {
        if (selectedId == null) {
            setDetail(null);
            return;
        }
        apiFetch(`/api/admin/tickets/${selectedId}`)
            .then(setDetail)
            .catch(e => setNotice(e.message));
    }, [selectedId]);

    function pickFilter(f) {
        setFilter(f);
        load(f);
    }

    async function sendReply(e) {
        e?.preventDefault();
        if (!reply.trim() || selectedId == null || sending) return;
        setSending(true);
        setNotice("");
        try {
            await apiFetch(`/api/admin/tickets/${selectedId}/messages`, {
                method: "POST",
                body: JSON.stringify({ message: reply.trim() }),
            });
            setReply("");
            setDetail(await apiFetch(`/api/admin/tickets/${selectedId}`));
            load();
        } catch (err) {
            setNotice(err.message);
        } finally {
            setSending(false);
        }
    }

    async function setStatus(status) {
        if (selectedId == null) return;
        try {
            const updated = await apiFetch(`/api/admin/tickets/${selectedId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
            setDetail(d => d ? { ...d, ticket: updated } : d);
            load();
        } catch (e) {
            setNotice(e.message);
        }
    }

    async function remove(id) {
        if (!window.confirm(t("support.confirmDelete"))) return;
        try {
            await apiFetch(`/api/admin/tickets/${id}`, { method: "DELETE" });
            if (id === selectedId) {
                setSelectedId(null);
                setDetail(null);
            }
            load();
        } catch (e) {
            setNotice(e.message);
        }
    }

    const messages = detail?.messages || [];
    const selected = detail?.ticket || null;

    return (
        <AdminLayout>
            <h1>{t("admin.tickets")}</h1>
            <p className="muted">{t("support.adminDesc")}</p>
            {notice && <p className="error">{notice}</p>}

            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
                {FILTERS.map(f => (
                    <button
                        key={f}
                        type="button"
                        className={`small-btn${filter === f ? " active" : ""}`}
                        onClick={() => pickFilter(f)}
                    >
                        {f === "ALL" ? t("support.filterAll") : t(`support.status_${f.toLowerCase()}`)}
                    </button>
                ))}
            </div>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>{t("support.subject")}</th>
                        <th>{t("support.user")}</th>
                        <th>{t("support.status")}</th>
                        <th>{t("support.updated")}</th>
                        <th>{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map(ticket => (
                        <tr key={ticket.id} style={ticket.id === selectedId ? { background: "var(--accent-soft)" } : undefined}>
                            <td>#{ticket.id}</td>
                            <td dir="auto">{ticket.subject}</td>
                            <td dir="auto">{ticket.username}</td>
                            <td>
                                <span className={`status status-${(ticket.status || "").toLowerCase()}`}>
                                    {t(`support.status_${(ticket.status || "open").toLowerCase()}`)}
                                </span>
                            </td>
                            <td className="muted">{fmtDate(ticket.updatedAt)}</td>
                            <td>
                                <div className="admin-actions">
                                    <button className="small-btn" onClick={() => setSelectedId(ticket.id)}>
                                        {t("support.view")}
                                    </button>
                                    <button className="small-btn danger" onClick={() => remove(ticket.id)}>
                                        {t("common.delete")}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {tickets.length === 0 && <p className="muted">{t("support.empty")}</p>}

            {selected && (
                <div className="support-detail" style={{ marginTop: 20 }}>
                    <h3 dir="auto">#{selected.id} — {selected.subject}</h3>
                    <p className="muted">
                        {selected.username} · {t(`support.status_${(selected.status || "open").toLowerCase()}`)} · {fmtDate(selected.createdAt)}
                    </p>
                    <div className="support-messages">
                        {messages.map(m => (
                            <div key={m.id} className={`support-msg ${m.admin ? "admin" : "user"}`}>
                                <div className="support-msg-head">
                                    {m.admin ? (
                                        <span className="support-badge admin" dir="auto">{t("support.admin")} ({m.senderUsername})</span>
                                    ) : (
                                        <span className="support-badge user" dir="auto">{m.senderUsername}</span>
                                    )}
                                    <span className="muted">{fmtDate(m.createdAt)}</span>
                                </div>
                                <div className="support-msg-text" dir="auto">{m.text}</div>
                            </div>
                        ))}
                    </div>
                    <form className="support-reply" onSubmit={sendReply}>
                        <textarea
                            rows={2}
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                            placeholder={t("support.replyPh")}
                            dir="auto"
                        />
                        <button className="btn" type="submit" disabled={sending || !reply.trim()}>
                            {t("support.send")}
                        </button>
                    </form>
                    <div className="admin-actions" style={{ marginTop: 12 }}>
                        <button className="small-btn" onClick={() => setStatus("ANSWERED")}>{t("support.markAnswered")}</button>
                        <button className="small-btn" onClick={() => setStatus("OPEN")}>{t("support.reopen")}</button>
                        <button className="small-btn" onClick={() => setStatus("CLOSED")}>{t("support.close")}</button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
