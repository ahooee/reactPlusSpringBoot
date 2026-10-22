import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import ProductRail from "../components/ProductRail";
import Reveal from "../components/Reveal";
import { apiFetch, postThumb } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./Blog.css";

function stripHtml(s = "") {
    return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Cover image if set, otherwise the first image embedded in the post content.
function postImage(p) {
    return postThumb(p);
}

function readMinutes(post) {
    const words = stripHtml(`${post.title || ""} ${post.excerpt || ""} ${post.content || ""}`)
        .split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

function fmtDate(iso, lang) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US");
    } catch {
        return "";
    }
}

function Meta({ post, t, lang, light = false }) {
    return (
        <div className={`mag-meta${light ? " light" : ""}`}>
            <span className="mag-author">
                <span className="mag-avatar">{String(post.authorUsername || "A").trim().charAt(0).toUpperCase()}</span>
                {post.authorUsername || "admin"}
            </span>
            <span className="mag-dot">•</span>
            <span>{fmtDate(post.createdAt, lang)}</span>
            <span className="mag-dot">•</span>
            <span>{t("blog.readTime", { n: readMinutes(post) })}</span>
        </div>
    );
}

export default function Blog() {
    const [posts, setPosts] = useState([]);
    const [pickIds, setPickIds] = useState([]);
    const [state, setState] = useState("loading");
    const [query, setQuery] = useState("");
    const { t, lang } = useLanguage();
    usePageTitle(t("blog.title"));
    const track = useRef(null);

    useEffect(() => {
        apiFetch("/api/posts")
            .then(data => { setPosts(Array.isArray(data) ? data : []); setState("done"); })
            .catch(() => setState("error"));
        apiFetch("/api/settings")
            .then(s => {
                try {
                    const parsed = JSON.parse(s?.postRailIds || "[]");
                    if (Array.isArray(parsed)) setPickIds(parsed.filter(n => typeof n === "number"));
                } catch {
                    // ignore
                }
            })
            .catch(() => {});
    }, []);

    function scrollPicks(dir) {
        const el = track.current;
        if (!el) return;
        const rtl = lang === "fa" ? -1 : 1;
        el.scrollBy({ left: dir * rtl * Math.min(el.clientWidth * 0.9, 640), behavior: "smooth" });
    }

    const q = query.trim().toLowerCase();
    const searching = q.length > 0;
    const results = searching
        ? posts.filter(p => `${p.title || ""} ${p.excerpt || ""} ${stripHtml(p.content || "")}`.toLowerCase().includes(q))
        : posts;

    const [featured, ...rest] = results;
    const side = rest.slice(0, 2);
    const grid = searching ? results : rest.slice(2);
    const byId = new Map(posts.map(p => [p.id, p]));
    const picks = pickIds.map(id => byId.get(id)).filter(Boolean);

    return (
        <>
            <Navbar />
            <main className="mag-main">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("blog.title") }]} />
                <div className="mag-band">
                    <div className="mag-band-inner">
                        <div>
                            <h1 className="mag-title">{t("blog.title")}</h1>
                            <p className="muted">{t("blog.results", { n: posts.length })}</p>
                        </div>
                        <form className="mag-search" role="search" onSubmit={e => e.preventDefault()}>
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={t("blog.search")}
                                aria-label={t("blog.search")}
                            />
                        </form>
                    </div>
                </div>

                {state === "loading" && <p className="page-state">{t("blog.loading")}</p>}
                {state === "error" && <p className="page-state">{t("blog.error")}</p>}

                {state === "done" && results.length === 0 && (
                    <p className="page-state muted">{t("blog.empty")}</p>
                )}

                {state === "done" && featured && !searching && (
                    <section className="mag-hero">
                        <Reveal>
                            <Link to={`/blog/${encodeURIComponent(featured.slug)}`} className="mag-featured">
                                {postImage(featured) ? (
                                    <img src={postImage(featured)} alt={featured.title} draggable={false} />
                                ) : (
                                    <div className="mag-featured-ph">✎</div>
                                )}
                                <span className="mag-tag">{t("blog.featured")}</span>
                                <div className="mag-featured-body">
                                    <h2>{featured.title}</h2>
                                    {(featured.excerpt || stripHtml(featured.content || "")) && (
                                        <p>{featured.excerpt || stripHtml(featured.content || "").slice(0, 140)}</p>
                                    )}
                                    <Meta post={featured} t={t} lang={lang} light />
                                </div>
                            </Link>
                        </Reveal>
                        <div className="mag-side">
                            {side.map((p, i) => (
                                <Reveal key={p.id} delay={i * 80}>
                                    <Link to={`/blog/${encodeURIComponent(p.slug)}`} className="mag-side-card">
                                        {postImage(p) ? (
                                            <img src={postImage(p)} alt={p.title} loading="lazy" draggable={false} />
                                        ) : (
                                            <div className="mag-side-ph">✎</div>
                                        )}
                                        <div className="mag-side-body">
                                            <h3>{p.title}</h3>
                                            <Meta post={p} t={t} lang={lang} />
                                        </div>
                                    </Link>
                                </Reveal>
                            ))}
                        </div>
                    </section>
                )}

                {state === "done" && !searching && picks.length > 0 && (
                    <section className="mag-section mag-picks">
                        <Reveal>
                            <div className="section-head">
                                <h2>{t("blog.picks")}</h2>
                                <div className="shelf-nav">
                                    <button onClick={() => scrollPicks(-1)} aria-label="‹">‹</button>
                                    <button onClick={() => scrollPicks(1)} aria-label="›">›</button>
                                </div>
                            </div>
                        </Reveal>
                        <div className="mag-picks-track" ref={track}>
                            {picks.map(p => (
                                <Link key={p.id} to={`/blog/${encodeURIComponent(p.slug)}`} className="mag-card mag-pick-card">
                                    {postImage(p) ? (
                                        <img className="mag-card-img" src={postImage(p)} alt={p.title} loading="lazy" draggable={false} />
                                    ) : (
                                        <div className="mag-card-ph">✎</div>
                                    )}
                                    <div className="mag-card-body">
                                        <h3>{p.title}</h3>
                                        <Meta post={p} t={t} lang={lang} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {state === "done" && grid.length > 0 && (
                    <section className="mag-section">
                        <Reveal>
                            <div className="section-head">
                                <h2>{searching ? t("blog.results", { n: results.length }) : t("blog.latest")}</h2>
                            </div>
                        </Reveal>
                        <div className="mag-grid">
                            {grid.map((p, i) => (
                                <Reveal key={p.id} delay={(i % 3) * 70}>
                                    <Link to={`/blog/${encodeURIComponent(p.slug)}`} className="mag-card">
                                        {postImage(p) ? (
                                            <img className="mag-card-img" src={postImage(p)} alt={p.title} loading="lazy" draggable={false} />
                                        ) : (
                                            <div className="mag-card-ph">✎</div>
                                        )}
                                        <div className="mag-card-body">
                                            <h3>{p.title}</h3>
                                            <p className="muted mag-excerpt">
                                                {p.excerpt || stripHtml(p.content || "").slice(0, 120)}
                                            </p>
                                            <Meta post={p} t={t} lang={lang} />
                                        </div>
                                    </Link>
                                </Reveal>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <ProductRail />
        </>
    );
}
