import { Link } from "react-router-dom";
import { useCart, maxFor, isFixedQty } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { imageSrc } from "../lib/api";
import { money } from "../lib/price";
import "./CartDrawer.css";

export default function CartDrawer() {
    const { items, setQty, remove, count, subtotal, open, setOpen } = useCart();
    const { t, lang } = useLanguage();

    if (!open) return null;

    return (
        <div className="cart-overlay" onClick={() => setOpen(false)}>
            <aside className="cart-drawer" onClick={e => e.stopPropagation()}>
                <div className="cart-head">
                    <h3>{t("cart.title")} ({count})</h3>
                    <button className="cart-close" onClick={() => setOpen(false)} aria-label={t("cart.close")}>×</button>
                </div>

                {items.length === 0 ? (
                    <div className="cart-empty">
                        <div className="cart-empty-icon">🛒</div>
                        <p>{t("cart.empty")}</p>
                        <button className="btn" onClick={() => setOpen(false)}>{t("cart.continue")}</button>
                    </div>
                ) : (
                    <>
                        <div className="cart-items">
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
                                            <Link to={`/shop/${encodeURIComponent(i.slug)}`} onClick={() => setOpen(false)}>{i.name}</Link>
                                            <span className="cart-unit">{money(i.price, lang)}</span>
                                            {fixed ? (
                                                <>
                                                    <span className="cart-fixed-qty">× {i.qty}</span>
                                                    <span className="cart-cap">{t("cart.fixedQty")}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="cart-stepper">
                                                        <button onClick={() => setQty(i.id, i.qty - 1)}>−</button>
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
                        </div>

                        <div className="cart-foot">
                            <div className="cart-total">
                                <span>{t("cart.subtotal")}</span>
                                <b>{money(subtotal, lang)}</b>
                            </div>
                            <Link className="btn cart-checkout-btn" to="/basket" onClick={() => setOpen(false)}>
                                {t("cart.viewBasket")}
                            </Link>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
}
