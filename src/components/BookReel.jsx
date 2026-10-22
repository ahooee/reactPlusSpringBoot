import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import BookCard from "./BookCard";
import "./BookReel.css";

/**
 * Digikala-style horizontal reel: accent-titled strip of BookCards with
 * edge chevron arrows. Arrows use logical insets (RTL flips them) and fade
 * out at scroll limits; the reel self-hides when the item list is empty.
 * Shared by the books page and the home page.
 *
 * The strip is also drag-scrollable: holding the left mouse button (or pen)
 * and moving scrubs the track — a drag never turns into a click, while
 * real clicks on cards stay intact. Touch keeps native scrolling.
 */
export default function BookReel({ title, icon, items }) {
    const { t, lang } = useLanguage();
    const trackRef = useRef(null);
    const dragRef = useRef({ suppressClick: false });
    const [edge, setEdge] = useState({ start: true, end: false });

    function updateEdges() {
        const el = trackRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        const pos = Math.abs(el.scrollLeft); // RTL scrollLeft goes negative
        setEdge({ start: pos <= 1, end: pos >= max - 1 });
    }

    useEffect(() => {
        updateEdges();
    }, [items]);

    if (!items || items.length === 0) return null;

    function slide(dir) {
        const el = trackRef.current;
        if (!el) return;
        const rtl = getComputedStyle(el).direction === "rtl";
        const w = el.clientWidth * 0.9;
        el.scrollBy({ left: dir * (rtl ? -w : w), behavior: "smooth" });
    }

    function onPointerDown(e) {
        if (e.pointerType === "touch" || e.button !== 0) return;
        const el = trackRef.current;
        const startX = e.clientX;
        const scrollStart = el.scrollLeft;
        let moved = false;

        const onMove = ev => {
            const dx = ev.clientX - startX;
            if (!moved && Math.abs(dx) > 6) {
                moved = true;
                el.style.scrollSnapType = "none"; // don't fight the scrub
            }
            if (moved) {
                ev.preventDefault();
                // Direction-agnostic: dragging toward the "content side"
                // (left in LTR, right in RTL) advances the track.
                el.scrollLeft = scrollStart - dx;
            }
        };

        const finish = () => {
            dragRef.current = { suppressClick: moved };
            document.removeEventListener("pointermove", onMove, true);
            document.removeEventListener("pointerup", finish, true);
            document.removeEventListener("pointercancel", finish, true);
            el.style.scrollSnapType = "";
        };

        dragRef.current = { suppressClick: false };
        document.addEventListener("pointermove", onMove, true);
        document.addEventListener("pointerup", finish, true);
        document.addEventListener("pointercancel", finish, true);
    }

    // A drag is not a click: swallow card clicks the moment a scrub happened.
    function onClickCapture(e) {
        if (dragRef.current.suppressClick) {
            e.preventDefault();
            e.stopPropagation();
            dragRef.current.suppressClick = false;
        }
    }

    const startGlyph = lang === "fa" ? "›" : "‹";
    const endGlyph = lang === "fa" ? "‹" : "›";

    return (
        <section className="reel">
            <div className="reel-head">
                <h3>
                    <span className="reel-accent" aria-hidden="true" />
                    {icon} {title}
                </h3>
                <span className="reel-hint">{t("books.reelHint")}</span>
            </div>
            <div className="reel-wrap">
                <button
                    className={`reel-arrow reel-arrow-start${edge.start ? " off" : ""}`}
                    onClick={() => slide(-1)}
                    aria-label={t("common.prev")}
                >
                    {startGlyph}
                </button>
                <div
                    className="reel-track"
                    ref={trackRef}
                    onScroll={updateEdges}
                    onPointerDown={onPointerDown}
                    onClickCapture={onClickCapture}
                >
                    {items.map(b => (
                        <div className="reel-card" key={b.id}>
                            <BookCard book={b} grid />
                        </div>
                    ))}
                </div>
                <button
                    className={`reel-arrow reel-arrow-end${edge.end ? " off" : ""}`}
                    onClick={() => slide(1)}
                    aria-label={t("common.next")}
                >
                    {endGlyph}
                </button>
            </div>
        </section>
    );
}
