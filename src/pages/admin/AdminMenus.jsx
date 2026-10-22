import { Fragment, useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

const emptyItemForm = { title: "", titleFa: "", url: "/", parentId: "" };

/** Mirror of the backend rule: /shop/{slug} pages are product leaves, never parents. */
function isProductLink(url) {
    if (url == null || String(url).trim() === "") return false;
    let path = String(url).split(/[?#]/, 1)[0];
    while (path.endsWith("/") && path.length > 1) path = path.slice(0, -1);
    if (!path.startsWith("/shop/")) return false;
    const rest = path.slice("/shop/".length);
    return rest !== "" && !rest.includes("/");
}

function isProduct(item) {
    return item?.productItem === true || isProductLink(item?.url);
}

export default function AdminMenus() {
    const [menus, setMenus] = useState([]);
    const [selected, setSelected] = useState(null);
    const [newMenu, setNewMenu] = useState({ name: "", nameFa: "", slug: "", url: "" });
    const [newItem, setNewItem] = useState({ ...emptyItemForm });
    const [editingMenu, setEditingMenu] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);
    const [itemForm, setItemForm] = useState({ ...emptyItemForm });
    const [products, setProducts] = useState([]);
    const [linkProductId, setLinkProductId] = useState("");
    const [linkMenuIds, setLinkMenuIds] = useState([]);
    const [linkResult, setLinkResult] = useState("");
    const { t, lang } = useLanguage();
    usePageTitle(t("menus.title"));
    const labelOf = (en, fa) => (lang === "fa" && fa ? fa : en);

    function load() {
        apiFetch("/api/menus").then(data => {
            const list = Array.isArray(data) ? data : [];
            setMenus(list);
            if (list.length && !selected) setSelected(list[0]);
            else if (selected) {
                const fresh = list.find(m => m.id === selected.id);
                if (fresh) setSelected(fresh);
            }
        }).catch(() => {});
    }

    useEffect(load, []);

    useEffect(() => {
        apiFetch("/api/products?all=true")
            .then(data => setProducts(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    async function refresh(id) {
        const menuId = id ?? selected?.id;
        if (menuId) {
            try {
                setSelected(await apiFetch(`/api/menus/${menuId}`));
            } catch {
                // menu may have been deleted
            }
        }
        load();
    }

    async function createMenu(e) {
        e.preventDefault();
        try {
            await apiFetch("/api/menus", { method: "POST", body: JSON.stringify(newMenu) });
            setNewMenu({ name: "", nameFa: "", slug: "", url: "" });
            load();
        } catch (err) {
            alert(err.message);
        }
    }

    function startEditMenu() {
        if (!selected) return;
        setEditingMenu({
            name: selected.name || "",
            nameFa: selected.nameFa || "",
            slug: selected.slug || "",
            url: selected.url || "",
        });
    }

    async function saveMenuEdit(e) {
        e.preventDefault();
        if (!selected) return;
        try {
            await apiFetch(`/api/menus/${selected.id}`, { method: "PUT", body: JSON.stringify(editingMenu) });
            setEditingMenu(null);
            refresh(selected.id);
        } catch (err) {
            alert(err.message);
        }
    }

    async function createItem(e) {
        e.preventDefault();
        if (!selected) return;
        try {
            await apiFetch(`/api/menus/${selected.id}/items`, {
                method: "POST",
                body: JSON.stringify({
                    title: newItem.title,
                    titleFa: newItem.titleFa || null,
                    url: newItem.url,
                    parent: newItem.parentId ? { id: Number(newItem.parentId) } : null,
                }),
            });
            setNewItem({ ...emptyItemForm });
            refresh(selected.id);
        } catch (err) {
            alert(err.message);
        }
    }

    function startEditItem(row) {
        setEditingItemId(row.item.id);
        setItemForm({
            title: row.item.title || "",
            titleFa: row.item.titleFa || "",
            url: row.item.url || "",
            parentId: row.parentId ? String(row.parentId) : "",
        });
    }

    async function saveItemEdit(e) {
        e.preventDefault();
        if (!selected || editingItemId == null) return;
        try {
            const row = rows.find(r => r.item.id === editingItemId);
            await apiFetch(`/api/menus/items/${editingItemId}`, {
                method: "PUT",
                body: JSON.stringify({
                    title: itemForm.title,
                    titleFa: itemForm.titleFa || null,
                    url: itemForm.url,
                }),
            });
            const newParentId = itemForm.parentId ? Number(itemForm.parentId) : null;
            const oldParentId = row?.parentId ?? null;
            if (newParentId !== oldParentId) {
                await apiFetch(`/api/menus/items/${editingItemId}/parent`, {
                    method: "PUT",
                    body: JSON.stringify({ parentId: newParentId }),
                });
            }
            setEditingItemId(null);
            refresh(selected.id);
        } catch (err) {
            alert(err.message);
        }
    }

    async function moveItem(id, parentId) {
        try {
            await apiFetch(`/api/menus/items/${id}/parent`, {
                method: "PUT",
                body: JSON.stringify({ parentId }),
            });
            refresh(selected?.id);
        } catch (err) {
            alert(err.message);
        }
    }

    async function swapOrder(a, b) {
        if (!a || !b) return;
        try {
            await apiFetch(`/api/menus/items/${a.item.id}`, {
                method: "PUT",
                body: JSON.stringify({ sortOrder: b.item.sortOrder }),
            });
            await apiFetch(`/api/menus/items/${b.item.id}`, {
                method: "PUT",
                body: JSON.stringify({ sortOrder: a.item.sortOrder }),
            });
            refresh(selected?.id);
        } catch (err) {
            alert(err.message);
        }
    }

    function siblingAt(row, delta) {
        return rows.find(r =>
            r.depth === row.depth &&
            (r.parentId ?? null) === (row.parentId ?? null) &&
            r.idx === row.idx + delta
        ) || null;
    }

    async function deleteItem(id) {
        if (!window.confirm(t("menus.confirmItem"))) return;
        try {
            await apiFetch(`/api/menus/items/${id}`, { method: "DELETE" });
            setEditingItemId(cur => (cur === id ? null : cur));
            refresh(selected?.id);
        } catch (err) {
            alert(err.message);
        }
    }

    async function deleteMenu(id) {
        if (!window.confirm(t("menus.confirmMenu"))) return;
        await apiFetch(`/api/menus/${id}`, { method: "DELETE" });
        setSelected(null);
        setEditingMenu(null);
        setLinkMenuIds([]);
        load();
    }

    function collectUrls(items, into = new Set()) {
        (items ?? []).forEach(i => {
            into.add(i.url);
            collectUrls(i.children, into);
        });
        return into;
    }

    function findByUrl(items, url) {
        for (const i of (items ?? [])) {
            if (i.url === url) return i;
            const deeper = findByUrl(i.children, url);
            if (deeper) return deeper;
        }
        return null;
    }

    function toggleLinkMenu(id) {
        setLinkResult("");
        setLinkMenuIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    }

    async function addProductLinks() {
        const product = products.find(p => String(p.id) === String(linkProductId));
        if (!product || linkMenuIds.length === 0) return;
        const url = `/shop/${product.slug}`;
        const wantSub = product.bookType === "PAPER" ? "/books/paper-books" : "/books/ebooks";
        let added = 0;
        let skipped = 0;
        try {
            for (const menuId of linkMenuIds) {
                const menu = await apiFetch(`/api/menus/${menuId}`);
                if (collectUrls(menu.menuItems).has(url)) {
                    skipped++;
                    continue;
                }
                let parent = null;
                if (menu.slug === "shop") {
                    // Shop placement is automatic: straight under the right Books submenu.
                    const sub = findByUrl(menu.menuItems, wantSub);
                    if (sub) parent = { id: sub.id };
                }
                await apiFetch(`/api/menus/${menuId}/items`, {
                    method: "POST",
                    body: JSON.stringify({
                        title: `Buy ${product.name}`,
                        titleFa: `خرید ${product.name}`,
                        url,
                        parent,
                    }),
                });
                added++;
            }
            setLinkResult(t("menus.linksAdded", { n: added, m: skipped }));
            refresh(selected?.id);
        } catch (err) {
            alert(err.message);
        }
    }

    async function syncProductLinks() {
        try {
            const r = await apiFetch("/api/menus/sync-products", { method: "POST" });
            setLinkResult(t("menus.syncDone", { c: r.created ?? 0, m: r.moved ?? 0, r: r.removed ?? 0 }));
            refresh(selected?.id);
        } catch (err) {
            alert(err.message);
        }
    }

    const items = selected?.menuItems ?? [];
    // Top-level items are eligible parents (keeps nesting to two levels).
    // Product pages can never be parents, so they are not offered.
    const parentOptions = items.filter(top => !isProduct(top));
    // Flatten the tree, remembering depth, sibling position and parent.
    const rows = [];
    items.forEach((top, i, arr) => {
        rows.push({ item: top, depth: 0, idx: i, count: arr.length, parentId: null });
        (top.children ?? []).forEach((child, j, arr2) => {
            rows.push({ item: child, depth: 1, idx: j, count: arr2.length, parentId: top.id });
            (child.children ?? []).forEach((grand, k, arr3) =>
                rows.push({ item: grand, depth: 2, idx: k, count: arr3.length, parentId: child.id }));
        });
    });
    const rowsById = new Map(rows.map(r => [r.item.id, r]));

    return (
        <AdminLayout>
            <h1>{t("menus.title")}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {menus.map(m => (
                    <button
                        key={m.id}
                        className="small-btn"
                        style={selected?.id === m.id ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}
                        onClick={() => { setSelected(m); setEditingMenu(null); setEditingItemId(null); setLinkMenuIds([m.id]); }}
                    >
                        {m.name}
                        {m.nameFa ? <span className="muted"> · {m.nameFa}</span> : null}
                    </button>
                ))}
            </div>

            <form className="form" onSubmit={createMenu} style={{ marginBottom: 24 }}>
                <h3>{t("menus.new")}</h3>
                <div className="form-row">
                    <label>{t("menus.name")}<input value={newMenu.name} onChange={e => setNewMenu({ ...newMenu, name: e.target.value })} required /></label>
                    <label>{t("menus.nameFa")}<input value={newMenu.nameFa} onChange={e => setNewMenu({ ...newMenu, nameFa: e.target.value })} /></label>
                </div>
                <div className="form-row">
                    <label>{t("menus.slug")}<input value={newMenu.slug} onChange={e => setNewMenu({ ...newMenu, slug: e.target.value })} required /></label>
                    <label>{t("menus.url")}<input value={newMenu.url} onChange={e => setNewMenu({ ...newMenu, url: e.target.value })} placeholder="/shop" /></label>
                </div>
                <div><button className="btn" type="submit">{t("menus.create")}</button></div>
            </form>

            {selected && (
                <>
                    <h3>{t("menus.itemsIn")} {labelOf(selected.name, selected.nameFa)} »</h3>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        {!editingMenu ? (
                            <button className="small-btn" onClick={startEditMenu}>{t("menus.editMenu")}</button>
                        ) : (
                            <form className="form" onSubmit={saveMenuEdit} style={{ flex: 1 }}>
                                <div className="form-row">
                                    <label>{t("menus.name")}<input value={editingMenu.name} onChange={e => setEditingMenu({ ...editingMenu, name: e.target.value })} required /></label>
                                    <label>{t("menus.nameFa")}<input value={editingMenu.nameFa} onChange={e => setEditingMenu({ ...editingMenu, nameFa: e.target.value })} /></label>
                                </div>
                                <div className="form-row">
                                    <label>{t("menus.slug")}<input value={editingMenu.slug} onChange={e => setEditingMenu({ ...editingMenu, slug: e.target.value })} required /></label>
                                    <label>{t("menus.url")}<input value={editingMenu.url} onChange={e => setEditingMenu({ ...editingMenu, url: e.target.value })} /></label>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button className="btn" type="submit">{t("menus.save")}</button>
                                    <button type="button" className="small-btn" onClick={() => setEditingMenu(null)}>{t("menus.cancel")}</button>
                                </div>
                            </form>
                        )}
                    </div>
                    <table className="admin-table">
                        <thead><tr><th>{t("menus.colTitle")}</th><th>{t("menus.colUrl")}</th><th>{t("common.actions")}</th></tr></thead>
                        <tbody>
                            {rows.map(row => {
                                const { item, depth } = row;
                                const prev = siblingAt(row, -1);
                                const next = siblingAt(row, 1);
                                const parentRow = row.parentId != null ? rowsById.get(row.parentId) : null;
                                return (
                                    <Fragment key={item.id}>
                                        <tr>
                                            <td>
                                                <span style={{ paddingInlineStart: depth * 20 }}>
                                                    {depth > 0 && <span className="muted">↳ </span>}
                                                    {labelOf(item.title, item.titleFa)}
                                                </span>
                                            </td>
                                            <td className="muted">{item.url}</td>
                                            <td><div className="admin-actions">
                                                <button className="small-btn" onClick={() => startEditItem(row)}>{t("common.edit")}</button>
                                                <button className="small-btn" title={t("menus.moveUp")} disabled={!prev} onClick={() => swapOrder(row, prev)}>↑</button>
                                                <button className="small-btn" title={t("menus.moveDown")} disabled={!next} onClick={() => swapOrder(row, next)}>↓</button>
                                                <button
                                                    className="small-btn"
                                                    title={t("menus.indent")}
                                                    disabled={depth >= 2 || !prev || isProduct(prev.item)}
                                                    onClick={() => moveItem(item.id, prev.item.id)}
                                                >→</button>
                                                <button
                                                    className="small-btn"
                                                    title={t("menus.outdent")}
                                                    disabled={depth === 0}
                                                    onClick={() => moveItem(item.id, parentRow?.parentId ?? null)}
                                                >←</button>
                                                <button className="small-btn danger" onClick={() => deleteItem(item.id)}>{t("common.delete")}</button>
                                            </div></td>
                                        </tr>
                                        {editingItemId === item.id && (
                                            <tr key={`${item.id}-edit`}>
                                                <td colSpan={3}>
                                                    <form className="form" onSubmit={saveItemEdit}>
                                                        <div className="form-row">
                                                            <label>{t("menus.itemTitle")}<input value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} required /></label>
                                                            <label>{t("menus.itemTitleFa")}<input value={itemForm.titleFa} onChange={e => setItemForm({ ...itemForm, titleFa: e.target.value })} /></label>
                                                        </div>
                                                        <div className="form-row">
                                                            <label>{t("menus.itemUrl")}<input value={itemForm.url} onChange={e => setItemForm({ ...itemForm, url: e.target.value })} required /></label>
                                                            <label>{t("menus.parent")}
                                                                <select value={itemForm.parentId} onChange={e => setItemForm({ ...itemForm, parentId: e.target.value })}>
                                                                    <option value="">{t("menus.topLevel")}</option>
                                                                    {parentOptions.filter(p => p.id !== item.id).map(p => (
                                                                        <option key={p.id} value={p.id}>{labelOf(p.title, p.titleFa)}</option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 8 }}>
                                                            <button className="btn" type="submit">{t("menus.save")}</button>
                                                            <button type="button" className="small-btn" onClick={() => setEditingItemId(null)}>{t("menus.cancel")}</button>
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    <form className="form" onSubmit={createItem} style={{ marginTop: 20 }}>
                        <h3>{t("menus.newItem")}</h3>
                        <div className="form-row">
                            <label>{t("menus.itemTitle")}<input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} required /></label>
                            <label>{t("menus.itemTitleFa")}<input value={newItem.titleFa} onChange={e => setNewItem({ ...newItem, titleFa: e.target.value })} /></label>
                        </div>
                        <div className="form-row">
                            <label>{t("menus.itemUrl")}<input value={newItem.url} onChange={e => setNewItem({ ...newItem, url: e.target.value })} required /></label>
                            <label>{t("menus.parent")}
                                <select value={newItem.parentId} onChange={e => setNewItem({ ...newItem, parentId: e.target.value })}>
                                    <option value="">{t("menus.topLevel")}</option>
                                    {parentOptions.map(p => (
                                        <option key={p.id} value={p.id}>{labelOf(p.title, p.titleFa)}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div><button className="btn" type="submit">{t("menus.addItem")}</button></div>
                    </form>

                    <div style={{ marginTop: 20 }} className="form">
                        <h3>{t("menus.addProductLink")}</h3>
                        <p className="muted">{t("menus.autoHint")}</p>
                        <div className="form-row">
                            <label>{t("menus.chooseProduct")}
                                <select value={linkProductId} onChange={e => { setLinkProductId(e.target.value); setLinkResult(""); }}>
                                    <option value="">{t("menus.selectProduct")}</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.bookType === "PAPER" ? "📕" : "📄"} {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={menus.length > 0 && linkMenuIds.length === menus.length}
                                    onChange={e => {
                                        setLinkResult("");
                                        setLinkMenuIds(e.target.checked ? menus.map(m => m.id) : []);
                                    }}
                                /> {t("menus.allMenus")}
                            </label>
                            {menus.map(m => (
                                <label key={m.id}>
                                    <input
                                        type="checkbox"
                                        checked={linkMenuIds.includes(m.id)}
                                        onChange={() => toggleLinkMenu(m.id)}
                                    /> {labelOf(m.name, m.nameFa)}
                                </label>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" className="btn" disabled={!linkProductId || linkMenuIds.length === 0} onClick={addProductLinks}>
                                {t("menus.addLinks")}
                            </button>
                            <button type="button" className="small-btn" onClick={syncProductLinks}>
                                {t("menus.syncProducts")}
                            </button>
                        </div>
                        {linkResult && <p className="muted" style={{ marginTop: 8 }}>{linkResult}</p>}
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <button className="small-btn danger" onClick={() => deleteMenu(selected.id)}>{t("menus.deleteMenu")}</button>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
