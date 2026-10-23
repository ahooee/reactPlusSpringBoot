import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import ProductRail from "../components/ProductRail";
import { API_URL } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";
import HTMLRenderer from "@react-page/editor/lib/renderer/HTMLRenderer";
import { cellPlugins } from "../components/pageBuilderPlugins";
import "@react-page/editor/lib/index.css";

function isHtml(s) {
    return /<[a-z][\s\S]*>/i.test(s);
}

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
                        const parsed = JSON.parse(content || "null");
                        content = parsed === null || parsed === undefined ? null : parsed;
                    } catch {
                        content = content || null;
                    }
                }
                loadedPage.content = content;
                setPage(loadedPage);
            } catch (err) {
                if (err.name !== "AbortError") setError(err.message);
            }
        }
        if (slug && !["shop", "blog", "login", "signup", "admin"].includes(slug.split("/")[0])) {
            loadPage();
        }
        return () => controller.abort();
    }, [slug]);

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
                    {content ? (
                        <div className="page-blocks">
                            <HTMLRenderer value={content} cellPlugins={cellPlugins} lang="en" />
                        </div>
                    ) : typeof content === "string" ? (
                        isHtml(content) ? (
                            <div className="prose" dangerouslySetInnerHTML={{ __html: content }} />
                        ) : (
                            <div className="prose"><p style={{ whiteSpace: "pre-wrap" }}>{content}</p></div>
                        )
                    ) : (
                        <pre style={{ background: "var(--code-bg)", padding: 16, borderRadius: 12, overflow: "auto" }}>
                            {JSON.stringify(content, null, 2)}
                        </pre>
                    )}
                </article>
                <ProductRail />
            </main>
        </>
    );
}
