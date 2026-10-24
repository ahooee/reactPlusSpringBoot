import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import ProductRail from "../components/ProductRail";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { PUCK_COMPONENTS as BUILDER_COMPONENTS } from "../components/puckConfig";

/* Legacy block shapes kept so pages created with the old editor still render. */
const LEGACY_PUCK_COMPONENTS = {
    text: {
        render: ({ children }) => <p>{children}</p>,
    },
    heading: {
        render: ({ children, level }) => {
            const Tag = level === "h1" ? "h1" : level === "h3" ? "h3" : "h2";
            return <Tag style={{ fontSize: level === "h1" ? "2.5rem" : level === "h3" ? "1.5rem" : "2rem" }}>{children}</Tag>;
        },
    },
    image: {
        render: ({ src, alt }) =>
            src ? <img src={src} alt={alt || ""} style={{ maxWidth: "100%" }} /> : null,
    },
    button: {
        render: ({ children, url }) => (
            <a href={url || "#"} style={{ display: "inline-block", padding: "10px 20px", background: "#aa3bff", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>
                {children}
            </a>
        ),
    },
    quote: {
        render: ({ children, author }) => (
            <blockquote style={{ borderLeft: "4px solid #aa3bff", paddingLeft: "1rem", fontStyle: "italic" }}>
                {children}
                {author && <footer>- {author}</footer>}
            </blockquote>
        ),
    },
    columns: {
        render: ({ columns }) => (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {columns?.map((col, i) => (
                    <div key={i} style={{ flex: 1, minWidth: "200px", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                        {col.children}
                    </div>
                ))}
            </div>
        ),
    },
    spacer: {
        render: () => <div style={{ height: "2rem" }} />,
    },
};

export default function Page() {
    const location = useLocation();
    const slug = location.pathname.slice(1);
    const [page, setPage] = useState(null);
    const [error, setError] = useState(null);
    const { t } = useLanguage();
    usePageTitle(error ? t("page.notFound") : (page?.title || ""));

    useEffect(() => {
        const controller = new AbortController();
        async function loadPage() {
            setPage(null);
            setError(null);
            try {
                const response = await fetch(`${API_URL}/api/pages/${slug}`, { signal: controller.signal });
                if (!response.ok) throw new Error(response.status === 404 ? t("page.notFound") : "Failed to load page");
                const result = await response.json();
                const loadedPage = result.data;
                let content = loadedPage.content;
                if (typeof content === "string") {
                    try {
                        content = JSON.parse(content || "{}");
                    } catch {
                        content = {};
                    }
                }
                loadedPage.content = content || {};
                setPage(loadedPage);
            } catch (err) {
                if (err.name !== "AbortError") setError(err.message);
            }
        }
        if (slug && !["shop", "blog", "login", "signup", "admin"].includes(slug.split("/")[0])) {
            loadPage();
        }
        return () => controller.abort();
    }, [slug, t]);

    if (error) {
        return (
            <>
                <Navbar />
                <main className="page-wrap">
                    <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: t("page.notFound") }]} />
                    <article className="page-article">
                        <h1>{t("page.notFound")}</h1>
                        <p>{error}</p>
                    </article>
                    <ProductRail />
                </main>
            </>
        );
    }

    if (!page) return <p className="page-state">{t("page.loading")}</p>;

    const content = page.content;

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <article className="page-article">
                    <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { label: page.title }]} />
                    <h1>{page.title}</h1>
                    <div className="page-blocks">
                        <Render config={{ components: { ...LEGACY_PUCK_COMPONENTS, ...BUILDER_COMPONENTS } }} data={content} />
                    </div>
                </article>
                <ProductRail />
            </main>
        </>
    );
}
