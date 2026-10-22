import { LANGUAGES } from "../i18n/translations";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageToggle() {
    const { lang, setLang } = useLanguage();

    return (
        <div className="lang-toggle" role="radiogroup" aria-label="Language / زبان">
            {LANGUAGES.map(l => (
                <button
                    key={l.id}
                    role="radio"
                    aria-checked={lang === l.id}
                    title={l.name}
                    className={`lang-option ${lang === l.id ? "active" : ""}`}
                    onClick={() => setLang(l.id)}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
}
