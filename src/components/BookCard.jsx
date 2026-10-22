import { useState } from "react";
import { Link } from "react-router-dom";
import { imageSrc } from "../lib/api";
import "./ProductCard.css";
import "./BookCard.css";

/** Catalog card for a row from the books table (no cart: these are library books). */
export default function BookCard({ book, grid = false }) {
    const [broken, setBroken] = useState(false);
    const to = `/books/${encodeURIComponent(book.id)}`;
    const cover = book.coverUrl ? imageSrc(book.coverUrl) : "";
    const format = (book.format || "ebook").toUpperCase();

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
                        {book.category}
                    </Link>
                )}
                <span className="amz-type book-format">{format}</span>
            </div>
        </div>
    );
}
