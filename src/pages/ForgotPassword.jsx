import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Signup.css";

export default function ForgotPassword() {
    const [tab, setTab] = useState("email");
    const [email, setEmail] = useState("");
    const [dial, setDial] = useState("");
    const [phone, setPhone] = useState("");
    const [countries, setCountries] = useState([]);
    const [step, setStep] = useState("request");
    const [requestId, setRequestId] = useState(null);
    const [contact, setContact] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const { t, lang } = useLanguage();
    usePageTitle(t("forgot.title"));

    useEffect(() => {
        apiFetch("/api/auth/register/countries")
            .then(data => {
                setCountries(Array.isArray(data?.countries) ? data.countries : []);
                setDial(data?.defaultDial || "");
            })
            .catch(() => {});
    }, []);

    const countryLabel = c => `${lang === "fa" ? (c.nameFa || c.name) : c.name} (${c.dial})`;

    function switchTab(next) {
        setTab(next);
        setError(null);
    }

    async function requestCode(e) {
        e?.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const payload = tab === "email"
                ? { channel: "email", email: email.trim() }
                : { channel: "phone", dial, phone: phone.trim() };
            const res = await apiFetch("/api/auth/password/forgot/request", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setRequestId(res.requestId);
            setContact(res.contact || "");
            setCode("");
            setStep("reset");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function resetPassword(e) {
        e.preventDefault();
        setError(null);
        if (!/^\d{6}$/.test(code.trim())) {
            setError(t("signup.codeInvalid"));
            return;
        }
        if (password.length < 8) {
            setError(t("forgot.passwordHint"));
            return;
        }
        if (password !== confirm) {
            setError(t("forgot.passwordMismatch"));
            return;
        }
        setBusy(true);
        try {
            await apiFetch("/api/auth/password/forgot/reset", {
                method: "POST",
                body: JSON.stringify({
                    requestId,
                    code: code.trim(),
                    newPassword: password,
                    confirmPassword: confirm,
                }),
            });
            setStep("success");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function backToRequest() {
        setStep("request");
        setRequestId(null);
        setCode("");
        setPassword("");
        setConfirm("");
        setError(null);
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("forgot.title") }]} />
                <div className="auth-wrap">
                    <h1>{t("forgot.title")}</h1>
                    {error && <p className="error">{error}</p>}

                    {step === "success" ? (
                        <div className="signup-success">
                            <div className="signup-success-icon">✓</div>
                            <h2>{t("forgot.successTitle")}</h2>
                            <p className="muted">{t("forgot.successDesc")}</p>
                            <Link className="btn" to="/login">{t("forgot.goLogin")}</Link>
                        </div>
                    ) : step === "reset" ? (
                        <form className="form" onSubmit={resetPassword}>
                            <p className="muted">{t("forgot.codeSent", { contact })}</p>
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
                            <label>{t("forgot.newPassword")}
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    minLength={8}
                                    autoComplete="new-password"
                                    required
                                />
                                <small className="field-hint">{t("forgot.passwordHint")}</small>
                            </label>
                            <label>{t("forgot.confirmPassword")}
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    minLength={8}
                                    autoComplete="new-password"
                                    required
                                />
                            </label>
                            <button className="btn" type="submit" disabled={busy}>
                                {busy ? "…" : t("forgot.reset")}
                            </button>
                            <p className="muted">
                                {t("signup.noCode")}{" "}
                                <button type="button" className="link-btn" onClick={requestCode} disabled={busy}>
                                    {t("forgot.resend")}
                                </button>
                                {" · "}
                                <button type="button" className="link-btn" onClick={backToRequest} disabled={busy}>
                                    {t("forgot.back")}
                                </button>
                            </p>
                        </form>
                    ) : (
                        <>
                            <p className="muted">{t("forgot.desc")}</p>
                            <div className="signup-tabs" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === "email"}
                                    className={tab === "email" ? "on" : ""}
                                    onClick={() => switchTab("email")}
                                >
                                    {t("forgot.tabEmail")}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === "phone"}
                                    className={tab === "phone" ? "on" : ""}
                                    onClick={() => switchTab("phone")}
                                >
                                    {t("forgot.tabPhone")}
                                </button>
                            </div>
                            <form className="form" onSubmit={requestCode}>
                                {tab === "email" ? (
                                    <label>{t("signup.email")}
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            dir="ltr"
                                            required
                                        />
                                        <small className="field-hint">{t("forgot.emailHint")}</small>
                                    </label>
                                ) : (
                                    <div className="form-row">
                                        <label>{t("signup.country")}
                                            <select value={dial} onChange={e => setDial(e.target.value)} required>
                                                <option value="">{t("signup.selectCountry")}</option>
                                                {countries.map(c => (
                                                    <option key={`${c.code}-${c.dial}`} value={c.dial}>
                                                        {countryLabel(c)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>{t("signup.phone")}
                                            <input
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                inputMode="tel"
                                                placeholder="912345678"
                                                dir="ltr"
                                                required
                                            />
                                            <small className="field-hint">{t("forgot.phoneHint")}</small>
                                        </label>
                                    </div>
                                )}
                                <button className="btn" type="submit" disabled={busy}>
                                    {busy ? "…" : t("forgot.send")}
                                </button>
                            </form>
                        </>
                    )}

                    {step !== "success" && (
                        <p className="muted">
                            <Link to="/login">{t("forgot.backToLogin")}</Link>
                        </p>
                    )}
                </div>
            </main>
        </>
    );
}
