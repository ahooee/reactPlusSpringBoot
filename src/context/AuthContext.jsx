import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../lib/api";
import { clearStoredToken, getStoredToken, storeToken } from "../lib/cookies";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => getStoredToken());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadMe() {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await fetch(`${API_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("invalid token");
                const me = await res.json();
                setUser(me);
            } catch {
                clearStoredToken();
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        }
        loadMe();
    }, [token]);

    async function login(username, password, remember = true) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, remember }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Login failed");
        applyAuth(data, data.remember !== false && remember);
        return data;
    }

    async function signup(username, password) {
        const res = await fetch(`${API_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Signup failed");
        applyAuth(data, true);
        return data;
    }

    function applyAuth(data, remember = true) {
        storeToken(data.token, remember, Number(data.expiresInSeconds) || undefined);
        setToken(data.token);
        setUser({ username: data.username, role: data.role });
    }

    function logout() {
        clearStoredToken();
        setToken(null);
        setUser(null);
    }

    const isAdmin = user?.role === "admin" || user?.roles?.some(r => r.includes("ADMIN"));

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, applyAuth, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
