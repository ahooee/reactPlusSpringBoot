import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { useCart, maxFor, isFixedQty } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import { apiFetch, imageSrc } from "../lib/api";
import { money } from "../lib/price";
import "../components/CartDrawer.css";
import "./Basket.css";

export default function Basket() {
    const { items, setQty, remove, clear, checkout, count, subtotal, needsAddress } = useCart();
    const { user } = useAuth();
    const { t, lang } = useLanguage();
    usePageTitle(t("basket.title"));
    const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" });
    const [profile, setProfile] = useState({ username: "", name: "", phone: "" });
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [paying, setPaying] = useState(false);

    // Registered users don't retype their data: name/phone come from the profile
    // and are shown read-only; only missing pieces (e.g. address) stay editable.
    useEffect(() => {
        if (!user) return;
        apiFetch("/api/auth/me")
            .then(me => {
                const full = [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim();
                const ph = me?.phone || "";
                setProfile({ username: me?.username || "", name: full, phone: ph });
                setForm(f => ({
                    name: f.name || full,
                    phone: f.phone || ph,
                    address: f.address,
                    email: f.email || me?.email || "",
                }));
            })
            .catch(() => {});
    }, [user]);

    async function placeOrder(e) {
        e.preventDefault();
        setError(null);
        setPlacing(true);
        try {
            const result = await checkout(form);
            setOrder(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setPlacing(false);
        }
    }

    async function payNow() {
        if (!order?.accessToken) return;
        setError(null);
        setPaying(true);
        try {
            const res = await apiFetch(`/api/orders/track/${order.accessToken}/pay`, { method: "POST" });
            if (res?.paymentUrl) {
                window.location.href = res.paymentUrl;
            } else {
                setError("No payment URL returned");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setPaying(false);
        }
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("basket.title") }]} />
                <h1>{t("basket.title")} ({count})</h1>

                {order ? (
                    <div className="cart-success basket-success">
                        <div className="cart-success-icon">✓</div>
                        <h2>{t("cart.success")}</h2>
                        <p className="muted">{t("cart.orderNo")}: <b>{order.orderNumber}</b></p>
                        <p className="muted">{t("cart.subtotal")}: <b>{money(order.total, lang)}</b></p>
                        <p className="muted">{t("orders.statusLabel")}: <b>{order.status}</b></p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                            <button className="btn" onClick={payNow} disabled={paying}>
                                {paying ? "…" : t("cart.payNow")}
                            </button>
                            <Link className="btn" to={`/orders/track/${order.accessToken}`}>{t("orders.track")}</Link>
                            <Link className="btn" to="/shop">{t("basket.continueShopping")}</Link>
                        </div>
                        {error && <p className="error">{error}</p>}
                    </div>
                ) : items.length === 0 ? (
                    <div className="basket-empty">
                        <div className="cart-empty-icon">🛒</div>
                        <p>{t("basket.empty")}</p>
                        <Link className="btn" to="/shop">{t("basket.continueShopping")}</Link>
                    </div>
                ) : (
                    <div className="basket-layout">
                        <div className="basket-lines">
                            {items.map(i => {
                                const cap = maxFor(i);
                                const fixed = isFixedQty(i);
                                return (
                                    <div key={i.id} className="cart-item">
                                        {i.imageUrl ? (
                                            <img src={imageSrc(i.imageUrl)} alt={i.name} />
                                        ) : (
                                            <div className="cart-item-ph">🛍</div>
                                        )}
                                        <div className="cart-item-info">
                                            <Link to={`/shop/${encodeURIComponent(i.slug)}`}>{i.name}</Link>
                                            <span className="cart-unit">{money(i.price, lang)}</span>
                                            {fixed ? (
                                                <>
                                                    <span className="cart-fixed-qty">× {i.qty}</span>
                                                    <span className="cart-cap">{t("cart.fixedQty")}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="cart-stepper">
                                                        <button onClick={() => setQty(i.id, i.qty - 1)} title="-1">−</button>
                                                        <span>{i.qty}</span>
                                                        <button onClick={() => setQty(i.id, i.qty + 1)} disabled={i.qty >= cap}>+</button>
                                                    </div>
                                                    {i.qty >= cap && cap > 0 && (
                                                        <span className="cart-cap">{t("cart.limitReached")}</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="cart-item-side">
                                            <b>{money(Number(i.price) * i.qty, lang)}</b>
                                            <button className="cart-remove" onClick={() => remove(i.id)}>{t("cart.remove")}</button>
                                        </div>
                                    </div>
                                );
                            })}
                            <button className="small-btn danger" onClick={clear}>{t("basket.clear")}</button>
                        </div>

                        <aside className="basket-summary">
                            <h3>{t("basket.summary")}</h3>
                            <div className="cart-total">
                                <span>{t("cart.subtotal")} ({count})</span>
                                <b>{money(subtotal, lang)}</b>
                            </div>
                            {error && <p className="error">{error}</p>}
                            <form className="form" onSubmit={placeOrder}>
                                {user ? (
                                    <div className="basket-identity">
                                        <div className="basket-identity-row">
                                            <span className="muted">{t("auth.username")}</span>
                                            <b dir="auto">{profile.username || user.username}</b>
                                        </div>
                                        {profile.name ? (
                                            <div className="basket-identity-row">
                                                <span className="muted">{t("cart.name")}</span>
                                                <b dir="auto">{profile.name}</b>
                                            </div>
                                        ) : (
                                            <label>{t("cart.name")} <span className="muted">({t("common.optional")})</span>
                                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                            </label>
                                        )}
                                        {profile.phone ? (
                                            <div className="basket-identity-row">
                                                <span className="muted">{t("cart.phone")}</span>
                                                <b dir="ltr">{profile.phone}</b>
                                            </div>
                                        ) : (
                                            <label>{t("cart.phone")} <span className="muted">({t("common.optional")})</span>
                                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                            </label>
                                        )}
                                        <label>{t("cart.email")} <span className="muted">({t("common.optional")})</span>
                                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                        </label>
                                    </div>
                                ) : (
                                    <>
                                        <label>{t("cart.name")}
                                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                        </label>
                                        <label>{t("cart.phone")}
                                            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                                        </label>
                                        <label>{t("cart.email")} <span className="muted">({t("common.optional")})</span>
                                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                        </label>
                                    </>
                                )}
                                {needsAddress && (
                                    <label>{t("cart.address")}
                                        <textarea rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
                                    </label>
                                )}
                                <button className="btn cart-checkout-btn" type="submit" disabled={placing}>
                                    {placing ? "…" : t("cart.placeOrder")}
                                </button>
                            </form>
                        </aside>
                    </div>
                )}
            </main>
        </>
    );
}
