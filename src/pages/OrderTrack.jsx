import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch, imageSrc } from "../lib/api";
import { money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import { OrderStatus } from "./Orders";
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

export default function OrderTrack() {
    const { token } = useParams();
    const [params] = useSearchParams();
    const { t, lang } = useLanguage();
    usePageTitle(t("orders.trackTitle"));
    const [detail, setDetail] = useState(null);
    const [notice, setNotice] = useState("");
    const [paying, setPaying] = useState(false);
    const payment = params.get("payment");

    useEffect(() => {
        if (!token) return;
        apiFetch(`/api/orders/track/${token}`)
            .then(setDetail)
            .catch(e => setNotice(e.message));
    }, [token]);

    async function payNow() {
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

    const payable = detail && (detail.status === "PENDING_PAYMENT" || detail.status === "PAYMENT_FAILED");

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: detail?.orderNumber || t("orders.trackTitle") }]} />
                <h1>{t("orders.trackTitle")}</h1>
                {payment === "success" && <p className="success">{t("orders.paymentSuccess")}</p>}
                {payment === "failed" && <p className="error">{t("orders.paymentFailed")}</p>}
                {notice && <p className="error">{notice}</p>}
                {!detail ? (
                    <p className="muted">{t("common.loading")}</p>
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
                        {(detail.items || []).map(line => (
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
                                    <span className="cart-unit">{money(line.price, lang)} × {line.qty ?? line.quantity}</span>
                                </div>
                                <div className="cart-item-side">
                                    <b>{money(Number(line.price) * (line.qty ?? line.quantity ?? 0), lang)}</b>
                                </div>
                            </div>
                        ))}
                        {payable && (
                            <button className="btn" onClick={payNow} disabled={paying} style={{ marginTop: 12 }}>
                                {paying ? "…" : t("cart.payNow")}
                            </button>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
