import { Link } from "react-router-dom";
import { showPaperSoon } from "./PaperSoon";
import "./Breadcrumbs.css";

/**
 * Hierarchy links shown at the top of every page.
 * items: [{ to?, label, soon? }] — the last item is the current page
 * (plain text). An item with {@code soon: true} never navigates: it dims
 * the page and shows the paper-books "coming soon" overlay instead.
 */
export default function Breadcrumbs({ items }) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
        <nav className="crumbs" aria-label="Breadcrumb">
            {items.map((it, i) => {
                const last = i === items.length - 1;
                return (
                    <span key={i} className="crumb">
                        {i > 0 && <span className="crumb-sep" aria-hidden="true">›</span>}
                        {last || !it.to ? (
                            <span className="crumb-current" aria-current="page">{it.label}</span>
                        ) : it.soon ? (
                            <Link
                                to={it.to}
                                onClick={e => {
                                    e.preventDefault();
                                    showPaperSoon();
                                }}
                            >
                                {it.label}
                            </Link>
                        ) : (
                            <Link to={it.to}>{it.label}</Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
