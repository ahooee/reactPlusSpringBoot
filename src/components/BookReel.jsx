import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import BookCard from "./BookCard";
import "./BookReel.css";

/**
 * Digikala-style horizontal reel with a physical feel: accent-titled strip
 * of BookCards that can be *dragged* (mouse/pen — touch keeps native
 * scrolling) and behaves like a real object once released:
 *
 *   • rubbery follow while dragging,
 *   • inertia + friction glide after release, with a soft bounce at the
 *     edges,
 *   • gentle magnetic settle onto a card,
 *   • a low-amplitude wave travelling through the cards while the strip
 *     moves (velocity-driven; everything rests flat when idle).
 *
 * All motion runs in one rAF loop per reel and writes transforms/scroll
 * directly to the DOM — no React re-render per frame. Arrows inject an
 * impulse instead of an instant jump. The reel self-hides when empty.
 */
const FRICTION = 0.92;       // per-frame velocity multiplier while coasting
const FOLLOW = 0.3;          // rubbery lerp toward the pointer while dragging
const BOUNCE = 0.35;         // edge restitution
const SETTLE = 0.16;         // magnetic pull to the nearest card when idle
const MAX_VEL = 130;         // drag throw cap (px/frame)
const IMPULSE = 46;          // arrow "push" (px/frame)
const DRAG_PX = 6;           // movement threshold before a scrub counts

export default function BookReel({ title, icon, items }) {
    const { t, lang } = useLanguage();
    const trackRef = useRef(null);
    const dragRef = useRef({ suppressClick: false });
    const [edge, setEdge] = useState({ start: true, end: false });

    const motion = useRef({
        raf: 0, rtl: false, pitch: 176,
        d: 0, vel: 0, prevD: 0, dragTarget: 0,
        dragging: false, samples: [],
        cards: [], energy: 0,
    });

    function measure() {
        const el = trackRef.current;
        const m = motion.current;
        if (!el || !el.children.length) return;
        m.rtl = getComputedStyle(el).direction === "rtl";
        m.cards = Array.from(el.children);
        if (m.cards.length > 1) {
            m.pitch = Math.abs(m.cards[1].offsetLeft - m.cards[0].offsetLeft) || m.pitch;
        }
    }

    useEffect(() => {
        measure();
        motion.current.d = trackRef.current?.scrollLeft ?? 0;
        motion.current.vel = 0;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    useEffect(() => () => {
        if (motion.current.raf) cancelAnimationFrame(motion.current.raf);
    }, []);

    function updateEdges() {
        const el = trackRef.current;
        if (!el) return;
        const max = Math.max(1, el.scrollWidth - el.clientWidth);
        const d = motion.current.rtl ? -el.scrollLeft : el.scrollLeft;
        setEdge({ start: d <= 1, end: d >= max - 1 });
    }

    function wake() {
        const m = motion.current;
        if (!m.raf) m.raf = requestAnimationFrame(tick);
    }

    function tick() {
        const m = motion.current;
        const el = trackRef.current;
        if (!el) { m.raf = 0; return; }

        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        m.prevD = m.d;

        if (m.dragging) {
            // rubbery follow toward the pointer
            m.d += (m.dragTarget - m.d) * FOLLOW;
        } else {
            // inertia coast
            m.d += m.vel;
            m.vel *= FRICTION;
        }

        // boundary bounce — a physical restraint, not a hard clamp
        if (m.d < 0) { m.d = 0; m.vel = -m.vel * BOUNCE; }
        else if (m.d > max) { m.d = max; m.vel = -m.vel * BOUNCE; }

        // magnetic settle onto the nearest card once everything calms down
        let settleTarget = null;
        if (!m.dragging && Math.abs(m.vel) < 0.3) {
            settleTarget = Math.min(max, Math.max(0, Math.round(m.d / m.pitch) * m.pitch));
        }
        if (settleTarget !== null) {
            m.d += (settleTarget - m.d) * SETTLE;
            if (Math.abs(settleTarget - m.d) < 0.8) m.d = settleTarget;
        }
        m.d = Math.max(0, Math.min(m.d, max));

        // wave: amplitude tracks how fast the strip actually moves
        const speed = Math.abs(m.d - m.prevD);
        m.energy += ((speed > 0.9 ? 1 : 0) - m.energy) * 0.12;
        if (m.energy < 0.02) {
            for (const card of m.cards) card.style.transform = "";
        } else {
            const offset = m.d / m.pitch;
            m.cards.forEach((card, i) => {
                const phase = (i - offset) * 0.9;
                const y = Math.sin(phase) * 11 * m.energy;
                const rot = Math.cos(phase) * 2.4 * m.energy;
                card.style.transform = `translateY(${y.toFixed(2)}px) rotateZ(${rot.toFixed(2)}deg)`;
            });
        }

        el.scrollLeft = m.rtl ? -m.d : m.d;

        const active =
            m.dragging ||
            Math.abs(m.vel) > 0.25 ||
            (settleTarget !== null && settleTarget !== m.d) ||
            m.energy > 0.02;

        if (active) {
            m.raf = requestAnimationFrame(tick);
        } else {
            m.raf = 0;
            updateEdges();
        }
    }

    function slide(dir) {
        const m = motion.current;
        // always advance/back in card-flow space (d domain)
        m.vel = dir * IMPULSE;
        m.dragging = false;
        m.d = trackRef.current ? (m.rtl ? -trackRef.current.scrollLeft : trackRef.current.scrollLeft) : m.d;
        wake();
    }

    function onPointerDown(e) {
        if (e.pointerType === "touch" || e.button !== 0) return;
        const m = motion.current;
        const el = trackRef.current;
        measure();
        m.dragging = true;
        m.samples = [];
        m.d = m.rtl ? -el.scrollLeft : el.scrollLeft;
        m.dragTarget = m.d; // a press-and-hold must not chase a stale target
        m.vel = 0;
        const startX = e.clientX;
        const d0 = m.d;

        const onMove = ev => {
            const dx = ev.clientX - startX;
            if (!m.samples.length || Math.abs(dx) > 0) {
                m.samples.push({ dx, t: performance.now() });
                if (m.samples.length > 8) m.samples.shift();
            }
            if (!m.dragging && Math.abs(dx) > DRAG_PX) m.dragging = true;
            if (m.dragging) {
                ev.preventDefault();
                m.dragTarget = d0 - dx * (m.rtl ? -1 : 1);
                wake();
            }
        };

        const finish = () => {
            document.removeEventListener("pointermove", onMove, true);
            document.removeEventListener("pointerup", finish, true);
            document.removeEventListener("pointercancel", finish, true);
            if (m.dragging && m.samples.length > 1) {
                const first = m.samples[0];
                const last = m.samples[m.samples.length - 1];
                const dt = Math.max(16, last.t - first.t);
                // velocity over the recent window, scaled to px/frame
                m.vel = Math.max(-MAX_VEL, Math.min(MAX_VEL, ((last.dx - first.dx) / dt) * 16));
            }
            m.dragging = false;
            dragRef.current = { suppressClick: m.samples.some(s => Math.abs(s.dx) > DRAG_PX) };
            wake();
        };

        dragRef.current = { suppressClick: false };
        document.addEventListener("pointermove", onMove, true);
        document.addEventListener("pointerup", finish, true);
        document.addEventListener("pointercancel", finish, true);
    }

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
                    className="reel-track reel-track-physics"
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
