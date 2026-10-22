import { Link } from "react-router-dom";
import "./Breadcrumbs.css";

/**
 * Hierarchy links shown at the top of every page.
 * items: [{ to?, label }] — the last item is the current page (plain text).
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
                        ) : (
                            <Link to={it.to}>{it.label}</Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
