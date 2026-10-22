import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || "/";
    usePageTitle(t("login.title"));

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        try {
            await login(username, password, remember);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("login.title") }]} />
                <div className="auth-wrap">
                    <h1>{t("login.title")}</h1>
                    <p className="muted">{t("login.demo")} <code>demo / demo1234</code></p>
                    {error && <p className="error">{error}</p>}
                    <form className="form" onSubmit={handleSubmit}>
                        <label>{t("auth.username")}<input value={username} onChange={e => setUsername(e.target.value)} required /></label>
                        <label>{t("auth.password")}<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
                        <label className="remember-row">
                            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                            {t("login.remember")}
                        </label>
                        <button className="btn" type="submit">{t("login.submit")}</button>
                    </form>
                    <p className="muted"><Link to="/forgot-password">{t("login.forgot")}</Link></p>
                    <p className="muted">{t("login.noAccount")} <Link to="/signup">{t("nav.signup")}</Link></p>
                </div>
            </main>
        </>
    );
}
