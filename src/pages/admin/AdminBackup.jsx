import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_URL, apiFetch, authHeaders } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const emptyReq = { requestId: "", contact: "", channel: "" };

export default function AdminBackup() {
    const { t } = useLanguage();
    usePageTitle(t("backup.title"));
    const [me, setMe] = useState(null);
    const [channel, setChannel] = useState("email");
    const [backupReq, setBackupReq] = useState({ ...emptyReq });
    const [restoreReq, setRestoreReq] = useState({ ...emptyReq });
    const [backupCode, setBackupCode] = useState("");
    const [restoreCode, setRestoreCode] = useState("");
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(null);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        apiFetch("/api/auth/me").then(setMe).catch(() => {});
    }, []);

    async function sendCode(kind, setReq) {
        setError("");
        setNotice("");
        setBusy(`send-${kind}`);
        try {
            const res = await apiFetch("/api/admin/backup/code", {
                method: "POST",
                body: JSON.stringify({ operation: kind, channel }),
            });
            setReq({ requestId: res.requestId, contact: res.contact, channel: res.channel });
            setNotice(t("backup.sentTo", { contact: res.contact }));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    }

    async function downloadBackup(e) {
        e.preventDefault();
        if (!backupReq.requestId) return;
        setError("");
        setNotice("");
        setBusy("backup");
        try {
            const res = await fetch(`${API_URL}/api/admin/backup/download`, {
                method: "POST",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ requestId: backupReq.requestId, code: backupCode }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || `Request failed (${res.status})`);
            }
            const blob = await res.blob();
            let filename = "backup.dump";
            const disp = res.headers.get("Content-Disposition") || "";
            const m = /filename="?([^";]+)"?/.exec(disp);
            if (m) filename = m[1];
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            setBackupReq({ ...emptyReq });
            setBackupCode("");
            setNotice(t("backup.backupDone", { file: filename }));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    }

    async function restoreBackup(e) {
        e.preventDefault();
        if (!restoreReq.requestId || !file) return;
        if (!window.confirm(t("backup.restoreConfirm"))) return;
        setError("");
        setNotice("");
        setBusy("restore");
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("requestId", restoreReq.requestId);
            form.append("code", restoreCode);
            await apiFetch("/api/admin/backup/restore", { method: "POST", body: form });
            setRestoreReq({ ...emptyReq });
            setRestoreCode("");
            setFile(null);
            setNotice(t("backup.restoreDone"));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(null);
        }
    }

    return (
        <AdminLayout>
            <h1>{t("backup.title")}</h1>
            <p className="muted">{t("backup.desc")}</p>
            <p className="muted">
                {t("cart.email")}: <b dir="auto">{me?.email || "—"}</b>
                {" · "}
                {t("cart.phone")}: <b dir="ltr">{me?.phone || "—"}</b>
                {" · "}
                <a href="/account">{t("nav.profile")}</a>
            </p>
            {error && <p className="error">{error}</p>}
            {notice && <p className="muted">{notice}</p>}

            <div className="grid-3" style={{ marginTop: 16 }}>
                <form className="form card" onSubmit={downloadBackup}>
                    <div className="card-body">
                        <h3>{t("backup.backupCard")}</h3>
                        <label>{t("backup.channel")}
                            <select value={channel} onChange={e => setChannel(e.target.value)}>
                                <option value="email">{t("backup.channelEmail")}</option>
                                <option value="phone">{t("backup.channelPhone")}</option>
                            </select>
                        </label>
                        <div>
                            <button type="button" className="small-btn" disabled={busy} onClick={() => sendCode("backup", setBackupReq)}>
                                {busy === "send-backup" ? "…" : t("backup.sendCode")}
                            </button>
                        </div>
                        {backupReq.requestId && (
                            <>
                                <label>{t("backup.code")}
                                    <input
                                        value={backupCode}
                                        onChange={e => setBackupCode(e.target.value)}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="••••••"
                                        required
                                    />
                                </label>
                                <div>
                                    <button className="btn" type="submit" disabled={busy === "backup"}>
                                        {busy === "backup" ? "…" : t("backup.download")}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </form>

                <form className="form card" onSubmit={restoreBackup}>
                    <div className="card-body">
                        <h3>{t("backup.restoreCard")}</h3>
                        <p className="muted">⚠ {t("backup.restoreWarn")}</p>
                        <label>{t("backup.channel")}
                            <select value={channel} onChange={e => setChannel(e.target.value)}>
                                <option value="email">{t("backup.channelEmail")}</option>
                                <option value="phone">{t("backup.channelPhone")}</option>
                            </select>
                        </label>
                        <div>
                            <button type="button" className="small-btn" disabled={busy} onClick={() => sendCode("restore", setRestoreReq)}>
                                {busy === "send-restore" ? "…" : t("backup.sendCode")}
                            </button>
                        </div>
                        <label>{t("backup.pickFile")}
                            <input type="file" accept=".dump" onChange={e => setFile(e.target.files?.[0] || null)} />
                        </label>
                        {restoreReq.requestId && (
                            <>
                                <label>{t("backup.code")}
                                    <input
                                        value={restoreCode}
                                        onChange={e => setRestoreCode(e.target.value)}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="••••••"
                                        required
                                    />
                                </label>
                                <div>
                                    <button className="btn" type="submit" disabled={busy === "restore" || !file}>
                                        {busy === "restore" ? "…" : t("backup.restoreBtn")}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
