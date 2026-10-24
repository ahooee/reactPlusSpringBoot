import { useLanguage } from "../context/LanguageContext";

export default function PageBuilderLayout({ children, title, onBack }) {
    const { t } = useLanguage();
    return (
        <div className="page-builder-shell">
            <header className="page-builder-header">
                <button className="page-builder-back" type="button" onClick={onBack}>
                    ← {t("pages.backToPages") || "Back to pages"}
                </button>
                <h1>{title}</h1>
            </header>
            <main className="page-builder-canvas">{children}</main>
        </div>
    );
}