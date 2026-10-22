import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { apiFetch, imageSrc } from "../lib/api";
import { money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";
import "./BookDetail.css";

/**
 * Detail page for one book from the `books` table (the library catalog).
 * Layout mirrors the reference bookstore: hero card (cover | info | file
 * card), trust strip, description and full specs table.
 */
export default function BookDetail() {
    const { id } = useParams();
    const { t, lang } = useLanguage();
    const { showToast } = useToast();
    const { items, addLibraryBook, remove, setOpen } = useCart();
    const [book, setBook] = useState(null);
    const [state, setState] = useState("loading");
    const [broken, setBroken] = useState(false);
    const [buying, setBuying] = useState(false);

    usePageTitle(book?.title || t("books.book"));

    useEffect(() => {
        let cancelled = false;
        apiFetch(`/api/books/${encodeURIComponent(id)}`)
            .then(data => {
                if (cancelled) return;
                setBook(data);
                setBroken(false);
                setState("done");
            })
            .catch(() => {
                if (!cancelled) setState("error");
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const cover = book?.coverUrl ? imageSrc(book.coverUrl) : "";
    const current = book?.id === id;
    const loading = state === "loading" || (state === "done" && book && !current);

    // This book's cart line, once "add to cart" ran: keyed by the bookId the
    // basket response reports for its auto product (slug book-<id>; the
    // slug check also covers older cached lines).
    const buyLine = book
        ? items.find(i => i.bookId === book.id || i.slug === `book-${book.id}`)
        : null;

    async function handleBuy() {
        if (buying || !book) return;
        setBuying(true);
        try {
            await addLibraryBook(book.id);
            setOpen(true);
        } catch (err) {
            showToast(err?.message || t("books.buyError"));
        } finally {
            setBuying(false);
        }
    }

    function handleRemove() {
        if (!buyLine) return;
        remove(buyLine.id);
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast(t("bd.shared"));
        } catch {
            showToast(t("bd.share"));
        }
    }

    // Quick attributes shown as icon chips in the info column.
    const quickAttrs = book ? [
        book.format && ["📄", t("books.format"), String(book.format).toUpperCase()],
        book.language && ["🌐", t("books.language"), book.language],
        book.pages && ["📑", t("books.pages"), String(book.pages)],
        book.filesize && ["💾", t("books.filesize"), book.filesize],
        book.year && ["🗓", t("books.year"), String(book.year)],
        book.isbn && ["🔎", t("books.isbn"), book.isbn],
    ].filter(Boolean) : [];

    // Full specs table rows (like the reference's "مشخصات فنی" table).
    const specRows = book ? [
        ["✍", t("books.author"), book.author],
        ["◈", t("books.publisher"), book.publisher],
        ["🗂", t("books.category"), book.categories],
        ["🌐", t("books.language"), book.language],
        ["🗓", t("books.year"), book.year],
        ["🔎", t("books.isbn"), book.isbn],
        ["📄", t("books.format"), book.format ? String(book.format).toUpperCase() : ""],
        ["⁝", t("books.pages"), book.pages],
    ].filter(([, , value]) => value !== null && value !== undefined && value !== "") : [];

    // Trust strip under the hero card.
    const feat = [
        ["📄", t("bd.f1")],
        ["🔎", t("bd.f2")],
        ["📱", t("bd.f3")],
        ["🎧", t("pd.f4")],
    ];

    return (
        <>
            <Navbar />
            <main className="amz-main">
                <Breadcrumbs
                    items={[
                        { to: "/", label: t("nav.home") },
                        { to: "/books", label: t("books.titleAll") },
                        { label: book?.title || t("books.book") },
                    ]}
                />

                {loading && <p className="page-state">{t("shop.loading")}</p>}

                {state === "error" && (
                    <div className="page-state">
                        <p>{t("books.notFound")}</p>
                        <Link className="btn" to="/books">{t("books.titleAll")}</Link>
                    </div>
                )}

                {state === "done" && current && book && (
                    <>
                        {/* Hero card: cover | info | file card */}
                        <div className="book-hero">
                            {/* Cover column (inline-start) */}
                            <div className="book-cover-col">
                                <div className="cover-tools">
                                    <button className="tool-btn" onClick={copyLink} title={t("bd.share")}>⤴</button>
                                </div>
                                <div className="book-cover">
                                    {cover && !broken ? (
                                        <img className="book-img" src={cover} alt={book.title} onError={() => setBroken(true)} />
                                    ) : (
                                        <div className="book-noimg">📖</div>
                                    )}
                                </div>
                            </div>

                            {/* Info column */}
                            <div className="book-info">
                                <h1 className="book-title">{book.title}</h1>

                                <div className="book-credits">
                                    {book.author && (
                                        <div className="book-credit">
                                            <span className="muted lbl">{t("books.author")}:</span>
                                            <span className="avatar">✍</span>
                                            <span className="credit-name">{book.author}</span>
                                        </div>
                                    )}
                                    {book.publisher && (
                                        <div className="book-credit">
                                            <span className="muted lbl">{t("books.publisher")}:</span>
                                            <span className="avatar">◈</span>
                                            <span className="credit-name">{book.publisher}</span>
                                        </div>
                                    )}
                                    {book.categorySlug && (
                                        <div className="book-credit">
                                            <span className="muted lbl">{t("books.category")}:</span>
                                            <span className="credit-name">
                                                <Link to={`/books?category=${book.categorySlug}`}>
                                                    {book.category || book.categories}
                                                </Link>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {quickAttrs.length > 0 && (
                                    <div className="attr-grid">
                                        {quickAttrs.map(([icon, k, v]) => (
                                            <div className="attr-chip" key={k}>
                                                <span className="attr-ico">{icon}</span>
                                                <span className="attr-txt">
                                                    <span className="attr-k">{k}</span>
                                                    <span className="attr-v">{v}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* File card (inline-end, the reference's offer card) */}
                            <aside className="book-side">
                                <span className="book-typechip">📄 {t("products.bookTypePdf")}</span>

                                <div className="file-box">
                                    <span className="file-ico">📕</span>
                                    <b>{book.format ? String(book.format).toUpperCase() : "PDF"}</b>
                                    {book.filesize && <span className="muted">{book.filesize}</span>}
                                </div>

                                <p className="bd-note">{t("bd.ebookNote")}</p>

                                {book.price != null && book.price > 0 && (
                                    <div className="bd-price">{money(book.price, lang)}</div>
                                )}

                                <div className="bd-buyblock">
                                    <button
                                        className="btn bd-buy"
                                        onClick={handleBuy}
                                        disabled={buying}
                                    >
                                        {buying ? t("shop.loading") : t("shop.addToCart")}
                                    </button>
                                    {buyLine && (
                                        <>
                                            <span className="muted buy-note">
                                                {t("shop.inCart")}: {buyLine.qty}
                                            </span>
                                            <button className="btn bd-remove" onClick={handleRemove}>
                                                {t("cart.remove")}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </aside>
                        </div>

                        {/* Trust strip */}
                        <div className="feat-strip">
                            {feat.map(([icon, label]) => (
                                <div className="feat-tile" key={label}>
                                    <span className="feat-ico">{icon}</span>
                                    <b>{label}</b>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        {book.description && (
                            <section className="bd-section">
                                <h2>📖 {t("books.description")}</h2>
                                <p className="bd-desc">{book.description}</p>
                            </section>
                        )}

                        {/* Full specs table */}
                        {specRows.length > 0 && (
                            <section className="bd-section">
                                <h2>🧾 {t("product.detailsTab")}</h2>
                                <table className="spec-table">
                                    <tbody>
                                        {specRows.map(([icon, label, value]) => (
                                            <tr key={label}>
                                                <th><span className="spec-ico">{icon}</span>{label}</th>
                                                <td>{value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}
                    </>
                )}
            </main>
        </>
    );
}

