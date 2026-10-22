import { useEffect, useState } from "react";
import "./PaperSoon.css";
import { useLanguage } from "../context/LanguageContext";

/** Fires from anywhere: dispatch this to trigger the paper-books overlay. */
export function showPaperSoon() {
    window.dispatchEvent(new CustomEvent("paper-books-soon"));
}

/**
 * Global "coming soon" overlay for paper-book links: dims the page and runs
 * a 3-second circular countdown, then closes — no navigation happens.
 * Mounted once in App.jsx.
 */
export default function PaperSoon() {
    const [open, setOpen] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const onShow = () => setOpen(true);
        window.addEventListener("paper-books-soon", onShow);
        return () => window.removeEventListener("paper-books-soon", onShow);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const timer = setTimeout(() => setOpen(false), 3000);
        return () => clearTimeout(timer);
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="paper-soon"
            role="alert"
            aria-live="polite"
            onClick={() => setOpen(false)}
        >
            <div className="paper-soon-card" onClick={e => e.stopPropagation()}>
                <span className="paper-soon-emoji" aria-hidden="true">📕</span>
                <svg className="paper-soon-ring" viewBox="0 0 64 64" aria-hidden="true">
                    <circle className="paper-soon-ring-bg" cx="32" cy="32" r="26" />
                    <circle className="paper-soon-ring-fg" cx="32" cy="32" r="26" />
                </svg>
                <div className="paper-soon-title">{t("books.comingSoon")}</div>
                <div className="paper-soon-sub">{t("books.comingSoonSub")}</div>
            </div>
        </div>
    );
}
