import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Support.css";

function fmtDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

export default function Support() {
    const { t } = useLanguage();
    usePageTitle(t("support.title"));
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [creating, setCreating] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");

    function load() {
        setLoading(true);
        apiFetch("/api/tickets")
            .then(data => setTickets(Array.isArray(data) ? data : []))
            .catch(e => setNotice(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(load, []);

    useEffect(() => {
        if (selectedId == null) {
            setDetail(null);
            return;
        }
        apiFetch(`/api/tickets/${selectedId}`)
            .then(setDetail)
            .catch(e => setNotice(e.message));
    }, [selectedId]);

    async function createTicket(e) {
        e?.preventDefault();
        if (!subject.trim() || !message.trim()) return;
        setCreating(true);
        setNotice("");
        try {
            const res = await apiFetch("/api/tickets", {
                method: "POST",
                body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
            });
            setSubject("");
            setMessage("");
            await load();
            if (res?.ticket?.id) setSelectedId(res.ticket.id);
        } catch (err) {
            setNotice(err.message);
        } finally {
            setCreating(false);
        }
    }

    async function sendReply(e) {
        e?.preventDefault();
        if (!reply.trim() || selectedId == null || sending) return;
        setSending(true);
        setNotice("");
        try {
            await apiFetch(`/api/tickets/${selectedId}/messages`, {
                method: "POST",
                body: JSON.stringify({ message: reply.trim() }),
            });
            setReply("");
            const updated = await apiFetch(`/api/tickets/${selectedId}`);
            setDetail(updated);
            load();
        } catch (err) {
            setNotice(err.message);
        } finally {
            setSending(false);
        }
    }

    const selected = detail?.ticket || tickets.find(x => x.id === selectedId) || null;
    const messages = detail?.messages || [];

    return (
        <>
            <Navbar />
            <main className="page-wrap support">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("support.title") }]} />
                <h1>{t("support.title")}</h1>
                <p className="muted">{t("support.desc")}</p>
                {notice && <p className="error">{notice}</p>}

                <div className="support-grid">
                    <section className="support-list">
                        <h3>{t("support.myTickets")}</h3>
                        {loading && <p className="muted">{t("common.loading")}</p>}
                        {!loading && tickets.length === 0 && (
                            <p className="muted">{t("support.empty")}</p>
                        )}
                        {tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                type="button"
                                className={`support-item${ticket.id === selectedId ? " active" : ""}`}
                                onClick={() => setSelectedId(ticket.id)}
                            >
                                <span className="support-item-subject" dir="auto">{ticket.subject}</span>
                                <span className="support-item-meta">
                                    <span className={`status status-${(ticket.status || "").toLowerCase()}`}>
                                        {t(`support.status_${(ticket.status || "open").toLowerCase()}`)}
                                    </span>
                                    <span className="muted">#{ticket.id} · {fmtDate(ticket.updatedAt)}</span>
                                </span>
                            </button>
                        ))}

                        <form className="form support-new" onSubmit={createTicket}>
                            <h3>{t("support.newTicket")}</h3>
                            <label>{t("support.subject")}
                                <input value={subject} onChange={e => setSubject(e.target.value)} dir="auto" required />
                            </label>
                            <label>{t("support.message")}
                                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} dir="auto" required />
                            </label>
                            <button className="btn" type="submit" disabled={creating}>
                                {creating ? t("common.loading") : t("support.create")}
                            </button>
                        </form>
                    </section>

                    <section className="support-detail">
                        {!selected ? (
                            <p className="muted">{t("support.selectTicket")}</p>
                        ) : (
                            <>
                                <h3 dir="auto">{selected.subject}</h3>
                                <p className="muted">
                                    #{selected.id} · {t(`support.status_${(selected.status || "open").toLowerCase()}`)} · {fmtDate(selected.createdAt)}
                                </p>
                                <div className="support-messages">
                                    {messages.map(m => (
                                        <div key={m.id} className={`support-msg ${m.admin ? "admin" : "user"}`}>
                                            <div className="support-msg-head">
                                                {m.admin ? (
                                                    <span className="support-badge admin" dir="auto">{t("support.admin")}</span>
                                                ) : (
                                                    <span className="support-badge user" dir="auto">{m.senderUsername}</span>
                                                )}
                                                <span className="muted">{fmtDate(m.createdAt)}</span>
                                            </div>
                                            <div className="support-msg-text" dir="auto">{m.text}</div>
                                        </div>
                                    ))}
                                    {messages.length === 0 && <p className="muted">{t("common.loading")}</p>}
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
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
