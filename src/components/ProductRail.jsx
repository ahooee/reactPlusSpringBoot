import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, imageSrc } from "../lib/api";
import { money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import "./ProductRail.css";

export default function ProductRail({ limit = 8 }) {
    const [products, setProducts] = useState([]);
    const [ready, setReady] = useState(false);
    const [collapsed, setCollapsed] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < 1280 : false
    );
    const { t, lang } = useLanguage();

    useEffect(() => {
        Promise.all([
            apiFetch("/api/products").catch(() => []),
            apiFetch("/api/settings").catch(() => ({})),
        ]).then(([all, settings]) => {
            const list = Array.isArray(all) ? all : [];
            const raw = settings?.railProductIds;
            if (raw === undefined || raw === null || raw === "") {
                // Not curated by admin yet → latest products
                setProducts(list.slice(0, limit));
            } else {
                let ids = [];
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) ids = parsed;
                } catch {
                    ids = [];
                }
                const byId = new Map(list.map(p => [p.id, p]));
                setProducts(ids.map(id => byId.get(id)).filter(Boolean));
            }
            setReady(true);
        });
    }, [limit]);

    if (!ready || products.length === 0) return null;

    if (collapsed) {
        return (
            <button
                className="product-rail-fab"
                onClick={() => setCollapsed(false)}
                title={t("rail.expand")}
                aria-label={t("rail.expand")}
            >
                🛍
            </button>
        );
    }

    return (
        <aside className="product-rail">
            <div className="product-rail-head">
                <h3>{t("rail.title")}</h3>
                <div className="product-rail-head-actions">
                    <Link to="/shop">{t("rail.viewAll")}</Link>
                    <button
                        className="product-rail-close"
                        onClick={() => setCollapsed(true)}
                        title={t("rail.collapse")}
                        aria-label={t("rail.collapse")}
                    >
                        ×
                    </button>
                </div>
            </div>
            <div className="product-rail-list">
                {products.map(p => (
                    <Link key={p.id} to={`/shop/${encodeURIComponent(p.slug)}`} className="product-rail-item">
                        {p.imageUrl ? (
                            <img src={imageSrc(p.imageUrl)} alt={p.name} loading="lazy" />
                        ) : (
                            <div className="product-rail-ph">🛍</div>
                        )}
                        <div className="product-rail-info">
                            <strong>{p.name}</strong>
                            <span>{money(p.price, lang)}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </aside>
    );
}
