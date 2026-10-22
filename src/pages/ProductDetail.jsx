import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { apiFetch, imageSrc, viewerToken } from "../lib/api";
import { discountOf, finalPrice, hasDiscount, money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { usePageTitle, siteNameOf } from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useCart, maxFor, isFixedQty, normalizeBookType } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import "./ProductDetail.css";

const VOTE_KEY = "pvotes:v1";

function starRow(n) {
    const full = Math.max(0, Math.min(5, Math.round(n)));
    return "★".repeat(full) + "☆".repeat(5 - full);
}

function loadVotes() {
    try {
        const raw = JSON.parse(localStorage.getItem(VOTE_KEY) || "{}");
        return raw && typeof raw === "object" ? raw : {};
    } catch {
        return {};
    }
}

export default function ProductDetail() {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [error, setError] = useState(null);
    const [qty, setQtyState] = useState(1);
    const [tab, setTab] = useState("desc");
    const [expanded, setExpanded] = useState(false);
    const [votes, setVotes] = useState(loadVotes);
    const [myRating, setMyRating] = useState(5);
    const [myText, setMyText] = useState("");
    const [sending, setSending] = useState(false);
    const { t, lang } = useLanguage();
    const { settings } = useTheme();
    const { user, isAdmin } = useAuth();
    const { add, remove, items, setOpen } = useCart();
    const { showToast } = useToast();
    usePageTitle(product?.name || t("shop.title"));

    useEffect(() => {
        setProduct(null);
        setRelated([]);
        setReviews([]);
        setError(null);
        setTab("desc");
        setExpanded(false);
        setMyText("");
        const headers = {};
        const vt = viewerToken();
        if (vt) headers["X-Viewer-Token"] = vt;
        apiFetch(`/api/products/slug/${encodeURIComponent(slug)}`, { headers })
            .then(p => {
                setProduct(p);
                setQtyState(1);
                loadReviews(p.id);
                try {
                    const raw = JSON.parse(localStorage.getItem("recentSlugs:v1") || "[]");
                    const list = Array.isArray(raw) ? raw.filter(s => s !== p.slug) : [];
                    localStorage.setItem("recentSlugs:v1", JSON.stringify([p.slug, ...list].slice(0, 12)));
                } catch {
                    // ignore
                }
                apiFetch("/api/products").then(all => {
                    const list = Array.isArray(all) ? all : [];
                    const sameCat = list.filter(x => x.slug !== p.slug && p.category && x.category?.id === p.category.id);
                    const rest = list.filter(x => x.slug !== p.slug && !(p.category && x.category?.id === p.category.id));
                    setRelated([...sameCat, ...rest].slice(0, 8));
                }).catch(() => {});
            })
            .catch(e => setError(e.message));
    }, [slug]);

    function loadReviews(productId) {
        apiFetch(`/api/products/${productId}/reviews`)
            .then(data => setReviews(Array.isArray(data) ? data : []))
            .catch(() => {});
    }

    const cap = product ? maxFor(product) : 0;
    const fixed = product ? isFixedQty(product) : false;
    const inStock = cap > 0;
    const avg = reviews.length ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length : 0;
    const longDesc = (product?.description || "").length > 350;
    const myVotes = product ? (votes[product.id] || []) : [];
    const lowStock = inStock && product && product.stock <= 5;
    const inCartQty = product ? items.find(i => i.id === product.id)?.qty || 0 : 0;

    // Rating distribution for the review summary panel (5→1).
    const dist = [5, 4, 3, 2, 1].map(n => {
        const c = reviews.filter(r => Number(r.rating) === n).length;
        return { n, count: c, pct: reviews.length ? Math.round((c * 100) / reviews.length) : 0 };
    });

    const sellerName = siteNameOf(settings, lang);

    // Trust strip under the hero card (like the reference bookstore).
    const feat = [
        ["🚚", t("pd.f1")],
        ["🛡", t("pd.f2")],
        ["💰", t("pd.f3")],
        ["🎧", t("pd.f4")],
    ];

    // Quick attributes shown as icon chips in the info column.
    const quickAttrs = product ? [
        product.bookSize && ["📐", t("product.size"), product.bookSize],
        product.coverType && ["📗", t("product.cover"), product.coverType],
        product.pageCount != null && ["📄", t("product.pageCount"), `${product.pageCount} ${t("product.pagesUnit")}`],
        product.publishYear && ["🗓", t("product.year"), product.publishYear],
        product.language && ["🌐", t("product.language"), product.language],
        product.edition != null && ["🔁", t("product.edition"), product.edition],
    ].filter(Boolean) : [];

    function handleAdd() {
        if (!product) return;
        if (inCartQty >= cap) {
            showToast(t("shop.limitToast", { n: cap }));
            return;
        }
        const result = add(product, fixed ? 1 : qty);
        if (result > 0) {
            setOpen(true);
        }
    }

    function handleRemove() {
        if (!product) return;
        remove(product.id);
    }

    // "Dislike" (down) contradicts every positive signal; voting one side
    // automatically clears the other so counts stay logically consistent.
    const POSITIVE_VOTES = ["like", "want", "up"];

    async function toggleVote(kind) {
        if (!product) return;
        const has = myVotes.includes(kind);
        const conflicts = has
            ? []
            : kind === "down"
                ? POSITIVE_VOTES.filter(k => myVotes.includes(k))
                : myVotes.includes("down") ? ["down"] : [];
        try {
            let updated = null;
            for (const extra of conflicts) {
                updated = await apiFetch(`/api/products/${product.id}/reactions`, {
                    method: "POST",
                    body: JSON.stringify({ action: `un${extra}` }),
                });
            }
            updated = await apiFetch(`/api/products/${product.id}/reactions`, {
                method: "POST",
                body: JSON.stringify({ action: has ? `un${kind}` : kind }),
            });
            setProduct(updated);
            setVotes(prev => {
                const cur = prev[product.id] || [];
                let next = cur.filter(k => k !== kind && !conflicts.includes(k));
                if (!has) next = [...next, kind];
                const all = { ...prev, [product.id]: next };
                try {
                    localStorage.setItem(VOTE_KEY, JSON.stringify(all));
                } catch {
                    // ignore
                }
                return all;
            });
        } catch (err) {
            alert(err.message);
        }
    }

    function share() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: product?.name || "", url }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).catch(() => {});
        }
    }

    function goExcerpt() {
        setTab("desc");
        setExpanded(true);
        requestAnimationFrame(() => {
            document.getElementById("book-tabs")?.scrollIntoView({ behavior: "smooth" });
        });
    }

    async function submitReview(e) {
        e.preventDefault();
        if (!product || sending) return;
        setSending(true);
        try {
            await apiFetch(`/api/products/${product.id}/reviews`, {
                method: "POST",
                body: JSON.stringify({ rating: myRating, text: myText }),
            });
            setMyText("");
            setMyRating(5);
            loadReviews(product.id);
        } catch (err) {
            alert(err.message);
        } finally {
            setSending(false);
        }
    }

    async function deleteReview(id) {
        if (!window.confirm(t("common.delete"))) return;
        try {
            await apiFetch(`/api/reviews/${id}`, { method: "DELETE" });
            if (product) loadReviews(product.id);
        } catch (err) {
            alert(err.message);
        }
    }

    const catLabel = product?.category
        ? (lang === "fa" ? (product.category.nameFa || product.category.name) : (product.category.name || product.category.nameFa))
        : "";

    const stats = product ? [
        ["👁", t("product.views"), product.viewCount ?? 0],
        ["♥", t("product.likes"), product.likeCount ?? 0],
        ["📖", t("product.want"), product.wantCount ?? 0],
        ["👍", t("product.recommendUp"), product.recommendUp ?? 0],
        ["👎", t("product.recommendDown"), product.recommendDown ?? 0],
    ] : [];

    const voteBtns = [
        ["like", "♥"],
        ["want", "📖"],
        ["up", "👍"],
        ["down", "👎"],
    ];

    const specs = product ? [
        [t("product.type"), t("product.book")],
        [t("products.bookType"), product.bookType === "PAPER" ? t("products.bookTypePaper") : t("products.bookTypePdf")],
        product.category && [t("products.category"), catLabel],
        product.author && [t("product.author"), product.author],
        product.translator && [t("product.translator"), product.translator],
        product.publisher && [t("product.publisher"), product.publisher],
        product.isbn && [t("product.isbn"), product.isbn],
        product.language && [t("product.language"), product.language],
        product.coverType && [t("product.cover"), product.coverType],
        product.bookSize && [t("product.size"), product.bookSize],
        product.pageCount != null && [t("product.pageCount"), `${product.pageCount} ${t("product.pagesUnit")}`],
        product.edition != null && [t("product.edition"), product.edition],
        product.weightGrams != null && [t("product.weight"), `${product.weightGrams} ${t("product.grams")}`],
        product.publishYear && [t("product.year"), product.publishYear],
        [t("product.stock"), `${product.stock}`],
    ].filter(Boolean) : [];

    function Credit({ label, value, children }) {
        if (!value && !children) return null;
        return (
            <div className="book-credit">
                <span className="muted lbl">{label}:</span>
                <span className="avatar">{String(value || children || "?").trim().charAt(0)}</span>
                <span className="credit-name">{children || value}</span>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="page-wrap book-page">
                {error && <p>Error: {error}</p>}
                {!error && !product && <p>{t("product.loading")}</p>}
                {product && (
                    <>
                        <Breadcrumbs items={[
                            { to: "/", label: t("nav.home") },
                            { to: "/shop", label: t("nav.shop") },
                            { to: "/books", label: t("books.titleAll") },
                            ...(normalizeBookType(product.bookType) === "PAPER"
                                ? [{ to: "/books/paper-books", label: t("books.titlePaper"), soon: true }]
                                : [{ to: "/books/ebooks", label: t("books.titleEbooks") }]),
                            { label: product.name },
                        ]} />

                        <div className="book-hero">
                            {/* Cover column (inline-start) */}
                            <div className="book-cover-col">
                                <div className="cover-tools">
                                    <button className="tool-btn" onClick={share} title={t("product.share")}>⤴</button>
                                    <a className="tool-btn" href="#reviews" title={t("product.comments")}>💬</a>
                                </div>
                                <div className="book-cover">
                                    {product.imageUrl ? (
                                        <img className="book-img" src={imageSrc(product.imageUrl)} alt={product.name} />
                                    ) : (
                                        <div className="book-noimg">📚</div>
                                    )}
                                    {!inStock && <span className="book-badge soldout">{t("shop.outOfStock")}</span>}
                                </div>
                                <button className="excerpt-btn" onClick={goExcerpt}>📄 {t("product.excerpt")}</button>
                            </div>

                            {/* Info column */}
                            <div className="book-info">
                                <span className={`book-typechip${normalizeBookType(product.bookType) === "PAPER" ? " paper" : ""}`}>
                                    {normalizeBookType(product.bookType) === "PAPER"
                                        ? `📕 ${t("products.bookTypePaper")}`
                                        : `📄 ${t("products.bookTypePdf")}`}
                                </span>
                                <h1 className="book-title">{product.name}</h1>

                                <div className="book-rating">
                                    <span className="stars" title={`${avg.toFixed(1)} / 5`}>{starRow(avg)}</span>
                                    <b>{avg.toFixed(1)}</b>
                                    <span className="muted">{t("pd.outOf5")}</span>
                                    <a href="#reviews" className="muted">({reviews.length} {t("product.reviews")})</a>
                                </div>

                                <div className="book-credits">
                                    <Credit label={t("product.author")} value={product.author} />
                                    <Credit label={t("product.translator")} value={product.translator} />
                                    {product.publisher && (
                                        <div className="book-credit">
                                            <span className="muted lbl">{t("product.publisher")}:</span>
                                            <span className="avatar">◈</span>
                                            <span className="credit-name">{product.publisher}</span>
                                        </div>
                                    )}
                                    {product.category && (
                                        <div className="book-credit">
                                            <span className="muted lbl">{t("products.category")}:</span>
                                            <span className="credit-name">
                                                <Link to={`/shop?category=${product.category.slug}`}>{catLabel}</Link>
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

                            {/* Buy card (inline-end, like the reference's price card) */}
                            <aside className="book-side">
                                <ul className="book-stats">
                                    {stats.map(([icon, label, value]) => (
                                        <li key={label}>
                                            <span className="stat-icon">{icon}</span>
                                            <span>{label}</span>
                                            <span className="v">{value}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="disc-wrap">
                                    {hasDiscount(product) && (
                                        <>
                                            <span className="disc-badge">٪{discountOf(product)}</span>
                                            <span className="disc-caption">{t("pd.discountCaption")}</span>
                                        </>
                                    )}
                                    {hasDiscount(product) && (
                                        <div className="pay-old-row">
                                            <span className="muted">{t("pd.listPrice")}</span>
                                            <span className="pay-old-val">{money(product.price, lang)}</span>
                                        </div>
                                    )}
                                    <div className="pay-value">{money(finalPrice(product), lang)}</div>
                                </div>

                                <div className={`stock-line${inStock ? "" : " out"}`}>
                                    {inStock
                                        ? <>✓ {t("pd.stockCount", { n: product.stock })}</>
                                        : <span className="amz-stock out">{t("shop.outOfStock")}</span>}
                                </div>

                                <div className="seller-line">
                                    <span>{t("pd.seller")}:</span>
                                    <b>{sellerName}</b>
                                </div>

                                <div className="side-sep" />

                                <div className="book-side-buy">
                                    {inStock ? (
                                        <>
                                            <div className="buy-qty-row">
                                                {fixed ? (
                                                    <span className="muted buy-note">{t("shop.ebookFixed")}</span>
                                                ) : (
                                                    <>
                                                        <span className="muted buy-note">{t("pd.qtyLabel")}:</span>
                                                        <div className="cart-stepper">
                                                            <button onClick={() => setQtyState(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
                                                            <span>{qty}</span>
                                                            <button onClick={() => setQtyState(q => Math.min(cap, q + 1))} disabled={qty >= cap}>+</button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {!fixed && <span className="muted buy-note">{t("shop.limitNote", { n: cap })}</span>}
                                            <button className="btn book-add" onClick={handleAdd}>
                                                {t("shop.addToCart")}
                                            </button>
                                            {inCartQty > 0 && (
                                                <>
                                                    <span className="muted buy-note">{t("shop.inCart")}: {inCartQty}</span>
                                                    <button className="btn book-remove" onClick={handleRemove}>
                                                        {t("cart.remove")}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : inCartQty > 0 ? (
                                        <>
                                            <span className="muted buy-note">{t("shop.inCart")}: {inCartQty}</span>
                                            <button className="btn book-remove" onClick={handleRemove}>
                                                {t("cart.remove")}
                                            </button>
                                        </>
                                    ) : (
                                        <span className="amz-stock out">{t("shop.outOfStock")}</span>
                                    )}
                                </div>

                                <div className="book-vote">
                                    <b>{t("product.ratePrompt")}</b>
                                    <div className="vote-btns">
                                        {voteBtns.map(([kind, icon]) => (
                                            <button
                                                key={kind}
                                                className={`vote-btn${myVotes.includes(kind) ? " on" : ""}`}
                                                onClick={() => toggleVote(kind)}
                                                aria-pressed={myVotes.includes(kind)}
                                                title={t(`product.${kind === "like" ? "likes" : kind === "want" ? "want" : kind === "up" ? "recommendUp" : "recommendDown"}`)}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {product.isbn && (
                                    <p className="muted book-isbn">{t("product.isbn")}: <span dir="ltr">{product.isbn}</span></p>
                                )}
                            </aside>
                        </div>

                        {/* Trust strip (like the reference's service badges) */}
                        <div className="feat-strip">
                            {feat.map(([icon, label]) => (
                                <div className="feat-tile" key={label}>
                                    <span className="feat-ico">{icon}</span>
                                    <b>{label}</b>
                                </div>
                            ))}
                        </div>

                        {lowStock && (
                            <div className="book-note" role="status">
                                <span>ⓘ</span>
                                <span>{t("product.lowStock", { n: product.stock })}</span>
                            </div>
                        )}

                        <div className="book-tabs" id="book-tabs" role="tablist">
                            <button
                                role="tab"
                                aria-selected={tab === "desc"}
                                className={`book-tab${tab === "desc" ? " on" : ""}`}
                                onClick={() => setTab("desc")}
                            >
                                {t("product.descTab")}
                            </button>
                            <button
                                role="tab"
                                aria-selected={tab === "specs"}
                                className={`book-tab${tab === "specs" ? " on" : ""}`}
                                onClick={() => setTab("specs")}
                            >
                                {t("product.detailsTab")}
                            </button>
                        </div>

                        {tab === "desc" ? (
                            <div className="book-desc-wrap">
                                <div className={`prose book-desc${!expanded && longDesc ? " clamp" : ""}`}>
                                    <p style={{ whiteSpace: "pre-wrap" }}>{product.description || "—"}</p>
                                </div>
                                {longDesc && (
                                    <button className="read-more-btn" onClick={() => setExpanded(e => !e)}>
                                        {expanded ? t("product.showLess") : t("product.readMore")}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table className="spec-table">
                                <tbody>
                                    {specs.map(([k, v]) => (
                                        <tr key={k}>
                                            <th>{k}</th>
                                            <td>{v}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <section className="book-reviews" id="reviews">
                            <h2>{t("product.comments")}</h2>
                            <div className="review-grid">
                                <aside className="review-summary">
                                    <div className="rv-avg">{avg.toFixed(1)}</div>
                                    <div className="stars big">{starRow(avg)}</div>
                                    <span className="muted rv-of5">{t("pd.outOf5")}</span>
                                    <b className="rv-count">{reviews.length} {t("product.reviews")}</b>
                                    <div className="rv-bars">
                                        {dist.map(d => (
                                            <div className="bar-row" key={d.n}>
                                                <span className="bar-n">{d.n}</span>
                                                <span className="bar-track"><span className="bar-fill" style={{ width: `${d.pct}%` }} /></span>
                                                <span className="bar-pct">{d.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </aside>
                                <div className="review-list">
                                    {reviews.length === 0 && <p className="muted">{t("product.noReviews")}</p>}
                                    {reviews.map(r => (
                                        <div className="review" key={r.id}>
                                            <div className="review-head">
                                                <span className="review-user">{r.username}</span>
                                                <span className="stars small">{starRow(r.rating)}</span>
                                                <span className="muted review-date">
                                                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en") : ""}
                                                </span>
                                                {isAdmin && (
                                                    <button className="small-btn danger review-del" onClick={() => deleteReview(r.id)}>
                                                        {t("common.delete")}
                                                    </button>
                                                )}
                                            </div>
                                            <p className="review-text">{r.text}</p>
                                        </div>
                                    ))}

                                    {user ? (
                                        <form className="review-form" onSubmit={submitReview}>
                                            <h3>{t("product.yourRating")}</h3>
                                            <div className="rate-input" role="radiogroup" aria-label={t("product.yourRating")}>
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={myRating === n}
                                                        className={n <= myRating ? "lit" : ""}
                                                        onClick={() => setMyRating(n)}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                            <label>{t("product.yourReview")}
                                                <textarea
                                                    value={myText}
                                                    onChange={e => setMyText(e.target.value)}
                                                    required
                                                />
                                            </label>
                                            <div>
                                                <button className="btn" type="submit" disabled={sending}>
                                                    {t("product.submitReview")}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <p className="muted">
                                            <Link to="/login">{t("nav.login")}</Link> · {t("product.loginToReview")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {related.length > 0 && (
                            <section className="book-related">
                                <div className="section-head">
                                    <h2>{t("product.related")}</h2>
                                    {product.category && (
                                        <Link to={`/shop?category=${product.category.slug}`}>{t("home.viewAll")}</Link>
                                    )}
                                </div>
                                <div className="grid-3">
                                    {related.slice(0, 3).map((p, i) => (
                                        <Reveal key={p.id} delay={i * 70}>
                                            <ProductCard product={p} grid />
                                        </Reveal>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
