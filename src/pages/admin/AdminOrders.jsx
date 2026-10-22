import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { OrderStatus } from "../Orders";
import { apiFetch } from "../../lib/api";
import { money } from "../../lib/price";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";
import "../Orders.css";
import "../Support.css";
import "../Basket.css";
import "../../components/CartDrawer.css";

function fmtDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

const FILTERS = ["ALL", "PENDING_PAYMENT", "PAYMENT_FAILED", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const ACTIONS = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "PAID", "PENDING_PAYMENT"];

export default function AdminOrders() {
    const { t, lang } = useLanguage();
    usePageTitle(t("admin.orders"));
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState("ALL");
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [notice, setNotice] = useState("");

    function load(nextFilter = filter) {
        setNotice("");
        const q = nextFilter && nextFilter !== "ALL" ? `?status=${nextFilter}` : "";
        apiFetch(`/api/admin/orders${q}`)
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .catch(e => setNotice(e.message));
    }

    useEffect(() => { load("ALL"); }, []);

    useEffect(() => {
        if (selectedId == null) {
            setDetail(null);
            return;
        }
        apiFetch(`/api/admin/orders/${selectedId}`)
            .then(setDetail)
            .catch(e => setNotice(e.message));
    }, [selectedId]);

    function pickFilter(f) {
        setFilter(f);
        load(f);
    }

    async function setStatus(status) {
        if (selectedId == null) return;
        try {
            const updated = await apiFetch(`/api/admin/orders/${selectedId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
            setDetail(updated);
            load();
        } catch (e) {
            setNotice(e.message);
        }
    }

    return (
        <AdminLayout>
            <h1>{t("admin.orders")}</h1>
            <p className="muted">{t("orders.adminDesc")}</p>
            {notice && <p className="error">{notice}</p>}

            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
                {FILTERS.map(f => (
                    <button
                        key={f}
                        type="button"
                        className={`small-btn${filter === f ? " active" : ""}`}
                        onClick={() => pickFilter(f)}
                    >
                        {f === "ALL" ? t("support.filterAll") : t(`orders.status_${f.toLowerCase()}`)}
                    </button>
                ))}
            </div>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>{t("orders.order")}</th>
                        <th>{t("support.user")}</th>
                        <th>{t("orders.items")}</th>
                        <th>{t("cart.subtotal")}</th>
                        <th>{t("support.status")}</th>
                        <th>{t("support.updated")}</th>
                        <th>{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(o => (
                        <tr key={o.id} style={o.id === selectedId ? { background: "var(--accent-soft)" } : undefined}>
                            <td dir="auto">{o.orderNumber || `#${o.id}`}</td>
                            <td dir="auto">{o.username || "—"}</td>
                            <td>{o.itemCount}</td>
                            <td>{money(o.total, lang)}</td>
                            <td><OrderStatus status={o.status} /></td>
                            <td className="muted">{fmtDate(o.orderedAt)}</td>
                            <td>
                                <button className="small-btn" onClick={() => setSelectedId(o.id)}>
                                    {t("support.view")}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {orders.length === 0 && <p className="muted">{t("orders.empty")}</p>}

            {detail && (
                <div className="support-detail" style={{ marginTop: 20 }}>
                    <h3 dir="auto">{detail.orderNumber || `#${detail.id}`}</h3>
                    <p className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span dir="auto">{detail.username || ""}</span>
                        <OrderStatus status={detail.status} />
                        <span>{fmtDate(detail.orderedAt)}</span>
                    </p>
                    <div className="basket-identity" style={{ marginBottom: 12 }}>
                        <div className="basket-identity-row">
                            <span className="muted">{t("cart.name")}</span>
                            <b dir="auto">{detail.customerName || "—"}</b>
                        </div>
                        <div className="basket-identity-row">
                            <span className="muted">{t("cart.phone")}</span>
                            <b dir="ltr">{detail.customerPhone || "—"}</b>
                        </div>
                        <div className="basket-identity-row">
                            <span className="muted">{t("cart.address")}</span>
                            <b dir="auto">{detail.customerAddress || "—"}</b>
                        </div>
                        <div className="basket-identity-row">
                            <span className="muted">{t("cart.subtotal")}</span>
                            <b>{money(detail.total, lang)}</b>
                        </div>
                    </div>
                    {(detail.items || []).map(line => {
                        const qty = line.qty ?? line.quantity ?? 0;
                        return (
                            <div key={line.id} className="cart-item" style={{ marginBottom: 8 }}>
                                <div className="cart-item-info">
                                    <span dir="auto">{line.name}</span>
                                    <span className="cart-unit">{money(line.price, lang)} × {qty}</span>
                                </div>
                                <div className="cart-item-side">
                                    <b>{money(Number(line.price) * qty, lang)}</b>
                                </div>
                            </div>
                        );
                    })}
                    <div className="admin-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
                        {ACTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                className={`small-btn${detail.status === s ? " active" : ""}`}
                                onClick={() => setStatus(s)}
                            >
                                {t(`orders.status_${s.toLowerCase()}`)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
