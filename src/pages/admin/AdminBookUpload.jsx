import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const ACTIVE = ["QUEUED", "RUNNING", "STOPPING"];
const FINISHED = ["STOPPED", "COMPLETED", "FAILED"];

function stored(key) {
    try {
        return localStorage.getItem(key) || "";
    } catch {
        return "";
    }
}

function remember(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // ignore
    }
}

function humanBytes(n) {
    const bytes = Number(n) || 0;
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
}

export default function AdminBookUpload() {
    const { t } = useLanguage();
    usePageTitle(t("admin.bookUpload"));
    const [downloadsPath, setDownloadsPath] = useState(() => stored("bookUploadPath"));
    const [chatLink, setChatLink] = useState(() => stored("bookUploadChat"));
    const [stats, setStats] = useState(null);
    const [job, setJob] = useState(null);
    const [notice, setNotice] = useState("");
    const [starting, setStarting] = useState(false);
    const pollRef = useRef(null);

    const loadStats = useCallback(async () => {
        try {
            setStats(await apiFetch("/api/admin/books/upload/stats"));
        } catch {
            // stats are informational; the page still works without them
        }
    }, []);

    const pollJob = useCallback((jobId) => {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const next = await apiFetch(`/api/admin/books/upload/${jobId}`);
                setJob(next);
                if (FINISHED.includes(next.status)) {
                    clearInterval(pollRef.current);
                    loadStats();
                }
            } catch (e) {
                clearInterval(pollRef.current);
                setNotice(e.message);
            }
        }, 600);
    }, [loadStats]);

    useEffect(() => {
        loadStats();
        apiFetch("/api/admin/books/upload/active")
            .then(active => {
                if (active) {
                    setJob(active);
                    pollJob(active.jobId);
                }
            })
            .catch(() => {});
        return () => clearInterval(pollRef.current);
    }, [loadStats, pollJob]);

    async function start(e) {
        e?.preventDefault();
        if (!downloadsPath.trim() || !chatLink.trim()) return;
        setStarting(true);
        setNotice("");
        setJob({ status: "QUEUED", percent: 0 });
        remember("bookUploadPath", downloadsPath.trim());
        remember("bookUploadChat", chatLink.trim());
        try {
            const created = await apiFetch("/api/admin/books/upload", {
                method: "POST",
                body: JSON.stringify({
                    downloadsPath: downloadsPath.trim(),
                    chatLink: chatLink.trim(),
                }),
            });
            setJob(created);
            pollJob(created.jobId);
        } catch (err) {
            setJob(null);
            setNotice(err.message);
        } finally {
            setStarting(false);
        }
    }

    async function stop() {
        if (!job?.jobId) return;
        try {
            setJob(await apiFetch(`/api/admin/books/upload/${job.jobId}/stop`, { method: "POST" }));
        } catch (e) {
            setNotice(e.message);
        }
    }

    const isActive = job && ACTIVE.includes(job.status);
    const statusColor = job?.status === "FAILED"
        ? "#d33"
        : job?.status === "COMPLETED"
            ? "#1a8f4c"
            : job?.status === "STOPPED"
                ? "#c07a00"
                : "var(--accent, #aa3bff)";

    return (
        <AdminLayout>
            <h1>{t("bookUpload.title")}</h1>
            <p className="muted">{t("bookUpload.desc")}</p>
            {notice && <p style={{ color: "#d33" }}>{notice}</p>}

            {stats && (
                <div className="card" style={{ marginBottom: 18 }}>
                    <div className="card-body" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                        <span><strong>{stats.totalBooks ?? 0}</strong> <span className="muted">{t("bookUpload.totalBooks")}</span></span>
                        <span><strong>{stats.downloadedBooks ?? 0}</strong> <span className="muted">{t("bookUpload.downloaded")}</span></span>
                        <span><strong>{stats.uploadedBooks ?? 0}</strong> <span className="muted">{t("bookUpload.uploaded")}</span></span>
                        <span><strong>{stats.messages ?? 0}</strong> <span className="muted">{t("bookUpload.messages")}</span></span>
                    </div>
                </div>
            )}

            <form className="form" onSubmit={start}>
                <label>{t("bookUpload.path")}
                    <input
                        value={downloadsPath}
                        onChange={e => setDownloadsPath(e.target.value)}
                        placeholder={t("bookUpload.pathPh")}
                        dir="ltr"
                        required
                    />
                </label>
                <label>{t("bookUpload.chat")}
                    <input
                        value={chatLink}
                        onChange={e => setChatLink(e.target.value)}
                        placeholder={t("bookUpload.chatPh")}
                        dir="ltr"
                        required
                    />
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("bookUpload.note")}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn" type="submit" disabled={starting || isActive}>
                        {starting ? t("bookUpload.starting") : t("bookUpload.apply")}
                    </button>
                    {isActive && (
                        <button
                            className="small-btn danger"
                            type="button"
                            onClick={stop}
                            disabled={job.status === "STOPPING"}
                        >
                            {job.status === "STOPPING" ? t("bookUpload.stopping") : t("bookUpload.stop")}
                        </button>
                    )}
                </div>
            </form>

            {job && (
                <div style={{ marginTop: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 640 }}>
                        <span>
                            {t(`bookUpload.status_${(job.status || "queued").toLowerCase()}`)}
                            {job.chatTitle ? ` — ${job.chatTitle}` : ""}
                        </span>
                        <span>{job.percent || 0}%</span>
                    </div>
                    <div style={{
                        maxWidth: 640,
                        height: 14,
                        borderRadius: 7,
                        border: "1px solid var(--border)",
                        overflow: "hidden",
                        background: "var(--card-bg)",
                    }}>
                        <div style={{
                            width: `${job.percent || 0}%`,
                            height: "100%",
                            background: statusColor,
                            transition: "width .3s",
                        }} />
                    </div>
                    <p className="muted" style={{ marginBottom: 4 }}>
                        {t("bookUpload.files", { done: job.processedBooks || 0, total: job.totalBooks || 0 })}
                        {" · "}
                        {t("bookUpload.uploadedCount", { n: job.uploadedBooks || 0 })}
                        {" · "}
                        {t("bookUpload.failedCount", { n: job.failedBooks || 0 })}
                        {job.skippedBooks > 0 ? ` · ${t("bookUpload.skippedCount", { n: job.skippedBooks })}` : ""}
                    </p>
                    <p className="muted" style={{ marginTop: 0 }}>
                        {job.totalBytes > 0
                            ? `${humanBytes(job.doneBytes)} / ${humanBytes(job.totalBytes)}`
                            : ""}
                        {job.currentFile && isActive ? ` · ${t("bookUpload.current")}: ${job.currentFile}` : ""}
                    </p>
                    {job.message ? <p className="muted">{job.message}</p> : null}
                    {job.error ? <p style={{ color: "#d33" }}>{job.error}</p> : null}
                </div>
            )}
        </AdminLayout>
    );
}
