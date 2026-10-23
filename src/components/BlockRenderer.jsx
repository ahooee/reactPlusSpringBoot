import { API_URL, imageSrc } from "../lib/api";
import "./BlockRenderer.css";

export default function BlockRenderer({ block, t }) {
    if (!block || !block.type) return null;

    switch (block.type) {
        case "richtext":
            return <RichTextRenderer block={block} />;
        case "hero":
            return <HeroRenderer block={block} />;
        case "features":
            return <FeaturesRenderer block={block} />;
        case "stats":
            return <StatsRenderer block={block} />;
        case "timeline":
            return <TimelineRenderer block={block} />;
        case "media":
            return <MediaRenderer block={block} />;
        case "cta":
            return <CTARenderer block={block} />;
        case "quote":
            return <QuoteRenderer block={block} />;
        case "columns":
            return <ColumnsRenderer block={block} />;
        case "html":
            return <HTMLRenderer block={block} />;
        default:
            return <div className="unknown-block">Unknown block type: {block.type}</div>;
    }
}

function RichTextRenderer({ block }) {
    return (
        <div className="block-render richtext prose">
            <div dangerouslySetInnerHTML={{ __html: block.content || "" }} />
        </div>
    );
}

function HeroRenderer({ block }) {
    return (
        <section className={`block-render hero align-${block.alignment || "center"}`} style={{ backgroundImage: block.backgroundImage ? `url(${imageSrc(block.backgroundImage)})` : "none" }}>
            <div className="hero-overlay" />
            <div className="hero-content">
                {block.title && <h1>{block.title}</h1>}
                {block.subtitle && <p>{block.subtitle}</p>}
                {block.ctaText && block.ctaUrl && (
                    <a href={block.ctaUrl} className="btn-primary">{block.ctaText}</a>
                )}
            </div>
        </section>
    );
}

function FeaturesRenderer({ block }) {
    return (
        <section className="block-render features">
            <div className={`features-grid cols-${block.columns || 3}`}>
                {(block.items || []).map((item, i) => (
                    <div key={i} className="feature-card">
                        {item.icon && <span className="feature-icon">{item.icon}</span>}
                        {item.title && <h3>{item.title}</h3>}
                        {item.description && <p>{item.description}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
}

function StatsRenderer({ block }) {
    return (
        <section className="block-render stats">
            <div className="stats-grid">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="stat-card">
                        <span className="stat-value">{item.value}</span>
                        <span className="stat-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function TimelineRenderer({ block }) {
    return (
        <section className="block-render timeline">
            <div className="timeline">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="timeline-item">
                        <span className="timeline-year">{item.year}</span>
                        <div className="timeline-content">
                            {item.title && <h3>{item.title}</h3>}
                            {item.description && <p>{item.description}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function MediaRenderer({ block }) {
    return (
        <figure className={`block-render media width-${block.width || "full"}`}>
            {block.mediaType === "image" && block.src && (
                <img src={imageSrc(block.src)} alt={block.alt || ""} loading="lazy" />
            )}
            {block.mediaType === "video" && block.src && (
                <video controls src={imageSrc(block.src)} preload="metadata" />
            )}
            {block.mediaType === "embed" && block.src && (
                <div className="embed-wrapper">
                    <iframe src={block.src} frameBorder="0" allowFullScreen title={block.alt || "Embedded content"} />
                </div>
            )}
            {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
    );
}

function CTARenderer({ block }) {
    return (
        <section className={`block-render cta style-${block.style || "primary"}`}>
            <div className="cta-content">
                {block.title && <h2>{block.title}</h2>}
                {block.description && <p>{block.description}</p>}
                {block.buttonText && block.buttonUrl && (
                    <a href={block.buttonUrl} className={`btn-${block.style || "primary"}`}>{block.buttonText}</a>
                )}
            </div>
        </section>
    );
}

function QuoteRenderer({ block }) {
    return (
        <blockquote className="block-render quote">
            <p>{block.text || ""}</p>
            {block.author && (
                <footer>
                    {block.avatar && <img src={imageSrc(block.avatar)} alt="" className="quote-avatar" />}
                    <div>
                        <cite>{block.author}</cite>
                        {block.role && <span>{block.role}</span>}
                    </div>
                </footer>
            )}
        </blockquote>
    );
}

function ColumnsRenderer({ block }) {
    return (
        <div className={`block-render columns cols-${block.count || 2}`}>
            {(block.columns || []).map((col, i) => (
                <div key={i} className="column" dangerouslySetInnerHTML={{ __html: col.content || "" }} />
            ))}
        </div>
    );
}

function HTMLRenderer({ block }) {
    return (
        <div className="block-render html" dangerouslySetInnerHTML={{ __html: block.content || "" }} />
    );
}