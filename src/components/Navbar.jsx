import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, imageSrc } from "../lib/api";
import { siteNameOf } from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useTheme, THEMES } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import NotificationsBell from "./NotificationsBell";
import { useCart } from "../context/CartContext";
import "./Navbar.css";

function menuUrl(menu) {
    if (menu.url) return menu.url;
    if (!menu.slug || menu.slug === "home") return "/";
    return menu.slug.startsWith("/") ? menu.slug : `/${menu.slug}`;
}

function isExternal(url) {
    return /^https?:\/\//i.test(url || "");
}

function NavEntry({ to, className, onClick, children }) {
    if (isExternal(to)) {
        return <a href={to} className={className}>{children}</a>;
    }
    return <Link to={to} className={className} onClick={onClick}>{children}</Link>;
}

function DropdownItem({ item, labelOf, closeMobile, isAdmin, onDelete, deleteTitle, lang }) {
    const grandchildren = item.children ?? [];
    const hasKids = grandchildren.length > 0;
    return (
        <div className={`dropdown-item${hasKids ? " has-kids" : ""}`}>
            <NavEntry to={item.url} className="dropdown-link" onClick={closeMobile}>
                {labelOf(item.title, item.titleFa)}
            </NavEntry>
            {hasKids && (
                <span className="submenu-arrow" aria-hidden="true">
                    {lang === "fa" ? "◂" : "▸"}
                </span>
            )}
            {isAdmin && (
                <button className="delete-item-button" onClick={() => onDelete(item.id)} title={deleteTitle}>×</button>
            )}
            {hasKids && (
                <div className="dropdown-sub">
                    {grandchildren.map(g => (
                        <DropdownItem
                            key={g.id}
                            item={g}
                            labelOf={labelOf}
                            closeMobile={closeMobile}
                            isAdmin={isAdmin}
                            onDelete={onDelete}
                            deleteTitle={deleteTitle}
                            lang={lang}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Navbar() {
    const [menus, setMenus] = useState([]);
    const [failed, setFailed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, logout, isAdmin } = useAuth();
    const { mode, toggleMode, themeId, setThemeId, settings } = useTheme();
    const { t, lang } = useLanguage();
    const { count, setOpen } = useCart();
    const navigate = useNavigate();

    const logoUrl = settings?.siteLogoUrl || "";
    const siteName = siteNameOf(settings, lang);

    // Keep favicon in sync with admin-controlled logo.
    // (Page title itself is owned by each page via usePageTitle.)
    useEffect(() => {
        if (logoUrl) {
            let link = document.querySelector("link[rel='icon']");
            if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
            }
            link.href = imageSrc(logoUrl);
        }
    }, [logoUrl]);

    useEffect(() => {
        loadMenus();
    }, []);

    async function loadMenus() {
        try {
            setFailed(false);
            const data = await apiFetch("/api/menus");
            setMenus(Array.isArray(data) ? data : []);
        } catch {
            setMenus([]);
            setFailed(true);
        }
    }

    // Admin: add a new parent Menu
    async function addMenu() {
        const name = prompt(t("menus.promptName"));
        if (!name) return;
        const slug = prompt(t("menus.promptSlug"), name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, ""));
        if (!slug) return;
        const url = prompt(t("menus.promptUrl"), slug === "home" ? "/" : `/${slug}`);
        if (url === null) return;
        try {
            await apiFetch("/api/menus", {
                method: "POST",
                body: JSON.stringify({ name, slug, url: url || "/" }),
            });
            await loadMenus();
        } catch (e) {
            alert(e.message);
        }
    }

    // Admin: add a MenuItem child to any parent menu (including Shop and Blog)
    async function addChild(menuId) {
        const title = prompt(t("menus.promptItemName"));
        if (!title) return;
        const url = prompt(t("menus.promptItemUrl"), "/");
        if (!url) return;
        try {
            await apiFetch(`/api/menus/${menuId}/items`, {
                method: "POST",
                body: JSON.stringify({ title, url }),
            });
            await loadMenus();
        } catch (e) {
            alert(e.message);
        }
    }

    async function deleteMenuItem(id) {
        if (!window.confirm(t("menus.confirmItem"))) return;
        try {
            await apiFetch(`/api/menus/items/${id}`, { method: "DELETE" });
            await loadMenus();
        } catch (e) {
            alert(e.message);
        }
    }

    function handleLogout() {
        logout();
        navigate("/");
    }

    const showFallback = failed || menus.length === 0;
    const labelOf = (en, fa) => (lang === "fa" && fa ? fa : en);
    const fallback = [
        { to: "/", label: t("nav.home") },
        { to: "/shop", label: t("nav.shop") },
        { to: "/blog", label: t("nav.blog") },
    ];

    return (
        <header className="navbar" key={lang}>
            {/* ── Top utility bar (Digikala-style): settings + account/cart ── */}
            <div className="topbar">
                <div className="topbar-inner">
                    <div className="topbar-settings">
                        <select
                            className="theme-select"
                            value={themeId}
                            onChange={e => setThemeId(e.target.value)}
                            title={t("nav.themeLabel")}
                        >
                            {THEMES.map(them => (
                                <option key={them.id} value={them.id}>{them.name}</option>
                            ))}
                        </select>

                        <button className="mode-toggle" onClick={toggleMode} title={t("nav.themeLabel")}>
                            {mode === "light" ? t("nav.dark") : t("nav.light")}
                        </button>

                        <LanguageToggle />
                    </div>

                    <div className="topbar-actions">
                        {user && <NotificationsBell />}
                        <button className="cart-btn" onClick={() => setOpen(true)} title={t("cart.title")} aria-label={t("cart.title")}>
                            🛒
                            {count > 0 && <span className="cart-badge">{count}</span>}
                        </button>
                        {user && (
                            <Link to="/orders" className="navbar-link" title={t("nav.orders")}>📦 {t("nav.orders")}</Link>
                        )}

                        {user ? (
                            <>
                                <Link to="/support" className="navbar-link">{t("nav.support")}</Link>
                                <Link to="/account" className="navbar-link" title={t("account.title")}>👤 {t("nav.profile")}</Link>
                                {isAdmin && <Link to="/admin" className="navbar-link admin-link">{t("nav.admin")}</Link>}
                                <span className="navbar-user">{user.username}</span>
                                <button className="auth-btn" onClick={handleLogout}>{t("nav.logout")}</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="navbar-link">{t("nav.login")}</Link>
                                <Link to="/signup" className="auth-btn primary">{t("nav.signup")}</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main menu bar: logo + navigation ── */}
            <div className="navbar-container mainbar">
                <Link to="/" className="navbar-logo">
                    {logoUrl && (
                        <img
                            className="navbar-logo-img"
                            src={imageSrc(logoUrl)}
                            alt={siteName}
                        />
                    )}
                    <span className="navbar-logo-text">{siteName}</span>
                </Link>

                <button
                    className="navbar-burger"
                    onClick={() => setMobileOpen(o => !o)}
                    aria-label={t("nav.toggleMenu")}
                >
                    ☰
                </button>

                <nav className={`navbar-links ${mobileOpen ? "open" : ""}`}>
                    {showFallback && fallback.map(item => (
                        <Link key={item.to} to={item.to} className="navbar-link" onClick={() => setMobileOpen(false)}>
                            {item.label}
                        </Link>
                    ))}

                    {menus.map(menu => {
                        const children = menu.menuItems ?? [];
                        const to = menuUrl(menu);
                        return (
                            <div className="navbar-item" key={menu.id}>
                                <div className="navbar-link-container">
                                    <NavEntry to={to} className="navbar-link" onClick={() => setMobileOpen(false)}>
                                        {labelOf(menu.name, menu.nameFa)}
                                        {children.length > 0 && <span className="dropdown-arrow">▼</span>}
                                    </NavEntry>
                                </div>
                                {(children.length > 0 || isAdmin) && (
                                    <div className="dropdown">
                                        {children.map(child => (
                                            <DropdownItem
                                                key={child.id}
                                                item={child}
                                                labelOf={labelOf}
                                                closeMobile={() => setMobileOpen(false)}
                                                isAdmin={isAdmin}
                                                onDelete={deleteMenuItem}
                                                deleteTitle={t("common.delete")}
                                                lang={lang}
                                            />
                                        ))}
                                        {isAdmin && (
                                            <button className="add-item-button" onClick={() => addChild(menu.id)}>
                                                + {t("menus.addItem")} ({labelOf(menu.name, menu.nameFa)})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {isAdmin && (
                        <button className="add-menu-button" onClick={addMenu}>{t("nav.addMenu")}</button>
                    )}
                </nav>
            </div>
        </header>
    );
}
