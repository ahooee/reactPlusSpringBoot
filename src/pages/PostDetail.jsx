import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import ProductRail from "../components/ProductRail";
import { apiFetch, imageSrc } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePageTitle } from "../lib/usePageTitle";

export default function PostDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [error, setError] = useState(null);
    const { t } = useLanguage();
    usePageTitle(post?.title || t("blog.title"));

    useEffect(() => {
        apiFetch(`/api/posts/slug/${encodeURIComponent(slug)}`)
            .then(setPost)
            .catch(e => setError(e.message));
    }, [slug]);

    return (
        <>
            <Navbar />
            <main className="page-wrap">
                <Breadcrumbs items={[{ to: "/", label: t("nav.home") }, { to: "/blog", label: t("blog.title") }, ...(post ? [{ label: post.title }] : [])]} />
                {error && <p>Error: {error}</p>}
                {!error && !post && <p>{t("common.loading")}</p>}
                {post && (
                    <>
                        {post.coverImage && (
                            <img className="detail-img" src={imageSrc(post.coverImage)} alt={post.title} style={{ marginBottom: 18 }} />
                        )}
                        <h1>{post.title}</h1>
                        <p className="muted">{t("post.by")} {post.authorUsername || "admin"} · {post.status}</p>
                        {post.excerpt && <p><em>{post.excerpt}</em></p>}
                        {/<[a-z][\s\S]*>/i.test(post.content || "") ? (
                            <div className="prose" dangerouslySetInnerHTML={{ __html: post.content }} />
                        ) : (
                            <div className="prose"><p style={{ whiteSpace: "pre-wrap" }}>{post.content}</p></div>
                        )}
                    </>
                )}
            </main>
            <ProductRail />
        </>
    );
}
