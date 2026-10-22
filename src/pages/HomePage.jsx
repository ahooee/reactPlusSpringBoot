import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BookCard from "../components/BookCard";
import BookReel from "../components/BookReel";
import ProductRail from "../components/ProductRail";
import Reveal from "../components/Reveal";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import "./HomePage.css";
import "./Shop.css";

function stripHtml(s = "") {
    return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const HERO_INTERVAL = 6000;

function HomeHero({ settings, siteName, latestPost }) {
    const { t } = useLanguage();
    const [slide, setSlide] = useState(0);
    const timer = useRef(null);

    const slides = [
        {
            eyebrow: siteName,
            title: settings.heroTitle || t("home.heroTitle"),
            sub: settings.heroSubtitle || settings.siteTagline || t("home.heroSubtitle"),
            cta: settings.heroButtonText || t("home.shopNow"),
            to: settings.heroButtonUrl || "/shop",
            theme: "amz-hero-a",
        },
    ];

    if (latestPost) {
        slides.push({
            eyebrow: t("home.latestPosts"),
            title: latestPost.title,
            sub: latestPost.excerpt || stripHtml(latestPost.content || "").slice(0, 120),
            cta: t("home.readBlog"),
            to: `/blog/${encodeURIComponent(latestPost.slug)}`,
            theme: "amz-hero-b",
        });
    }

    useEffect(() => {
        if (slides.length < 2) return;
        timer.current = setInterval(() => setSlide(s => (s + 1) % slides.length), HERO_INTERVAL);
        return () => clearInterval(timer.current);
    }, [slides.length]);

    function go(i) {
        setSlide((i + slides.length) % slides.length);
        if (timer.current) {
            clearInterval(timer.current);
            timer.current = setInterval(() => setSlide(s => (s + 1) % slides.length), HERO_INTERVAL);
        }
    }

    const s = slides[Math.min(slide, slides.length - 1)];

    return (
        <section className={`amz-hero ${s.theme}`}>
            {slides.length > 1 && (
                <button className="amz-hero-arrow prev" onClick={() => go(slide - 1)} aria-label="‹">‹</button>
            )}
            <div className="amz-hero-inner" key={slide}>
                <span className="amz-eyebrow">{s.eyebrow}</span>
                <h1>{s.title}</h1>
                <p>{s.sub}</p>
                <Link className="amz-hero-cta" to={s.to}>{s.cta}</Link>
            </div>
            {slides.length > 1 && (
                <button className="amz-hero-arrow next" onClick={() => go(slide + 1)} aria-label="›">›</button>
            )}
            {slides.length > 1 && (
                <div className="amz-dots">
                    {slides.map((_, i) => (
                        <button key={i} className={i === slide ? "on" : ""} onClick={() => go(i)} aria-label={`slide ${i + 1}`} />
                    ))}
                </div>
            )}
        </section>
    );
}

function Shelf({ title, to, children }) {
    const track = useRef(null);
    const { t, lang } = useLanguage();

    function scroll(dir) {
        const el = track.current;
        if (!el) return;
        const rtl = lang === "fa" ? -1 : 1;
        el.scrollBy({ left: dir * rtl * Math.min(el.clientWidth * 0.9, 640), behavior: "smooth" });
    }

    return (
        <section className="section shelf-section">
            <Reveal>
                <div className="section-head">
                    <h2>{title}</h2>
                    <div className="shelf-nav">
                        {to && <Link to={to}>{t("home.viewAll")}</Link>}
                        <button onClick={() => scroll(-1)} aria-label="‹">‹</button>
                        <button onClick={() => scroll(1)} aria-label="›">›</button>
                    </div>
                </div>
            </Reveal>
            <div className="shelf-track" ref={track}>
                {children}
            </div>
        </section>
    );
}

export default function HomePage() {
    const [settings, setSettings] = useState({});
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [posts, setPosts] = useState([]);
    const [reels, setReels] = useState(null);
    const [heroQuery, setHeroQuery] = useState("");
    const { t, lang } = useLanguage();
    const navigate = useNavigate();
    usePageTitle();

    useEffect(() => {
        apiFetch("/api/settings").then(setSettings).catch(() => {});
        apiFetch("/api/books").then(data => setBooks(Array.isArray(data) ? data : [])).catch(() => {});
        apiFetch("/api/books/categories").then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => {});
        apiFetch("/api/books/reels").then(data => setReels(data || null)).catch(() => {});
        apiFetch("/api/posts").then(setPosts).catch(() => {});
    }, []);

    function search(e) {
        e.preventDefault();
        const q = heroQuery.trim();
        navigate(q ? `/books?q=${encodeURIComponent(q)}` : "/books");
    }

    const catLabel = c => (lang === "fa" ? (c.nameFa || c.name) : (c.name || c.nameFa));
    const newArrivals = books.slice(0, 8);
    const siteName = lang === "fa"
        ? (settings.siteNameFa || settings.siteName || "My Store")
        : (settings.siteName || settings.siteNameFa || "My Store");

    return (
        <>
            <Navbar />
            <main>
                <HomeHero
                    settings={settings}
                    siteName={siteName}
                    latestPost={posts[0] || null}
                />

                <div className="hero-search-band">
                    <form className="hero-search" onSubmit={search} role="search">
                        <input
                            value={heroQuery}
                            onChange={e => setHeroQuery(e.target.value)}
                            placeholder={t("home.searchPlaceholder")}
                            aria-label={t("home.search")}
                        />
                        <button className="btn" type="submit">{t("home.search")}</button>
                    </form>
                </div>

                {reels && (
                    <section className="section home-reels">
                        <BookReel title={t("books.reelFeatured")} icon="🌟" items={reels.featured} />
                        <BookReel title={t("books.reelRecommended")} icon="✨" items={reels.recommended} />
                        <BookReel title={t("books.reelTopSellers")} icon="🔥" items={reels.topSellers} />
                    </section>
                )}

                {categories.length > 0 && (
                    <section className="section">
                        <Reveal>
                            <div className="section-head">
                                <h2>{t("home.shopByCategory")}</h2>
                                <Link to="/books">{t("home.viewAll")}</Link>
                            </div>
                        </Reveal>
                        <div className="cat-strip">
                            {categories.map((c, i) => (
                                <Reveal key={c.slug} delay={(i % 4) * 60}>
                                    <Link
                                        to={`/books?category=${encodeURIComponent(c.slug)}`}
                                        className="cat-card"
                                    >
                                        <b>{catLabel(c)}</b>
                                        <span className="muted">{t("books.count", { n: c.count })}</span>
                                    </Link>
                                </Reveal>
                            ))}
                        </div>
                    </section>
                )}

                {newArrivals.length > 0 && (
                    <Shelf title={t("books.titleAll")} to="/books">
                        {newArrivals.map(b => <BookCard key={b.id} book={b} />)}
                    </Shelf>
                )}

                <section className="section">
                    <Reveal>
                        <div className="section-head">
                            <h2>{t("home.latestPosts")}</h2>
                            <Link to="/blog">{t("home.viewAll")}</Link>
                        </div>
                    </Reveal>
                    <div className="grid-3">
                        {posts.slice(0, 3).map((p, i) => (
                            <Reveal key={p.id} delay={i * 80}>
                                <Link to={`/blog/${encodeURIComponent(p.slug)}`} className="card">
                                    <div className="card-body">
                                        <h3>{p.title}</h3>
                                        <p className="muted">{p.excerpt || stripHtml(p.content).slice(0, 120)}</p>
                                    </div>
                                </Link>
                            </Reveal>
                        ))}
                        {posts.length === 0 && <p className="muted">{t("home.noPosts")}</p>}
                    </div>
                </section>

                <section className="cta-band">
                    <Reveal>
                        <h2>{siteName}</h2>
                        <p>{settings.siteTagline || t("home.aboutFallback")}</p>
                        <Link className="btn" to="/signup">{t("home.getStarted")}</Link>
                    </Reveal>
                </section>
            </main>
            <ProductRail />
        </>
    );
}
