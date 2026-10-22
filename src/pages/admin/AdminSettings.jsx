import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_URL, authHeaders, apiFetch, imageSrc } from "../../lib/api";
import { useTheme, THEMES } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

export default function AdminSettings() {
    const [values, setValues] = useState({});
    const [countries, setCountries] = useState([]);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const { setThemeId, setMode, setSettings } = useTheme();
    const { t, lang } = useLanguage();
    usePageTitle(t("settings.title"));

    useEffect(() => {
        apiFetch("/api/settings").then(setValues).catch(() => {});
        apiFetch("/api/auth/register/countries")
            .then(data => setCountries(Array.isArray(data?.countries) ? data.countries : []))
            .catch(() => {});
    }, []);

    async function save(e) {
        e.preventDefault();
        const saved = await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(values) });
        setValues(saved);
        setSettings(saved);
        if (saved.theme) setThemeId(saved.theme);
        if (saved.colorScheme) setMode(saved.colorScheme);
        alert(t("settings.saved"));
    }

    async function handleLogoUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_URL}/api/media/upload`, {
                method: "POST",
                headers: { ...authHeaders() },
                body: form,
            });
            if (!res.ok) throw new Error("Upload failed");
            const asset = await res.json();
            if (asset?.url) {
                setValues(v => ({ ...v, siteLogoUrl: asset.url }));
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setUploadingLogo(false);
            e.target.value = "";
        }
    }

    const logoPreview = values.siteLogoUrl ? imageSrc(values.siteLogoUrl) : "";

    return (
        <AdminLayout>
            <h1>{t("settings.title")}</h1>
            <p className="muted">{t("settings.hint")}</p>
            <form className="form" onSubmit={save}>
                <h3 style={{ margin: "8px 0 0" }}>{t("settings.branding")}</h3>
                <label>{t("settings.siteName")}
                    <input value={values.siteName || ""} onChange={e => setValues({ ...values, siteName: e.target.value })} placeholder="My Store" />
                </label>
                <label>{t("settings.siteNameFa")}
                    <input value={values.siteNameFa || ""} onChange={e => setValues({ ...values, siteNameFa: e.target.value })} placeholder="فروشگاه من" />
                </label>
                <label>{t("settings.logoUrl")}
                    <input
                        value={values.siteLogoUrl || ""}
                        onChange={e => setValues({ ...values, siteLogoUrl: e.target.value })}
                        placeholder="/uploads/logo.png or https://..."
                        dir="ltr"
                    />
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("settings.logoHint")}</p>
                {logoPreview && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                            src={logoPreview}
                            alt={t("settings.logoPreview")}
                            style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card-bg)" }}
                        />
                        <button type="button" className="small-btn danger" onClick={() => setValues({ ...values, siteLogoUrl: "" })}>
                            {t("settings.logoRemove")}
                        </button>
                    </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                    <label className="small-btn" style={{ cursor: "pointer" }}>
                        {uploadingLogo ? t("settings.logoUploading") : t("settings.logoUpload")}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </label>
                </div>

                <h3 style={{ margin: "16px 0 0" }}>{t("settings.appearance")}</h3>
                <label>{t("settings.accent")}
                    <select value={values.theme || "default"} onChange={e => setValues({ ...values, theme: e.target.value })}>
                        {THEMES.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}
                    </select>
                </label>
                <label>{t("settings.scheme")}
                    <select value={values.colorScheme || "light"} onChange={e => setValues({ ...values, colorScheme: e.target.value })}>
                        <option value="light">{t("settings.light")}</option>
                        <option value="dark">{t("settings.dark")}</option>
                    </select>
                </label>
                <label>{t("settings.language")}
                    <select value={values.defaultLanguage || "fa"} onChange={e => setValues({ ...values, defaultLanguage: e.target.value })}>
                        <option value="fa">{t("settings.persian")}</option>
                        <option value="en">{t("settings.english")}</option>
                    </select>
                </label>
                <label>{t("settings.currency")}
                    <select value={values.currency || "IRR"} onChange={e => setValues({ ...values, currency: e.target.value })}>
                        <option value="IRR">{t("settings.rial")}</option>
                        <option value="TOMAN">{t("settings.toman")}</option>
                    </select>
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("settings.currencyHint")}</p>
                <label>{t("settings.tagline")}
                    <input value={values.siteTagline || ""} onChange={e => setValues({ ...values, siteTagline: e.target.value })} />
                </label>
                <label>{t("settings.heroTitle")}
                    <input value={values.heroTitle || ""} onChange={e => setValues({ ...values, heroTitle: e.target.value })} />
                </label>
                <label>{t("settings.heroSubtitle")}
                    <input value={values.heroSubtitle || ""} onChange={e => setValues({ ...values, heroSubtitle: e.target.value })} />
                </label>
                <label>{t("settings.heroBtnText")}
                    <input value={values.heroButtonText || ""} onChange={e => setValues({ ...values, heroButtonText: e.target.value })} />
                </label>
                <label>{t("settings.heroBtnUrl")}
                    <input value={values.heroButtonUrl || ""} onChange={e => setValues({ ...values, heroButtonUrl: e.target.value })} />
                </label>

                <h3 style={{ margin: "16px 0 0" }}>{t("settings.shop")}</h3>
                <label>{t("settings.libraryPrice")}
                    <input
                        type="number"
                        min="0"
                        step="1000"
                        value={values["library.ebookPrice"] || ""}
                        onChange={e => setValues({ ...values, "library.ebookPrice": e.target.value })}
                        placeholder="500000"
                        dir="ltr"
                    />
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("settings.libraryPriceHint")}</p>

                <h3 style={{ margin: "16px 0 0" }}>{t("settings.registration")}</h3>
                <p className="muted" style={{ margin: 0 }}>{t("settings.regHint")}</p>
                <label>{t("settings.defaultCountry")}
                    <select value={values.defaultCountry || ""} onChange={e => setValues({ ...values, defaultCountry: e.target.value })}>
                        <option value="">{t("settings.defaultCountryAuto")}</option>
                        {countries.map(c => (
                            <option key={`${c.code}-${c.dial}`} value={c.dial}>
                                {(lang === "fa" ? (c.nameFa || c.name) : c.name)} ({c.dial})
                            </option>
                        ))}
                    </select>
                </label>
                <div className="form-row">
                    <label>{t("settings.smtpHost")}
                        <input value={values["smtp.host"] || ""} onChange={e => setValues({ ...values, "smtp.host": e.target.value })} placeholder="smtp.example.com" dir="ltr" />
                    </label>
                    <label>{t("settings.smtpPort")}
                        <input value={values["smtp.port"] || ""} onChange={e => setValues({ ...values, "smtp.port": e.target.value })} placeholder="587" dir="ltr" />
                    </label>
                </div>
                <div className="form-row">
                    <label>{t("settings.smtpUser")}
                        <input value={values["smtp.username"] || ""} onChange={e => setValues({ ...values, "smtp.username": e.target.value })} dir="ltr" autoComplete="off" />
                    </label>
                    <label>{t("settings.smtpPass")}
                        <input type="password" value={values["smtp.password"] || ""} onChange={e => setValues({ ...values, "smtp.password": e.target.value })} dir="ltr" autoComplete="new-password" />
                    </label>
                </div>
                <label>{t("settings.smtpFrom")}
                    <input value={values["smtp.from"] || ""} onChange={e => setValues({ ...values, "smtp.from": e.target.value })} placeholder="no-reply@example.com" dir="ltr" />
                </label>
                <p className="muted" style={{ margin: 0 }}>{t("settings.smtpHint")}</p>
                <div><button className="btn" type="submit">{t("settings.save")}</button></div>
            </form>
        </AdminLayout>
    );
}
