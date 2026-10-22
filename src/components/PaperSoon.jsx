import { useEffect, useState } from "react";
import "./PaperSoon.css";
import { useLanguage } from "../context/LanguageContext";

/** Fires from anywhere: dispatch this to trigger the paper-books overlay. */
export function showPaperSoon() {
    window.dispatchEvent(new CustomEvent("paper-books-soon"));
}

/**
 * Global "coming soon" overlay for paper-book links. Mounted once in
 * App.jsx. Any click anywhere on the site on a link whose path is
 * {@code /books/paper-books} is intercepted (capture phase, primary
 * unmodified clicks only) — the page dims, a 3-second circular countdown
 * runs, then the overlay closes and the user stays put.
 */
export default function PaperSoon() {
    const [open, setOpen] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const onShow = () => setOpen(true);
        window.addEventListener("paper-books-soon", onShow);

        // One net for the whole site: navbar menus, breadcrumbs, generated
        // content… anything linking /books/paper-books shows the overlay
        // instead of navigating (ctrl/middle clicks keep normal behavior).
        const onClickCapture = e => {
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            const link = e.target?.closest?.('a[href]') || null;
            if (!link) return;
            let path;
            try {
                path = new URL(link.getAttribute("href"), window.location.origin).pathname;
            } catch {
                return;
            }
            if (path === "/books/paper-books" || path === "/books/paper-books/") {
                e.preventDefault();
                e.stopPropagation();
                onShow();
            }
        };
        document.addEventListener("click", onClickCapture, true);

        return () => {
            window.removeEventListener("paper-books-soon", onShow);
            document.removeEventListener("click", onClickCapture, true);
        };
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
