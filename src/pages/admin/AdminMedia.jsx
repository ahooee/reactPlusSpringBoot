import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_URL, authHeaders, apiFetch, imageSrc } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";
import { usePageTitle } from "../../lib/usePageTitle";

export default function AdminMedia() {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const { t } = useLanguage();
    usePageTitle(t("media.title"));

    function load() {
        apiFetch("/api/media").then(setFiles).catch(() => {});
    }

    useEffect(load, []);

    async function handleUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_URL}/api/media/upload`, {
                method: "POST",
                headers: { ...authHeaders() },
                body: form,
            });
            if (!res.ok) throw new Error("Upload failed");
            load();
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    async function remove(id) {
        if (!window.confirm(t("media.confirmDelete"))) return;
        await apiFetch(`/api/media/${id}`, { method: "DELETE" });
        load();
    }

    return (
        <AdminLayout>
            <h1>{t("media.title")}</h1>
            <p className="muted">{t("media.hint")}</p>
            <label className="btn" style={{ cursor: "pointer" }}>
                {uploading ? t("media.uploading") : t("media.upload")}
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
            </label>

            <div className="media-grid" style={{ marginTop: 20 }}>
                {files.map(f => (
                    <div key={f.id} className="card">
                        <img src={imageSrc(f.url)} alt={f.originalName} />
                        <div className="card-body">
                            <p className="muted" style={{ wordBreak: "break-all" }}>{f.url}</p>
                            <div className="admin-actions">
                                <button className="small-btn" onClick={() => navigator.clipboard?.writeText(imageSrc(f.url))}>{t("media.copy")}</button>
                                <button className="small-btn danger" onClick={() => remove(f.id)}>{t("common.delete")}</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {files.length === 0 && <p className="muted">{t("media.empty")}</p>}
        </AdminLayout>
    );
}
