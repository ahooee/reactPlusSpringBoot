import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Signup.css";

export default function Signup() {
    const [tab, setTab] = useState("email");
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [email, setEmail] = useState("");
    const [dial, setDial] = useState("");
    const [phone, setPhone] = useState("");
    const [countries, setCountries] = useState([]);
    const [step, setStep] = useState("form");
    const [requestId, setRequestId] = useState(null);
    const [contact, setContact] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const { applyAuth } = useAuth();
    const { t, lang } = useLanguage();
    const navigate = useNavigate();
    usePageTitle(t("signup.title"));

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

    async function handleRequest(e) {
        e.preventDefault();
        setError(null);
        if (password !== confirm) {
            setError(t("signup.passwordMismatch"));
            return;
        }
        setBusy(true);
        try {
            const base = {
                username: username.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                password,
                confirmPassword: confirm,
            };
            const payload = tab === "email"
                ? { ...base, channel: "email", email: email.trim() }
                : { ...base, channel: "phone", dial, phone: phone.trim() };
            const res = await apiFetch("/api/auth/register/request", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setRequestId(res.requestId);
            setContact(res.contact || "");
            setCode("");
            setStep("code");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleVerify(e) {
        e.preventDefault();
        setError(null);
        if (!/^\d{6}$/.test(code.trim())) {
            setError(t("signup.codeInvalid"));
            return;
        }
        setBusy(true);
        try {
            const data = await apiFetch("/api/auth/register/verify", {
                method: "POST",
                body: JSON.stringify({ requestId, code: code.trim() }),
            });
            applyAuth(data, true);
            setStep("success");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setError(null);
        setBusy(true);
        try {
            const base = {
                username: username.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                password,
                confirmPassword: confirm,
            };
            const payload = tab === "email"
                ? { ...base, channel: "email", email: email.trim() }
                : { ...base, channel: "phone", dial, phone: phone.trim() };
            const res = await apiFetch("/api/auth/register/request", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setRequestId(res.requestId);
            setCode("");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("signup.title") }]} />
                <div className="auth-wrap">
                    <h1>{t("signup.title")}</h1>
                    {error && <p className="error">{error}</p>}

                    {step === "success" ? (
                        <div className="signup-success">
                            <div className="signup-success-icon">✓</div>
                            <h2>{t("signup.successTitle")}</h2>
                            <p className="muted">{t("signup.successDesc")}</p>
                            <button className="btn" onClick={() => navigate("/shop")}>
                                {t("signup.goShopping")}
                            </button>
                        </div>
                    ) : step === "code" ? (
                        <form className="form" onSubmit={handleVerify}>
                            <p className="muted">
                                {tab === "email"
                                    ? t("signup.codeSentEmail", { contact })
                                    : t("signup.codeSentTelegram", { contact })}
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
                            <button className="btn" type="submit" disabled={busy}>
                                {busy ? "…" : t("signup.verify")}
                            </button>
                            <p className="muted">
                                {t("signup.noCode")}{" "}
                                <button type="button" className="link-btn" onClick={resend} disabled={busy}>
                                    {t("signup.resend")}
                                </button>
                                {" · "}
                                <button type="button" className="link-btn" onClick={() => setStep("form")}>
                                    {t("signup.back")}
                                </button>
                            </p>
                        </form>
                    ) : (
                        <>
                            <div className="signup-tabs" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === "email"}
                                    className={tab === "email" ? "on" : ""}
                                    onClick={() => switchTab("email")}
                                >
                                    {t("signup.tabEmail")}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === "phone"}
                                    className={tab === "phone" ? "on" : ""}
                                    onClick={() => switchTab("phone")}
                                >
                                    {t("signup.tabPhone")}
                                </button>
                            </div>
                            <form className="form" onSubmit={handleRequest}>
                                <label>{t("auth.username")}
                                    <input value={username} onChange={e => setUsername(e.target.value)} minLength={3} required />
                                    <small className="field-hint">{t("signup.usernameHint")}</small>
                                </label>
                                <div className="form-row">
                                    <label>{t("signup.firstName")}
                                        <input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                    </label>
                                    <label>{t("signup.lastName")}
                                        <input value={lastName} onChange={e => setLastName(e.target.value)} required />
                                    </label>
                                </div>
                                <div className="form-row">
                                    <label>{t("auth.password")}
                                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
                                        <small className="field-hint">{t("signup.passwordHint")}</small>
                                    </label>
                                    <label>{t("signup.confirmPassword")}
                                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={8} required />
                                        <small className="field-hint">{t("signup.confirmHint")}</small>
                                    </label>
                                </div>
                                {tab === "email" ? (
                                    <label>{t("signup.email")}
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" required />
                                        <small className="field-hint">{t("signup.emailHint")}</small>
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
                                            <small className="field-hint">{t("signup.phoneHint")}</small>
                                        </label>
                                    </div>
                                )}
                                <button className="btn" type="submit" disabled={busy}>
                                    {busy ? "…" : t("signup.submit")}
                                </button>
                            </form>
                        </>
                    )}
                    <p className="muted">{t("signup.haveAccount")} <Link to="/login">{t("nav.login")}</Link></p>
                </div>
            </main>
        </>
    );
}
