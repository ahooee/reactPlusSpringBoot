import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch, imageSrc } from "../lib/api";
import { money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Orders.css";
import "./Support.css";
import "./Basket.css";
import "../components/CartDrawer.css";

function fmtDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

export function OrderStatus({ status }) {
    const { t } = useLanguage();
    const s = (status || "pending_payment").toLowerCase();
    return (
        <span className={`order-status order-${s}`}>
            {t(`orders.status_${s}`)}
        </span>
    );
}

export function isPayable(status) {
    return status === "PENDING_PAYMENT" || status === "PAYMENT_FAILED";
}

export default function Orders() {
    const { t, lang } = useLanguage();
    usePageTitle(t("orders.title"));
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [notice, setNotice] = useState("");
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        apiFetch("/api/orders")
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .catch(e => setNotice(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedId == null) {
            setDetail(null);
            return;
        }
        apiFetch(`/api/orders/${selectedId}`)
            .then(setDetail)
            .catch(e => setNotice(e.message));
    }, [selectedId]);

    async function payFor(order) {
        const token = order?.accessToken || detail?.accessToken;
        if (!token) return;
        setNotice("");
        setPaying(true);
        try {
            const res = await apiFetch(`/api/orders/track/${token}/pay`, { method: "POST" });
            if (res?.paymentUrl) window.location.href = res.paymentUrl;
            else setNotice("No payment URL returned");
        } catch (e) {
            setNotice(e.message);
        } finally {
            setPaying(false);
        }
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={detail
                    ? [{ to: "/", label: t("nav.home") }, { to: "/orders", label: t("orders.title") }, { label: detail.orderNumber || `#${detail.id}` }]
                    : [{ to: "/", label: t("nav.home") }, { label: t("orders.title") }]} />
                <h1>{t("orders.title")}</h1>
                <p className="muted">{t("orders.desc")}</p>
                {notice && <p className="error">{notice}</p>}
                {loading && <p className="muted">{t("common.loading")}</p>}
                {!loading && orders.length === 0 && (
                    <p className="muted">{t("orders.empty")}</p>
                )}

                <div className="orders-grid">
                    <section className="orders-list">
                        {orders.map(o => (
                            <button
                                key={o.id}
                                type="button"
                                className={`order-item${o.id === selectedId ? " active" : ""}`}
                                onClick={() => setSelectedId(o.id)}
                            >
                                <span className="order-item-top">
                                    <b dir="auto">{o.orderNumber || `#${o.id}`}</b>
                                    <OrderStatus status={o.status} />
                                </span>
                                <span className="order-item-meta muted">
                                    {o.itemCount} {t("orders.items")} · {money(o.total, lang)} · {fmtDate(o.orderedAt)}
                                </span>
                            </button>
                        ))}
                    </section>

                    <section className="support-detail">
                        {!detail ? (
                            <p className="muted">{t("orders.selectOrder")}</p>
                        ) : (
                            <>
                                <h3 dir="auto">{detail.orderNumber || `#${detail.id}`}</h3>
                                <p className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                    <OrderStatus status={detail.status} />
                                    <span>{fmtDate(detail.orderedAt)}</span>
                                </p>
                                <div className="basket-identity" style={{ marginBottom: 12 }}>
                                    {detail.customerName && (
                                        <div className="basket-identity-row">
                                            <span className="muted">{t("cart.name")}</span>
                                            <b dir="auto">{detail.customerName}</b>
                                        </div>
                                    )}
                                    {detail.customerPhone && (
                                        <div className="basket-identity-row">
                                            <span className="muted">{t("cart.phone")}</span>
                                            <b dir="ltr">{detail.customerPhone}</b>
                                        </div>
                                    )}
                                    {detail.customerAddress && (
                                        <div className="basket-identity-row">
                                            <span className="muted">{t("cart.address")}</span>
                                            <b dir="auto">{detail.customerAddress}</b>
                                        </div>
                                    )}
                                    <div className="basket-identity-row">
                                        <span className="muted">{t("cart.subtotal")}</span>
                                        <b>{money(detail.total, lang)}</b>
                                    </div>
                                </div>
                                {(detail.items || []).map(line => {
                                    const qty = line.qty ?? line.quantity ?? 0;
                                    return (
                                        <div key={line.id} className="cart-item">
                                            {line.imageUrl ? (
                                                <img src={imageSrc(line.imageUrl)} alt={line.name} />
                                            ) : (
                                                <div className="cart-item-ph">🛍</div>
                                            )}
                                            <div className="cart-item-info">
                                                {line.slug
                                                    ? <Link to={`/shop/${encodeURIComponent(line.slug)}`}>{line.name}</Link>
                                                    : <span dir="auto">{line.name}</span>}
                                                <span className="cart-unit">{money(line.price, lang)} × {qty}</span>
                                            </div>
                                            <div className="cart-item-side">
                                                <b>{money(Number(line.price) * qty, lang)}</b>
                                            </div>
                                        </div>
                                    );
                                })}
                                {isPayable(detail.status) && (
                                    <button className="btn" onClick={() => payFor(detail)} disabled={paying} style={{ marginTop: 12 }}>
                                        {paying ? "…" : t("cart.payNow")}
                                    </button>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
