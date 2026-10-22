import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { getCookie, setCookie } from "../lib/cookies";

const ThemeContext = createContext(null);

export const THEMES = [
    { id: "default", name: "Default", accent: "#aa3bff" },
    { id: "ocean", name: "Ocean", accent: "#0ea5e9" },
    { id: "sunset", name: "Sunset", accent: "#f97316" },
    { id: "forest", name: "Forest", accent: "#16a34a" },
];

const THEME_IDS = ["default", "ocean", "sunset", "forest"];

function safeLsGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeLsSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage unavailable — cookie still persists
    }
}

// A stored preference exists if it is in localStorage OR in a cookie.
function hasStored(key) {
    return safeLsGet(key) != null || getCookie(key) != null;
}

function initialMode() {
    const saved = safeLsGet("colorScheme") || getCookie("colorScheme");
    return saved === "dark" || saved === "light" ? saved : "light";
}

function initialTheme() {
    const saved = safeLsGet("theme") || getCookie("theme");
    return THEME_IDS.includes(saved) ? saved : "default";
}

export function ThemeProvider({ children }) {
    const [mode, setMode] = useState(initialMode);
    const [themeId, setThemeId] = useState(initialTheme);
    const [settings, setSettings] = useState({});
    // Snapshot of "did the user already have a choice before this mount?"
    // Must be captured before the persist effect below writes defaults,
    // otherwise the server fetch would never apply to first-time visitors.
    const hadModeChoice = useRef(null);
    const hadThemeChoice = useRef(null);
    if (hadModeChoice.current === null) hadModeChoice.current = hasStored("colorScheme");
    if (hadThemeChoice.current === null) hadThemeChoice.current = hasStored("theme");

    useEffect(() => {
        document.documentElement.dataset.mode = mode;
        document.documentElement.dataset.theme = themeId;
        safeLsSet("colorScheme", mode);
        safeLsSet("theme", themeId);
        setCookie("colorScheme", mode, 365);
        setCookie("theme", themeId, 365);
        const accent = THEMES.find(t => t.id === themeId)?.accent || "#aa3bff";
        document.documentElement.style.setProperty("--accent", accent);
    }, [mode, themeId]);

    // Server values are *defaults for first-time visitors*. A stored local
    // choice (localStorage or cookie) always wins, otherwise every reload
    // would reset the user's dark/light selection back to the admin default.
    useEffect(() => {
        apiFetch("/api/settings")
            .then(data => {
                setSettings(data || {});
                if ((data?.colorScheme === "dark" || data?.colorScheme === "light") && !hadModeChoice.current) {
                    setMode(data.colorScheme);
                }
                if (THEME_IDS.includes(data?.theme) && !hadThemeChoice.current) {
                    setThemeId(data.theme);
                }
                // Shop-wide display currency is admin-controlled and always wins.
                if (data?.currency === "TOMAN" || data?.currency === "IRR") {
                    try {
                        localStorage.setItem("currency", data.currency);
                    } catch {
                        // ignore
                    }
                }
            })
            .catch(() => {});
    }, []);

    function toggleMode() {
        setMode(m => (m === "light" ? "dark" : "light"));
    }

    return (
        <ThemeContext.Provider value={{ mode, setMode, toggleMode, themeId, setThemeId, settings, setSettings }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
