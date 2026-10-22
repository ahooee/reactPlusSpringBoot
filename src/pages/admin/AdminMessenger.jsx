import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_URL, apiFetch, authHeaders } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";
import "./AdminMessenger.css";

const PAGE_SIZE = 50;
const blobCache = new Map();

async function tgBlobUrl(fileId, fileName, signal) {
    if (blobCache.has(fileId)) return blobCache.get(fileId);
    const q = fileName ? `?name=${encodeURIComponent(fileName)}` : "";
    const res = await fetch(`${API_URL}/api/admin/messenger/files/${fileId}${q}`, {
        headers: authHeaders(),
        signal,
    });
    if (!res.ok) throw new Error(`file ${res.status}`);
    const url = URL.createObjectURL(await res.blob());
    blobCache.set(fileId, url);
    return url;
}

function fmtTime(dateSecs) {
    const d = new Date(dateSecs * 1000);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString();
}

function Avatar({ chat, size = 40 }) {
    const [url, setUrl] = useState(() => (
        chat?.photoFileId ? blobCache.get(chat.photoFileId) || null : null
    ));
    useEffect(() => {
        if (!chat?.photoFileId || blobCache.has(chat.photoFileId)) return undefined;
        const ctrl = new AbortController();
        let alive = true;
        tgBlobUrl(chat.photoFileId, undefined, ctrl.signal)
            .then(u => alive && setUrl(u))
            .catch(() => alive && setUrl(null));
        return () => { alive = false; ctrl.abort(); };
    }, [chat?.photoFileId]);
    const letter = (chat?.title || "?").trim().charAt(0).toUpperCase() || "?";
    if (url) return <img className="msgr-avatar" style={{ width: size, height: size }} src={url} alt="" />;
    return <div className="msgr-avatar msgr-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.45 }}>{letter}</div>;
}

/**
 * Attachment renderer. Nothing is downloaded until the admin clicks:
 * auto-fetching every file (e.g. movies in a channel) would buffer gigabytes
 * into RAM and stall the backend.
 */
function TgMedia({ fileId, kind, fileName }) {
    const { t } = useLanguage();
    const cached = blobCache.get(fileId) || null;
    const [url, setUrl] = useState(cached);
    const [state, setState] = useState(cached ? "ready" : "idle"); // idle|loading|ready|failed

    useEffect(() => {
        if (state !== "loading" || !fileId) return undefined;
        const ctrl = new AbortController();
        let alive = true;
        tgBlobUrl(fileId, fileName, ctrl.signal)
            .then(u => { if (alive) { setUrl(u); setState("ready"); } })
            .catch(() => { if (alive) setState("failed"); });
        return () => { alive = false; ctrl.abort(); };
    }, [state, fileId, fileName]);

    if (state === "ready" && url) {
        if (kind === "photo" || kind === "sticker") {
            return <a href={url} target="_blank" rel="noreferrer"><img className="msgr-img" src={url} alt={fileName || ""} /></a>;
        }
        if (kind === "video" || kind === "video_note" || kind === "animation") {
            return <video className="msgr-video" src={url} controls preload="metadata" />;
        }
        if (kind === "voice" || kind === "audio") {
            return <audio className="msgr-audio" src={url} controls preload="metadata" />;
        }
        return (
            <a className="msgr-file" href={url} download={fileName || true}>
                <span className="msgr-file-icon">📄</span>
                <span className="msgr-file-name" dir="auto">{fileName || "document"}</span>
            </a>
        );
    }
    if (state === "loading") {
        return <div className="msgr-media msgr-media-loading">{t("messenger.loadingFile")}</div>;
    }
    if (state === "failed") {
        return (
            <button type="button" className="msgr-media-load" onClick={() => setState("loading")}>
                ⚠ {t("messenger.retry")}
            </button>
        );
    }
    const placeholder = kind === "photo" || kind === "sticker"
        ? `🖼 ${t("messenger.viewPhoto")}`
        : kind === "video" || kind === "video_note" || kind === "animation"
            ? `🎬 ${t("messenger.loadVideo")}`
            : kind === "voice" || kind === "audio"
                ? `🎵 ${t("messenger.loadAudio")}`
                : `📄 ${fileName || t("messenger.loadFile")}`;
    return (
        <button type="button" className="msgr-media-load" onClick={() => setState("loading")}>
            {placeholder}
        </button>
    );
}

export default function AdminMessenger() {
    const { t } = useLanguage();
    usePageTitle(t("admin.messenger"));
    const [status, setStatus] = useState(null);
    const [chats, setChats] = useState([]);
    const [chatsLoading, setChatsLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [newTarget, setNewTarget] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [canLoadMore, setCanLoadMore] = useState(false);
    const [msgsLoading, setMsgsLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState("");
    const msgsRef = useRef(null);
    const stickRef = useRef(true);
    const selectedRef = useRef(null);

    function selectChat(id) {
        selectedRef.current = id;
        setSelectedId(id);
    }

    const selectedChat = chats.find(c => String(c.id) === String(selectedId)) || null;

    const loadChats = useCallback(async (silent) => {
        if (!silent) setChatsLoading(true);
        try {
            const list = await apiFetch("/api/admin/messenger/chats?limit=50");
            setChats(Array.isArray(list) ? list : []);
            setNotice("");
        } catch (e) {
            if (!silent) setNotice(e.message);
        } finally {
            if (!silent) setChatsLoading(false);
        }
    }, []);

    const loadStatus = useCallback(async () => {
        try {
            setStatus(await apiFetch("/api/admin/messenger/status"));
        } catch (e) {
            setNotice(e.message);
        }
    }, []);

    const markRead = useCallback(async (chatId, msgs) => {
        const ids = (msgs || []).filter(m => !m.outgoing).map(m => m.id);
        if (ids.length === 0) return;
        try {
            await apiFetch(`/api/admin/messenger/chats/${chatId}/read`, {
                method: "POST",
                body: JSON.stringify({ messageIds: ids }),
            });
        } catch { /* read receipts are best-effort */ }
    }, []);

    const fetchMessages = useCallback(async (chatId, { silent } = {}) => {
        const res = await apiFetch(`/api/admin/messenger/chats/${chatId}/messages?limit=${PAGE_SIZE}`);
        if (String(selectedRef.current) !== String(chatId)) return null;
        setMessages(res.messages || []);
        setCanLoadMore(!!res.canLoadMore);
        if (!silent) {
            stickRef.current = true;
            requestAnimationFrame(() => {
                const el = msgsRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            });
        }
        markRead(chatId, res.messages || []);
        return res;
    }, [markRead]);

    // initial load + chat list refresh
    useEffect(() => {
        const t = setTimeout(() => {
            loadStatus();
            loadChats(false);
        }, 0);
        const id = setInterval(() => loadChats(true), 15000);
        return () => { clearTimeout(t); clearInterval(id); };
    }, [loadStatus, loadChats]);

    // open chat -> load history
    useEffect(() => {
        if (selectedId == null) return;
        selectedRef.current = selectedId;
        let alive = true;
        const t = setTimeout(() => {
            setMsgsLoading(true);
            setMessages([]);
            fetchMessages(selectedId).catch(e => alive && setNotice(e.message)).finally(() => alive && setMsgsLoading(false));
        }, 0);
        return () => { alive = false; clearTimeout(t); };
    }, [selectedId, fetchMessages]);

    // live polling of the open chat
    useEffect(() => {
        if (selectedId == null) return;
        const id = setInterval(async () => {
            try {
                const res = await fetchMessages(selectedId, { silent: true });
                if (res && stickRef.current && msgsRef.current) {
                    msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
                }
            } catch { /* keep old messages on transient errors */ }
        }, 4000);
        return () => clearInterval(id);
    }, [selectedId, fetchMessages]);

    function onScroll() {
        const el = msgsRef.current;
        if (!el) return;
        stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    }

    async function loadOlder() {
        if (!selectedId || messages.length === 0 || loadingOlder) return;
        setLoadingOlder(true);
        try {
            const oldest = messages[0].id;
            const res = await apiFetch(
                `/api/admin/messenger/chats/${selectedId}/messages?limit=${PAGE_SIZE}&fromMessageId=${oldest}`);
            const seen = new Set(messages.map(m => m.id));
            const older = (res.messages || []).filter(m => !seen.has(m.id));
            if (older.length > 0) {
                const el = msgsRef.current;
                const prevHeight = el ? el.scrollHeight : 0;
                setMessages([...older, ...messages]);
                requestAnimationFrame(() => {
                    if (el) el.scrollTop = el.scrollHeight - prevHeight;
                });
            }
            setCanLoadMore(!!res.canLoadMore && older.length > 0);
        } catch (e) {
            setNotice(e.message);
        } finally {
            setLoadingOlder(false);
        }
    }

    async function openNewChat(e) {
        e?.preventDefault();
        const target = newTarget.trim();
        if (!target) return;
        setNotice("");
        try {
            const chat = await apiFetch(`/api/admin/messenger/resolve?target=${encodeURIComponent(target)}`);
            setChats(prev => {
                if (prev.some(c => String(c.id) === String(chat.id))) return prev;
                return [chat, ...prev];
            });
            setNewTarget("");
            selectChat(chat.id);
        } catch (err) {
            setNotice(err.message);
        }
    }

    async function sendCurrent() {
        if (selectedId == null || sending) return;
        const body = text.trim();
        if (!body && !file) return;
        setSending(true);
        setNotice("");
        try {
            let sent;
            if (file) {
                const form = new FormData();
                form.append("file", file);
                form.append("kind", "auto");
                if (body) form.append("caption", body);
                if (replyTo) form.append("replyToMessageId", replyTo.id);
                sent = await apiFetch(`/api/admin/messenger/chats/${selectedId}/files`, { method: "POST", body: form });
            } else {
                sent = await apiFetch(`/api/admin/messenger/chats/${selectedId}/messages`, {
                    method: "POST",
                    body: JSON.stringify({ text: body, replyToMessageId: replyTo ? replyTo.id : 0 }),
                });
            }
            setMessages(prev => [...prev.filter(m => m.id !== sent.id), sent]);
            setText("");
            setFile(null);
            setReplyTo(null);
            stickRef.current = true;
            requestAnimationFrame(() => {
                const el = msgsRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            });
            loadChats(true);
        } catch (e) {
            setNotice(e.message);
        } finally {
            setSending(false);
        }
    }

    function quoteOf(id) {
        const m = messages.find(x => x.id === id);
        if (!m) return `#${id}`;
        if (m.text) return m.text.length > 80 ? m.text.slice(0, 80) + "…" : m.text;
        return `[${m.kind}]${m.fileName ? " " + m.fileName : ""}`;
    }

    const visibleChats = chats.filter(c => {
        const q = filter.trim().toLowerCase();
        if (!q) return true;
        return (c.title || "").toLowerCase().includes(q);
    });

    const showNames = selectedChat && ["group", "supergroup", "channel"].includes(selectedChat.type);

    return (
        <AdminLayout>
            <h1>{t("admin.messenger")}</h1>
            <p className="muted">{t("messenger.desc")}</p>
            {status && !status.running && <p className="msgr-warn">{t("messenger.stopped")}</p>}
            {status && status.running && !status.loggedIn && <p className="msgr-warn">{t("messenger.notLoggedIn")}</p>}
            {notice && <p className="msgr-warn">{notice}</p>}

            <div className="msgr">
                <aside className="msgr-side">
                    <form className="msgr-newchat" onSubmit={openNewChat}>
                        <input
                            value={newTarget}
                            onChange={e => setNewTarget(e.target.value)}
                            placeholder={t("messenger.newChatPh")}
                            dir="ltr"
                        />
                        <button className="small-btn" type="submit">{t("messenger.open")}</button>
                    </form>
                    <input
                        className="msgr-search"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder={t("messenger.search")}
                        dir="auto"
                    />
                    <div className="msgr-chats">
                        {chatsLoading && <p className="muted">{t("bot.loading")}</p>}
                        {!chatsLoading && visibleChats.length === 0 && (
                            <p className="muted">{t("messenger.noChats")}</p>
                        )}
                        {visibleChats.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                className={`msgr-chat${String(c.id) === String(selectedId) ? " active" : ""}`}
                                onClick={() => selectChat(c.id)}
                            >
                                <Avatar key={c.id} chat={c} />
                                <span className="msgr-chat-info">
                                    <span className="msgr-chat-row">
                                        <span className="msgr-chat-title" dir="auto">{c.title}</span>
                                        {c.lastMessage && (
                                            <span className="msgr-chat-time">{fmtTime(c.lastMessage.date)}</span>
                                        )}
                                    </span>
                                    <span className="msgr-chat-row">
                                        <span className="msgr-chat-preview" dir="auto">
                                            {(c.lastMessage?.outgoing ? `${t("messenger.you")}: ` : "") + (c.lastMessage?.preview || "")}
                                        </span>
                                        {c.unreadCount > 0 && (
                                            <span className="msgr-badge">{c.unreadCount}</span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="msgr-main">
                    {!selectedChat ? (
                        <p className="muted msgr-empty">{t("messenger.selectChat")}</p>
                    ) : (
                        <>
                            <header className="msgr-header">
                                <Avatar key={selectedChat.id} chat={selectedChat} size={36} />
                                <div>
                                    <div className="msgr-header-title" dir="auto">{selectedChat.title}</div>
                                    <div className="muted msgr-header-sub">{t(`messenger.type_${selectedChat.type}`)}</div>
                                </div>
                            </header>

                            <div className="msgr-msgs" ref={msgsRef} onScroll={onScroll}>
                                {canLoadMore && (
                                    <button type="button" className="small-btn msgr-load-older" onClick={loadOlder} disabled={loadingOlder}>
                                        {loadingOlder ? t("bot.loading") : t("messenger.loadOlder")}
                                    </button>
                                )}
                                {msgsLoading && <p className="muted">{t("bot.loading")}</p>}
                                {!msgsLoading && messages.length === 0 && (
                                    <p className="muted">{t("messenger.noMessages")}</p>
                                )}
                                {messages.map(m => (
                                    <div key={m.id} className={`msgr-msg ${m.outgoing ? "out" : "in"}`}>
                                        {!m.outgoing && showNames && (
                                            <div className="msgr-sender" dir="auto">{m.senderName}</div>
                                        )}
                                        {m.replyToMessageId > 0 && (
                                            <div className="msgr-quote" dir="auto">{quoteOf(m.replyToMessageId)}</div>
                                        )}
                                        {m.fileId > 0 && <TgMedia key={m.fileId} fileId={m.fileId} kind={m.kind} fileName={m.fileName} />}
                                        {m.text && <div className="msgr-text" dir="auto">{m.text}</div>}
                                        <div className="msgr-meta">
                                            <span>{fmtTime(m.date)}</span>
                                            {m.outgoing && <span> ✓</span>}
                                            <button
                                                type="button"
                                                className="msgr-reply-btn"
                                                title={t("messenger.reply")}
                                                onClick={() => setReplyTo(m)}
                                            >↩</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {replyTo && (
                                <div className="msgr-replybar" dir="auto">
                                    <span><b>{t("messenger.replyingTo")}:</b> {quoteOf(replyTo.id)}</span>
                                    <button type="button" className="small-btn" onClick={() => setReplyTo(null)}>
                                        {t("messenger.cancel")}
                                    </button>
                                </div>
                            )}
                            <div className="msgr-composer">
                                <label className="small-btn msgr-attach" title={t("messenger.attach")}>
                                    📎
                                    <input type="file" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
                                </label>
                                {file && (
                                    <span className="msgr-file-chip" dir="auto">
                                        {file.name}
                                        <button type="button" onClick={() => setFile(null)}>✕</button>
                                    </span>
                                )}
                                <textarea
                                    rows={1}
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    placeholder={t("messenger.typeMessage")}
                                    dir="auto"
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendCurrent();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={sendCurrent}
                                    disabled={sending || (!text.trim() && !file)}
                                >
                                    {t("messenger.send")}
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
