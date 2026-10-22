import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiFetch, postThumb } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

function thumb(p) {
    const src = postThumb(p);
    return src
        ? <img src={src} alt={p.title} loading="lazy" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8 }} />
        : <div style={{ width: 52, height: 52, borderRadius: 8, background: "var(--code-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✎</div>;
}

export default function AdminPostRail() {
    const [allPosts, setAllPosts] = useState([]);
    const [railIds, setRailIds] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const { t } = useLanguage();
    usePageTitle(t("postrail.manageTitle"));

    useEffect(() => {
        Promise.all([
            apiFetch("/api/posts").catch(() => []),
            apiFetch("/api/settings").catch(() => ({})),
        ]).then(([posts, settings]) => {
            const list = Array.isArray(posts) ? posts : [];
            setAllPosts(list);
            let ids = [];
            const raw = settings?.postRailIds;
            if (typeof raw === "string" && raw !== "") {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) ids = parsed.filter(n => typeof n === "number");
                } catch {
                    ids = [];
                }
            }
            setRailIds(ids);
        });
    }, []);

    async function persist(next) {
        setRailIds(next);
        setSaving(true);
        setError(null);
        try {
            await apiFetch("/api/settings", {
                method: "PUT",
                body: JSON.stringify({ postRailIds: JSON.stringify(next) }),
            });
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    function move(id, dir) {
        const i = railIds.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= railIds.length) return;
        const next = [...railIds];
        [next[i], next[j]] = [next[j], next[i]];
        persist(next);
    }

    if (railIds === null) {
        return (
            <AdminLayout>
                <h1>{t("postrail.manageTitle")}</h1>
                <p className="muted">{t("common.loading")}</p>
            </AdminLayout>
        );
    }

    const byId = new Map(allPosts.map(p => [p.id, p]));
    const railItems = railIds.map(id => byId.get(id)).filter(Boolean);
    const inRail = new Set(railIds);

    return (
        <AdminLayout>
            <h1>{t("postrail.manageTitle")}</h1>
            <p className="muted">{t("postrail.hint")}</p>
            <p className="muted">
                {saving ? `⏳ ${t("rail.saving")}` : `✓ ${t("rail.saved")}`}
                {error && <span className="error" style={{ marginInlineStart: 8 }}>{error}</span>}
            </p>

            <h3>{t("postrail.inSlider")} ({railItems.length})</h3>
            {railItems.length === 0 && <p className="muted">{t("postrail.empty")}</p>}
            <table className="admin-table">
                <thead><tr><th></th><th>{t("posts.colTitle")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {railItems.map((p, i) => (
                        <tr key={p.id}>
                            <td style={{ width: 60 }}>{thumb(p)}</td>
                            <td>{p.title}</td>
                            <td><div className="admin-actions">
                                <button className="small-btn" disabled={i === 0} onClick={() => move(p.id, -1)} title={t("rail.up")}>↑</button>
                                <button className="small-btn" disabled={i === railItems.length - 1} onClick={() => move(p.id, 1)} title={t("rail.down")}>↓</button>
                                <button className="small-btn danger" onClick={() => persist(railIds.filter(id => id !== p.id))}>{t("rail.remove")}</button>
                            </div></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 style={{ marginTop: 28 }}>{t("postrail.catalog")}</h3>
            <table className="admin-table">
                <thead><tr><th></th><th>{t("posts.colTitle")}</th><th>{t("common.actions")}</th></tr></thead>
                <tbody>
                    {allPosts.map(p => (
                        <tr key={p.id}>
                            <td style={{ width: 60 }}>{thumb(p)}</td>
                            <td>{p.title}</td>
                            <td>
                                {inRail.has(p.id)
                                    ? <span className="muted">✓ {t("rail.added")}</span>
                                    : <button className="small-btn" onClick={() => persist([...railIds, p.id])}>+ {t("rail.add")}</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
