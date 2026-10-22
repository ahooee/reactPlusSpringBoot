import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

export default function Dashboard() {
    const [stats, setStats] = useState({ posts: 0, products: 0, pages: 0, media: 0, unread: 0, openTickets: 0, bookUploaded: 0 });
    const { t } = useLanguage();
    usePageTitle(t("dash.title"));

    useEffect(() => {
        Promise.allSettled([
            apiFetch("/api/posts?all=true"),
            apiFetch("/api/products?all=true"),
            apiFetch("/api/pages"),
            apiFetch("/api/media"),
            apiFetch("/api/admin/messenger/chats?limit=100"),
            apiFetch("/api/admin/tickets/open-count"),
            apiFetch("/api/admin/books/upload/stats"),
        ]).then(([posts, products, pages, media, chats, tickets, uploads]) => {
            setStats({
                posts: posts.value?.length ?? 0,
                products: products.value?.length ?? 0,
                pages: Array.isArray(pages.value) ? pages.value.length : 0,
                media: media.value?.length ?? 0,
                unread: Array.isArray(chats.value)
                    ? chats.value.reduce((n, c) => n + (c.unreadCount || 0), 0)
                    : 0,
                openTickets: tickets.value?.open ?? 0,
                bookUploaded: uploads.value?.uploadedBooks ?? 0,
            });
        });
    }, []);

    const cards = [
        { label: t("admin.posts"), value: stats.posts, to: "/admin/posts" },
        { label: t("admin.products"), value: stats.products, to: "/admin/products" },
        { label: t("admin.pages"), value: stats.pages, to: "/admin/pages" },
        { label: t("dash.mediaFiles"), value: stats.media, to: "/admin/media" },
        { label: `${t("admin.messenger")} (${t("messenger.unread")})`, value: stats.unread, to: "/admin/messenger" },
        { label: `${t("admin.tickets")} (${t("support.status_open")})`, value: stats.openTickets, to: "/admin/tickets" },
        { label: t("admin.bookUpload"), value: stats.bookUploaded, to: "/admin/books-upload" },
        { label: t("admin.backup"), value: "💾", to: "/admin/backup" },
    ];

    return (
        <AdminLayout>
            <h1>{t("dash.title")}</h1>
            <p className="muted">{t("dash.desc")}</p>
            <div className="grid-3" style={{ marginTop: 20 }}>
                {cards.map(c => (
                    <Link key={c.label} to={c.to} className="card">
                        <div className="card-body">
                            <h3>{c.value}</h3>
                            <p className="muted">{c.label} →</p>
                        </div>
                    </Link>
                ))}
            </div>
        </AdminLayout>
    );
}
