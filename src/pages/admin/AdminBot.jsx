import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const SEND_KINDS = ["text", "photo", "document", "video", "audio", "voice", "location"];
const MEDIA_KINDS = ["photo", "document", "video", "audio", "voice"];

export default function AdminBot() {
    const { t } = useLanguage();
    usePageTitle(t("admin.bot"));
    const [status, setStatus] = useState(null);
    const [settings, setSettings] = useState({});
    const [models, setModels] = useState([]);
    const [modelsSource, setModelsSource] = useState("");
    const [allowlist, setAllowlist] = useState([]);
    const [newTarget, setNewTarget] = useState("");
    const [saving, setSaving] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [notice, setNotice] = useState("");
    const [send, setSend] = useState({ kind: "text", target: "", text: "", caption: "", latitude: "", longitude: "", file: null });
    const [job, setJob] = useState(null);
    const pollRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const [st, se, al] = await Promise.all([
                apiFetch("/api/admin/bot/status"),
                apiFetch("/api/admin/bot/settings"),
                apiFetch("/api/admin/bot/allowlist"),
            ]);
            setStatus(st);
            setSettings(se);
            setAllowlist(al);
        } catch (e) {
            setNotice(e.message);
        }
    }, []);

    const loadModels = useCallback(async (keyOverride) => {
        try {
            const params = new URLSearchParams();
            if (keyOverride !== undefined) {
                if (keyOverride) params.set("apiKey", keyOverride);
                if (settings.aiBaseUrl) params.set("baseUrl", settings.aiBaseUrl);
            }
            const q = params.toString() ? `?${params}` : "";
            const res = await apiFetch(`/api/admin/bot/ai-models${q}`);
            setModels(res.models || []);
            setModelsSource(res.source || "");
            if (res.hint) setNotice(res.hint);
        } catch (e) {
            setNotice(e.message);
        }
    }, [settings.aiBaseUrl]);

    useEffect(() => {
        load();
        return () => clearInterval(pollRef.current);
    }, [load]);

    useEffect(() => {
        if (settings.aiModel !== undefined) loadModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.aiApiKeySet]);

    function set(k, v) {
        setSettings(s => ({ ...s, [k]: v }));
    }

    async function saveSettings(e) {
        e?.preventDefault();
        setSaving(true);
        setNotice("");
        try {
            const stringified = Object.fromEntries(
                Object.entries(settings)
                    .filter(([k]) => !["aiApiKeySet"].includes(k))
                    .map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])
            );
            const res = await apiFetch("/api/admin/bot/settings", { method: "PUT", body: JSON.stringify(stringified) });
            setSettings(res.settings || {});
            if (res.restarted) setNotice(t("bot.restartedApplied"));
            else setNotice(t("bot.savedLive"));
            const st = await apiFetch("/api/admin/bot/status");
            setStatus(st);
        } catch (err) {
            setNotice(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function restart() {
        setRestarting(true);
        setNotice("");
        try {
            const st = await apiFetch("/api/admin/bot/restart", { method: "POST" });
            setStatus(st);
            setNotice(t("bot.restarted"));
        } catch (e) {
            setNotice(e.message);
        } finally {
            setRestarting(false);
        }
    }

    async function addAllowed(e) {
        e.preventDefault();
        if (!newTarget.trim()) return;
        setNotice("");
        try {
            await apiFetch("/api/admin/bot/allowlist", { method: "POST", body: JSON.stringify({ target: newTarget.trim() }) });
            setNewTarget("");
            setAllowlist(await apiFetch("/api/admin/bot/allowlist"));
            const st = await apiFetch("/api/admin/bot/status");
            setStatus(st);
        } catch (err) {
            setNotice(err.message);
        }
    }

    async function removeAllowed(chatId) {
        try {
            await apiFetch(`/api/admin/bot/allowlist/${chatId}`, { method: "DELETE" });
            setAllowlist(await apiFetch("/api/admin/bot/allowlist"));
        } catch (e) {
            setNotice(e.message);
        }
    }

    async function clearAllowed() {
        if (!window.confirm(t("bot.clearConfirm"))) return;
        try {
            await apiFetch("/api/admin/bot/allowlist", { method: "DELETE" });
            setAllowlist([]);
        } catch (e) {
            setNotice(e.message);
        }
    }

    function pollJob(jobId) {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const j = await apiFetch(`/api/admin/bot/send/${jobId}`);
                setJob(j);
                if (j.status === "SENT" || j.status === "FAILED") clearInterval(pollRef.current);
            } catch (e) {
                clearInterval(pollRef.current);
                setJob({ status: "FAILED", error: e.message });
            }
        }, 600);
    }

    async function sendMessage(e) {
        e.preventDefault();
        setNotice("");
        setJob({ status: "QUEUED" });
        try {
            const form = new FormData();
            form.append("target", send.target);
            form.append("kind", send.kind);
            if (send.text) form.append("text", send.text);
            if (send.caption) form.append("caption", send.caption);
            if (send.latitude !== "") form.append("latitude", send.latitude);
            if (send.longitude !== "") form.append("longitude", send.longitude);
            if (send.file) form.append("file", send.file);
            const res = await apiFetch("/api/admin/bot/send", { method: "POST", body: form });
            const first = await apiFetch(`/api/admin/bot/send/${res.jobId}`);
            setJob(first);
            pollJob(res.jobId);
        } catch (err) {
            setJob({ status: "FAILED", error: err.message });
        }
    }

    const showFile = MEDIA_KINDS.includes(send.kind);
    const showText = send.kind === "text";
    const showLocation = send.kind === "location";

    return (
        <AdminLayout>
            <h1>{t("admin.bot")}</h1>
            <p className="muted">{t("bot.hint")}</p>
            {notice && <p className="muted">{notice}</p>}

            <h3 style={{ margin: "8px 0" }}>{t("bot.status")}</h3>
            {status ? (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <span>● {status.running ? t("bot.running") : t("bot.stopped")}</span>
                    <span>{t("bot.loggedIn")}: {status.loggedIn ? t("bot.yes") : t("bot.no")}</span>
                    <span>{t("bot.ai")}: {status.aiConfigured ? t("bot.configured") : t("bot.missing")}</span>
                    <span>{t("bot.autoReply")}: {status.autoReplyEnabled ? t("bot.on") : t("bot.off")}</span>
                    <span>{t("bot.allowCount")}: {status.allowedChats}</span>
                    <button type="button" className="small-btn" onClick={restart} disabled={restarting}>
                        {restarting ? t("bot.restarting") : t("bot.restart")}
                    </button>
                </div>
            ) : <p className="muted">{t("bot.loading")}</p>}

            <form className="form" onSubmit={saveSettings}>
                <h3 style={{ margin: "16px 0 0" }}>{t("bot.connection")}</h3>
                <label>{t("bot.enabled")}
                    <select value={settings.enabled === false ? "false" : "true"} onChange={e => set("enabled", e.target.value)}>
                        <option value="true">{t("bot.on")}</option>
                        <option value="false">{t("bot.off")}</option>
                    </select>
                </label>
                <label>{t("bot.apiId")}
                    <input value={settings.apiId ?? ""} onChange={e => set("apiId", e.target.value)} dir="ltr" />
                </label>
                <label>{t("bot.apiHash")}
                    <input value={settings.apiHash ?? ""} onChange={e => set("apiHash", e.target.value)} dir="ltr" />
                </label>
                <label>{t("bot.dbDir")}
                    <input value={settings.databaseDirectory ?? ""} onChange={e => set("databaseDirectory", e.target.value)} placeholder={t("bot.dbDirPh")} dir="ltr" />
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("bot.connNote")}</p>

                <h3 style={{ margin: "16px 0 0" }}>{t("bot.aiTitle")}</h3>
                <label>{t("bot.aiKey")}
                    <input type="password" value={settings.aiApiKey ?? ""} onChange={e => set("aiApiKey", e.target.value)} placeholder={settings.aiApiKeySet ? "••••••••" : "gsk_..."} dir="ltr" autoComplete="off" />
                </label>
                <label>{t("bot.model")}
                    <select value={settings.aiModel ?? ""} onChange={e => set("aiModel", e.target.value)} dir="ltr">
                        {(models.includes(settings.aiModel) ? models : [settings.aiModel, ...models].filter(Boolean)).map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="small-btn" onClick={() => loadModels(settings.aiApiKey)}>{t("bot.refreshModels")}</button>
                    {modelsSource === "live" && <span className="muted">{t("bot.liveList", { n: models.length })}</span>}
                    {modelsSource === "fallback" && <span className="muted">{t("bot.fallbackList")}</span>}
                </div>
                <label>{t("bot.baseUrl")}
                    <input value={settings.aiBaseUrl ?? ""} onChange={e => set("aiBaseUrl", e.target.value)} dir="ltr" />
                </label>
                <label>{t("bot.prePrompt")}
                    <textarea value={settings.aiSystemPrompt ?? ""} onChange={e => set("aiSystemPrompt", e.target.value)} rows={3} dir="auto" />
                </label>
                <label>{t("bot.autoReply")}
                    <select value={settings.autoReplyEnabled === false ? "false" : "true"} onChange={e => set("autoReplyEnabled", e.target.value)}>
                        <option value="true">{t("bot.on")}</option>
                        <option value="false">{t("bot.off")}</option>
                    </select>
                </label>
                <label>{t("bot.cooldown")}
                    <input type="number" min="0" value={settings.cooldownMillis ?? 3000} onChange={e => set("cooldownMillis", e.target.value)} dir="ltr" />
                </label>
                <label>{t("bot.aiVerbose")}
                    <select value={settings.aiVerbose ? "true" : "false"} onChange={e => set("aiVerbose", e.target.value)}>
                        <option value="true">{t("bot.on")}</option>
                        <option value="false">{t("bot.off")}</option>
                    </select>
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("bot.aiNote")}</p>
                <div><button className="btn" type="submit" disabled={saving}>{saving ? t("bot.saving") : t("bot.saveAll")}</button></div>
            </form>

            <h3 style={{ margin: "16px 0 8px" }}>{t("bot.allowTitle")}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{t("bot.allowHint")}</p>
            <form onSubmit={addAllowed} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="@username, 123456789, +98912..." dir="ltr" style={{ flex: 1 }} />
                <button className="small-btn" type="submit">{t("bot.add")}</button>
                {allowlist.length > 0 && <button className="small-btn danger" type="button" onClick={clearAllowed}>{t("bot.clear")}</button>}
            </form>
            {allowlist.length === 0
                ? <p className="muted">{t("bot.allowEmpty")}</p>
                : <ul style={{ paddingInlineStart: 20 }}>
                    {allowlist.map(a => (
                        <li key={a.chatId} style={{ marginBottom: 4 }}>
                            {a.label} <span className="muted">(chat {a.chatId})</span>{" "}
                            <button className="small-btn danger" type="button" onClick={() => removeAllowed(a.chatId)}>{t("bot.remove")}</button>
                        </li>
                    ))}
                </ul>}

            <h3 style={{ margin: "16px 0 8px" }}>{t("bot.sendTitle")}</h3>
            <form className="form" onSubmit={sendMessage}>
                <label>{t("bot.sendTarget")}
                    <input value={send.target} onChange={e => setSend({ ...send, target: e.target.value })} placeholder="@username, 123456789, +98912..." dir="ltr" required />
                </label>
                <label>{t("bot.sendKind")}
                    <select value={send.kind} onChange={e => setSend({ ...send, kind: e.target.value })}>
                        {SEND_KINDS.map(k => <option key={k} value={k}>{t(`bot.kind_${k}`)}</option>)}
                    </select>
                </label>
                {showText && (
                    <label>{t("bot.sendText")}
                        <textarea value={send.text} onChange={e => setSend({ ...send, text: e.target.value })} rows={3} dir="auto" required />
                    </label>
                )}
                {showFile && (
                    <>
                        <label>{t("bot.sendFile")}
                            <input type="file" onChange={e => setSend({ ...send, file: e.target.files?.[0] || null })} required />
                        </label>
                        <label>{t("bot.sendCaption")}
                            <input value={send.caption} onChange={e => setSend({ ...send, caption: e.target.value })} dir="auto" />
                        </label>
                    </>
                )}
                {showLocation && (
                    <div style={{ display: "flex", gap: 8 }}>
                        <label>{t("bot.sendLat")}
                            <input type="number" step="any" value={send.latitude} onChange={e => setSend({ ...send, latitude: e.target.value })} dir="ltr" required />
                        </label>
                        <label>{t("bot.sendLon")}
                            <input type="number" step="any" value={send.longitude} onChange={e => setSend({ ...send, longitude: e.target.value })} dir="ltr" required />
                        </label>
                    </div>
                )}
                <div><button className="btn" type="submit">{t("bot.sendBtn")}</button></div>
            </form>
            {job && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 480 }}>
                        <span>{t(`bot.job_${(job.status || "queued").toLowerCase()}`)}{job.chatTitle ? ` — ${job.chatTitle}` : ""}</span>
                        <span>{job.percent || 0}%</span>
                    </div>
                    <div style={{ maxWidth: 480, height: 12, borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden", background: "var(--card-bg)" }}>
                        <div style={{
                            width: `${job.percent || 0}%`, height: "100%",
                            background: job.status === "FAILED" ? "#d33" : "var(--accent, #aa3bff)",
                            transition: "width .3s",
                        }} />
                    </div>
                    {job.error ? <p style={{ color: "#d33" }}>{job.error}</p> : null}
                    {job.message ? <p className="muted">{job.message}</p> : null}
                </div>
            )}
        </AdminLayout>
    );
}
