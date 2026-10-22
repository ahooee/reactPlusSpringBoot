import { getStoredToken, getCookie, setCookie } from "./cookies";

export const API_URL = "";

const VIEWER_KEY = "viewerToken";

/**
 * Stable per-browser guest identity for product view counting.
 * Generated once and persisted (localStorage + cookie); sent as
 * X-Viewer-Token. Survives login, so a guest view is never recounted
 * for the same browser after it logs in.
 */
export function viewerToken() {
    try {
        let v = null;
        try {
            v = localStorage.getItem(VIEWER_KEY) || getCookie(VIEWER_KEY);
        } catch {
            v = getCookie(VIEWER_KEY);
        }
        if (!v) {
            v = (typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
            try {
                localStorage.setItem(VIEWER_KEY, v);
            } catch {
                // ignore
            }
            setCookie(VIEWER_KEY, v, 365);
        }
        return v;
    } catch {
        return null;
    }
}

export function authHeaders(extra = {}) {
    const token = getStoredToken();
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
}

export async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body && !(options.body instanceof FormData)
                ? { "Content-Type": "application/json" }
                : {}),
            ...authHeaders(options.headers),
        },
    });
    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (!res.ok) {
        const message = data?.message || `Request failed (${res.status})`;
        throw new Error(message);
    }
    return data;
}

export function imageSrc(url) {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${API_URL}${url}`;
}

// Card thumbnail: explicit cover first, otherwise the first image in the content.
export function postThumb(post) {
    if (!post) return "";
    if (post.coverImage) return imageSrc(post.coverImage);
    const m = /<img[^>]+src=["']([^"']+)["']/i.exec(post.content || "");
    return m ? imageSrc(m[1]) : "";
}
