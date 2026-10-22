// Cookie-backed persistence. Auth tokens live here when "remember me" is on
// (5 days, matching the server's remember-me JWT); sessionStorage otherwise.

export const REMEMBER_DAYS = 5;
const TOKEN_COOKIE = "token";

function cookieAttrs(maxAgeSeconds) {
    let attrs = `Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
    try {
        if (typeof location !== "undefined" && location.protocol === "https:") {
            attrs += "; Secure";
        }
    } catch {
        // non-browser environment — omit Secure
    }
    return attrs;
}

export function setCookie(name, value, days = REMEMBER_DAYS) {
    try {
        const seconds = Math.max(0, Math.round(days * 86400));
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${cookieAttrs(seconds)}`;
    } catch {
        // storage unavailable — callers fall back to other stores
    }
}

export function getCookie(name) {
    try {
        const prefix = `${encodeURIComponent(name)}=`;
        for (const part of String(document.cookie || "").split(";")) {
            const c = part.trim();
            if (c.startsWith(prefix)) {
                return decodeURIComponent(c.slice(prefix.length));
            }
        }
    } catch {
        // ignore
    }
    return null;
}

export function eraseCookie(name) {
    try {
        let attrs = "Path=/; Max-Age=0; SameSite=Lax";
        try {
            if (typeof location !== "undefined" && location.protocol === "https:") {
                attrs += "; Secure";
            }
        } catch {
            // ignore
        }
        document.cookie = `${encodeURIComponent(name)}=; ${attrs}`;
    } catch {
        // ignore
    }
}

function lsGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** Token resolution order keeps old logins working: localStorage, cookie, session. */
export function getStoredToken() {
    return lsGet("token") || getCookie(TOKEN_COOKIE) || sessionGet("token");
}

function sessionGet(key) {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

export function storeToken(token, remember, maxAgeSeconds) {
    const seconds = Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
        ? Math.round(maxAgeSeconds)
        : REMEMBER_DAYS * 86400;
    try {
        sessionStorage.removeItem("token");
    } catch {
        // ignore
    }
    if (remember) {
        try {
            localStorage.setItem("token", token);
        } catch {
            // ignore
        }
        setCookie(TOKEN_COOKIE, token, seconds / 86400);
    } else {
        try {
            localStorage.removeItem("token");
        } catch {
            // ignore
        }
        eraseCookie(TOKEN_COOKIE);
        try {
            sessionStorage.setItem("token", token);
        } catch {
            // ignore
        }
    }
}

export function clearStoredToken() {
    try {
        localStorage.removeItem("token");
    } catch {
        // ignore
    }
    try {
        sessionStorage.removeItem("token");
    } catch {
        // ignore
    }
    eraseCookie(TOKEN_COOKIE);
}
