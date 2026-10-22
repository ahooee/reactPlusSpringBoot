import { Link } from "react-router-dom";
import { useCart, maxFor } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { imageSrc } from "../lib/api";
import { discountOf, finalPrice, hasDiscount, money } from "../lib/price";
import "./ProductCard.css";

export default function ProductCard({ product, grid = false }) {
    const { add, remove, items } = useCart();
    const { t, lang } = useLanguage();
    const { showToast } = useToast();

    const cap = maxFor(product);
    const inCart = items.find(i => i.id === product.id)?.qty || 0;
    const soldOut = cap <= 0;

    function handleAdd() {
        if (inCart >= cap) {
            showToast(t("shop.limitToast", { n: cap }));
            return;
        }
        add(product, 1);
    }

    function handleRemove() {
        remove(product.id);
    }

    return (
        <div className={`amz-card${grid ? " grid" : ""}`}>
            <Link to={`/shop/${encodeURIComponent(product.slug)}`} className="amz-thumb">
                {hasDiscount(product) && <span className="amz-off">%{discountOf(product)}</span>}
                {product.imageUrl ? (
                    <img src={imageSrc(product.imageUrl)} alt={product.name} loading="lazy" />
                ) : (
                    <div className="amz-ph">🛍</div>
                )}
            </Link>
            <div className="amz-info">
                <Link to={`/shop/${encodeURIComponent(product.slug)}`} className="amz-title">{product.name}</Link>
                {product.author && <span className="amz-cat">{product.author}</span>}
                <span className={`amz-type${product.bookType === "PAPER" ? " paper" : ""}`}>
                    {product.bookType === "PAPER" ? `📕 ${t("products.bookTypePaper")}` : `📄 ${t("products.bookTypePdf")}`}
                </span>
                {product.category && (
                    <Link to={`/shop?category=${product.category.slug}`} className="amz-cat">
                        {lang === "fa" ? (product.category.nameFa || product.category.name) : (product.category.name || product.category.nameFa)}
                    </Link>
                )}
                <div className="amz-price-row">
                    <span className="amz-price">{money(finalPrice(product), lang)}</span>
                    {hasDiscount(product) && <span className="amz-old">{money(product.price, lang)}</span>}
                </div>
                {!soldOut ? (
                    <span className="amz-stock">{t("shop.inStock")}</span>
                ) : (
                    <span className="amz-stock out">{t("shop.outOfStock")}</span>
                )}
                <button
                    className="amz-add"
                    onClick={handleAdd}
                    disabled={soldOut}
                >
                    {soldOut ? t("shop.outOfStock") : t("shop.addToCart")}
                </button>
                {inCart > 0 && (
                    <button
                        className="amz-add amz-remove"
                        onClick={handleRemove}
                    >
                        {t("cart.remove")}
                    </button>
                )}
                {inCart > 0 && (
                    <span className="amz-incart">{t("shop.inCart")}: {inCart}</span>
                )}
            </div>
        </div>
    );
}
