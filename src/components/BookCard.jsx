import { useState } from "react";
import { Link } from "react-router-dom";
import { imageSrc } from "../lib/api";
import { money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import "./ProductCard.css";
import "./BookCard.css";

/**
 * Catalog card for a row from the books table. The bottom row shows the
 * price with a tiny add-to-cart (and × remove once in cart) — hideable
 * from Admin → Settings → Shop ("library.cardBuyButtons").
 */
export default function BookCard({ book, grid = false }) {
    const [broken, setBroken] = useState(false);
    const [adding, setAdding] = useState(false);
    const { lang, t } = useLanguage();
    const { items, addLibraryBook, remove } = useCart();
    const { settings } = useTheme();
    const { showToast } = useToast();

    const showBuyRow = (settings["library.cardBuyButtons"] ?? "true") !== "false";
    const buyLine = book.id ? items.find(i => i.bookId === book.id) : null;
    const to = `/books/${encodeURIComponent(book.id)}`;
    const cover = book.coverUrl ? imageSrc(book.coverUrl) : "";
    const format = (book.format || "ebook").toUpperCase();

    async function addToCart() {
        if (adding) return;
        setAdding(true);
        try {
            await addLibraryBook(book.id);
            showToast(t("books.added"));
        } catch (err) {
            showToast(err?.message || t("books.buyError"));
        } finally {
            setAdding(false);
        }
    }

    return (
        <div className={`amz-card book-card${grid ? " grid" : ""}`}>
            <Link to={to} className="amz-thumb">
                {cover && !broken ? (
                    <img
                        src={cover}
                        alt={book.title}
                        loading="lazy"
                        onError={() => setBroken(true)}
                    />
                ) : (
                    <div className="amz-ph">📖</div>
                )}
            </Link>
            <div className="amz-info">
                <Link to={to} className="amz-title">{book.title}</Link>
                {book.author && <span className="amz-cat">{book.author}</span>}
                {book.category && (
                    <Link
                        to={`/books?category=${encodeURIComponent(book.categorySlug)}`}
                        className="amz-cat book-category"
                    >
                        {lang === "fa" && book.categoryNameFa ? book.categoryNameFa : book.category}
                    </Link>
                )}
                <span className="amz-type book-format">{format}</span>
                {showBuyRow && (
                    <div className="book-buyrow">
                        {book.price != null && <span className="book-buyprice">{money(book.price, lang)}</span>}
                        {buyLine ? (
                            <button
                                className="book-buy-x"
                                title={t("cart.remove")}
                                aria-label={t("cart.remove")}
                                onClick={() => remove(buyLine.id)}
                            >
                                ×
                            </button>
                        ) : (
                            <button
                                className="book-buy-add"
                                title={t("shop.addToCart")}
                                aria-label={t("shop.addToCart")}
                                disabled={adding}
                                onClick={addToCart}
                            >
                                +
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
