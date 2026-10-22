import { useRef } from "react";
import { Link } from "react-router-dom";
import { imageSrc } from "../lib/api";
import { money } from "../lib/price";
import { useLanguage } from "../context/LanguageContext";
import Reveal from "./Reveal";
import "./ProductCarousel.css";

export default function ProductCarousel({ title, products = [] }) {
    const trackRef = useRef(null);
    const { t, lang } = useLanguage();
    const heading = title || t("home.featured");

    function scrollByAmount(dir) {
        const el = trackRef.current;
        if (!el) return;
        const rtl = lang === "fa" ? -1 : 1;
        el.scrollBy({ left: dir * rtl * (el.clientWidth * 0.8), behavior: "smooth" });
    }

    if (!products.length) return null;

    return (
        <section className="carousel-section">
            <Reveal>
                <div className="carousel-head">
                    <h2>{heading}</h2>
                    <div className="carousel-actions">
                        <button onClick={() => scrollByAmount(-1)} aria-label={t("carousel.scroll")}>←</button>
                        <button onClick={() => scrollByAmount(1)} aria-label={t("carousel.scroll")}>→</button>
                        <Link to="/shop" className="carousel-all">{t("carousel.viewAll")}</Link>
                    </div>
                </div>
            </Reveal>
            <div className="carousel-track" ref={trackRef}>
                {products.map((p, i) => (
                    <Reveal key={p.id ?? p.slug ?? i} delay={(i % 4) * 60}>
                        <Link to={`/shop/${encodeURIComponent(p.slug)}`} className="carousel-card">
                            {p.imageUrl ? (
                                <img src={imageSrc(p.imageUrl)} alt={p.name} loading="lazy" />
                            ) : (
                                <div className="carousel-placeholder">{t("carousel.noImage")}</div>
                            )}
                            <div className="carousel-card-body">
                                <h3>{p.name}</h3>
                                <p className="price">{money(p.price, lang)}</p>
                            </div>
                        </Link>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
