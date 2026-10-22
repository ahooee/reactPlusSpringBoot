import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function AdminLayout({ children }) {
    const { t } = useLanguage();
    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <h3>{t("admin.title")}</h3>
                <nav>
                    <Link to="/admin">{t("admin.dashboard")}</Link>
                    <Link to="/admin/posts">{t("admin.posts")}</Link>
                    <Link to="/admin/products">{t("admin.products")}</Link>
                    <Link to="/admin/categories">{t("admin.categories")}</Link>
                    <Link to="/admin/rail">{t("admin.rail")}</Link>
                    <Link to="/admin/post-rail">{t("admin.postRail")}</Link>
                    <Link to="/admin/pages">{t("admin.pages")}</Link>
                    <Link to="/admin/menus">{t("admin.menus")}</Link>
                    <Link to="/admin/media">{t("admin.media")}</Link>
                    <Link to="/admin/settings">{t("admin.settings")}</Link>
                    <Link to="/admin/bot">{t("admin.bot")}</Link>
                    <Link to="/admin/books-upload">{t("admin.bookUpload")}</Link>
                    <Link to="/admin/messenger">{t("admin.messenger")}</Link>
                    <Link to="/admin/tickets">{t("admin.tickets")}</Link>
                    <Link to="/admin/orders">{t("admin.orders")}</Link>
                    <Link to="/admin/backup">{t("admin.backup")}</Link>
                    <Link to="/"> {t("admin.viewSite")}</Link>
                </nav>
            </aside>
            <div className="admin-main">{children}</div>
        </div>
    );
}
