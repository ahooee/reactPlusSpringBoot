import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PaperSoon.css";
import { useLanguage } from "../context/LanguageContext";

/** Fires from anywhere: dispatch this to trigger the paper-books overlay. */
export function showPaperSoon() {
    window.dispatchEvent(new CustomEvent("paper-books-soon"));
}

const PAPER_PATHS = new Set(["/books/paper-books", "/books/paper-books/"]);

/**
 * Global "coming soon" overlay for paper books. Mounted once in App.jsx
 * (no props): intercepts any click site-wide on a link to
 * {@code /books/paper-books} — the page dims and a 3-second circular
 * countdown runs, then the overlay closes and the user stays put.
 *
 * Also used as the {@code /books/paper-books} route element with
 * {@code redirect}: typed / bookmarked / revisited URLs open the overlay
 * immediately and navigate to {@code /books/ebooks} when the ring
 * completes or the dim is clicked. Replacement navigation keeps the paper
 * URL out of history.
 */
export default function PaperSoon({ redirect }) {
    // Route variant (redirect set) is open on arrival; the global instance
    // waits for paper-book clicks / the appearing-soon dispatch.
    const [open, setOpen] = useState(Boolean(redirect));
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Site-wide click net — only on the global (non-route) instance.
    useEffect(() => {
        if (redirect) return undefined;
        const onShow = () => setOpen(true);
        window.addEventListener("paper-books-soon", onShow);

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
            if (PAPER_PATHS.has(path)) {
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
    }, [redirect]);

    // 3s countdown: plain overlay closes; the route variant redirects.
    useEffect(() => {
        if (!open) return undefined;
        const timer = setTimeout(() => {
            if (redirect) navigate(redirect, { replace: true });
            else setOpen(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, [open, redirect, navigate]);

    if (!open) return null;

    return (
        <div
            className="paper-soon"
            role="alert"
            aria-live="polite"
            onClick={() => (redirect ? navigate(redirect, { replace: true }) : setOpen(false))}
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
