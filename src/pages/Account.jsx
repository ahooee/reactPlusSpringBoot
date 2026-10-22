import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Signup.css";
import "./Basket.css";

export default function Account() {
    const { t, lang } = useLanguage();
    usePageTitle(t("account.title"));
    const [username, setUsername] = useState("");
    const [names, setNames] = useState({ firstName: "", lastName: "" });
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState(null);
    const [error, setError] = useState(null);
    // Contact change flow: { type: "email" | "phone" } or null
    const [changing, setChanging] = useState(null);
    const [dial, setDial] = useState("");
    const [newValue, setNewValue] = useState("");
    const [requestId, setRequestId] = useState(null);
    const [masked, setMasked] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
    const [pwBusy, setPwBusy] = useState(false);
    const [pwNotice, setPwNotice] = useState(null);
    const [pwError, setPwError] = useState(null);

    function applyProfile(me) {
        setUsername(me?.username || "");
        setNames({ firstName: me?.firstName || "", lastName: me?.lastName || "" });
        setEmail(me?.email || "");
        setPhone(me?.phone || "");
    }

    useEffect(() => {
        apiFetch("/api/auth/me")
            .then(applyProfile)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
        apiFetch("/api/auth/register/countries")
            .then(data => {
                setCountries(Array.isArray(data?.countries) ? data.countries : []);
                setDial(data?.defaultDial || "");
            })
            .catch(() => {});
    }, []);

    async function saveNames(e) {
        e.preventDefault();
        setError(null);
        setNotice(null);
        setSaving(true);
        try {
            const me = await apiFetch("/api/auth/me", {
                method: "PUT",
                body: JSON.stringify({ firstName: names.firstName.trim(), lastName: names.lastName.trim() }),
            });
            applyProfile(me);
            setNotice(t("account.saved"));
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function startChange(type) {
        setChanging(type);
        setNewValue("");
        setRequestId(null);
        setMasked("");
        setCode("");
        setError(null);
        setNotice(null);
    }

    async function sendCode(e) {
        e?.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const payload = changing === "email"
                ? { channel: "email", email: newValue.trim() }
                : { channel: "phone", dial, phone: newValue.trim() };
            const res = await apiFetch("/api/auth/profile/contact/request", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setRequestId(res.requestId);
            setMasked(res.contact || "");
            setCode("");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function verifyCode(e) {
        e.preventDefault();
        setError(null);
        if (!/^\d{6}$/.test(code.trim())) {
            setError(t("signup.codeInvalid"));
            return;
        }
        setBusy(true);
        try {
            const me = await apiFetch("/api/auth/profile/contact/verify", {
                method: "POST",
                body: JSON.stringify({ requestId, code: code.trim() }),
            });
            applyProfile(me);
            setChanging(null);
            setRequestId(null);
            setNotice(t("account.contactUpdated"));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function changePassword(e) {
        e.preventDefault();
        setPwError(null);
        setPwNotice(null);
        if (passwords.next.length < 8) {
            setPwError(t("forgot.passwordHint"));
            return;
        }
        if (passwords.next !== passwords.confirm) {
            setPwError(t("forgot.passwordMismatch"));
            return;
        }
        setPwBusy(true);
        try {
            await apiFetch("/api/auth/password/change", {
                method: "POST",
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.next,
                    confirmPassword: passwords.confirm,
                }),
            });
            setPasswords({ current: "", next: "", confirm: "" });
            setPwNotice(t("account.passwordChanged"));
        } catch (err) {
            setPwError(err.message);
        } finally {
            setPwBusy(false);
        }
    }

    const countryLabel = c => `${lang === "fa" ? (c.nameFa || c.name) : c.name} (${c.dial})`;

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("account.title") }]} />
                <div className="auth-wrap" style={{ maxWidth: 520 }}>
                    <h1>{t("account.title")}</h1>
                    <p className="muted">{t("account.desc")}</p>
                    {error && <p className="error">{error}</p>}
                    {notice && <p className="muted">{notice}</p>}
                    {loading ? (
                        <p className="muted">{t("common.loading")}</p>
                    ) : (
                        <>
                            <form className="form" onSubmit={saveNames}>
                                <h3 style={{ margin: "8px 0 0" }}>{t("account.personalInfo")}</h3>
                                <label>{t("auth.username")}
                                    <input value={username} disabled dir="ltr" />
                                </label>
                                <div className="form-row">
                                    <label>{t("signup.firstName")}
                                        <input value={names.firstName} onChange={e => setNames({ ...names, firstName: e.target.value })} />
                                    </label>
                                    <label>{t("signup.lastName")}
                                        <input value={names.lastName} onChange={e => setNames({ ...names, lastName: e.target.value })} />
                                    </label>
                                </div>
                                <div>
                                    <button className="btn" type="submit" disabled={saving}>
                                        {saving ? "…" : t("account.save")}
                                    </button>
                                </div>
                            </form>

                            <div className="form" style={{ marginTop: 20 }}>
                                <h3 style={{ margin: "8px 0 0" }}>{t("account.contactInfo")}</h3>
                                <p className="muted" style={{ margin: 0 }}>{t("account.contactHint")}</p>
                                <div className="basket-identity">
                                    <div className="basket-identity-row">
                                        <span className="muted">{t("signup.email")}</span>
                                        <b dir="ltr">{email || "—"}</b>
                                    </div>
                                    <div className="basket-identity-row">
                                        <span className="muted">{t("account.phone")}</span>
                                        <b dir="ltr">{phone || "—"}</b>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button type="button" className="small-btn" onClick={() => startChange("email")}>
                                        {t("account.changeEmail")}
                                    </button>
                                    <button type="button" className="small-btn" onClick={() => startChange("phone")}>
                                        {t("account.changePhone")}
                                    </button>
                                </div>

                                {changing && !requestId && (
                                    <form className="form" onSubmit={sendCode}>
                                        {changing === "email" ? (
                                            <label>{t("account.newEmail")}
                                                <input type="email" value={newValue} onChange={e => setNewValue(e.target.value)} dir="ltr" required />
                                            </label>
                                        ) : (
                                            <div className="form-row">
                                                <label>{t("signup.country")}
                                                    <select value={dial} onChange={e => setDial(e.target.value)} required>
                                                        {countries.map(c => (
                                                            <option key={`${c.code}-${c.dial}`} value={c.dial}>
                                                                {countryLabel(c)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>{t("account.newPhone")}
                                                    <input value={newValue} onChange={e => setNewValue(e.target.value)} inputMode="tel" dir="ltr" required />
                                                </label>
                                            </div>
                                        )}
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn" type="submit" disabled={busy}>
                                                {busy ? "…" : t("account.sendCode")}
                                            </button>
                                            <button type="button" className="small-btn" onClick={() => setChanging(null)}>
                                                {t("signup.back")}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {changing && requestId && (
                                    <form className="form" onSubmit={verifyCode}>
                                        <p className="muted">
                                            {changing === "email"
                                                ? t("signup.codeSentEmail", { contact: masked })
                                                : t("signup.codeSentTelegram", { contact: masked })}
                                        </p>
                                        <label>{t("signup.code")}
                                            <input
                                                className="signup-code-input"
                                                value={code}
                                                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                placeholder="••••••"
                                                dir="ltr"
                                                required
                                            />
                                        </label>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn" type="submit" disabled={busy}>
                                                {busy ? "…" : t("account.verifyAndSave")}
                                            </button>
                                            <button type="button" className="small-btn" onClick={sendCode} disabled={busy}>
                                                {t("signup.resend")}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <div className="form" style={{ marginTop: 20 }}>
                                <h3 style={{ margin: "8px 0 0" }}>{t("account.changePassword")}</h3>
                                <p className="muted" style={{ margin: 0 }}>{t("account.changePasswordHint")}</p>
                                {pwError && <p className="error">{pwError}</p>}
                                {pwNotice && <p className="muted">{pwNotice}</p>}
                                <form className="form" onSubmit={changePassword}>
                                    <label>{t("account.currentPassword")}
                                        <input
                                            type="password"
                                            value={passwords.current}
                                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                            autoComplete="current-password"
                                            required
                                        />
                                    </label>
                                    <div className="form-row">
                                        <label>{t("account.newPassword")}
                                            <input
                                                type="password"
                                                value={passwords.next}
                                                onChange={e => setPasswords({ ...passwords, next: e.target.value })}
                                                minLength={8}
                                                autoComplete="new-password"
                                                required
                                            />
                                            <small className="field-hint">{t("forgot.passwordHint")}</small>
                                        </label>
                                        <label>{t("account.confirmPassword")}
                                            <input
                                                type="password"
                                                value={passwords.confirm}
                                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                                minLength={8}
                                                autoComplete="new-password"
                                                required
                                            />
                                        </label>
                                    </div>
                                    <div>
                                        <button className="btn" type="submit" disabled={pwBusy}>
                                            {pwBusy ? "…" : t("account.updatePassword")}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
