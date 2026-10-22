import { createContext, useContext, useEffect, useRef, useState } from "react";
import { STRINGS } from "../i18n/translations";
import { apiFetch } from "../lib/api";
import { getCookie, setCookie } from "../lib/cookies";

const LanguageContext = createContext(null);

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
        // ignore — cookie still persists
    }
}

function hasStoredLanguage() {
    return safeLsGet("language") != null || getCookie("language") != null;
}

function detectInitial() {
    const saved = safeLsGet("language") || getCookie("language");
    if (saved === "en" || saved === "fa") return saved;
    let browser = "en";
    try {
        browser = (navigator.language || "en").toLowerCase();
    } catch {
        // non-browser environment
    }
    return browser.startsWith("fa") ? "fa" : "en";
}

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(detectInitial);
    const [serverDefault, setServerDefault] = useState(null);
    // Captured before the persist effect writes, so first-time visitors
    // still receive the admin default while returning visitors keep theirs.
    const hadChoice = useRef(null);
    if (hadChoice.current === null) hadChoice.current = hasStoredLanguage();

    // Default comes from the admin-controlled site setting (defaultLanguage).
    // Only applied when the user has no explicit local choice.
    useEffect(() => {
        apiFetch("/api/settings")
            .then(data => {
                const d = data?.defaultLanguage;
                if (d === "en" || d === "fa") {
                    setServerDefault(d);
                    if (!hadChoice.current) {
                        setLangState(d);
                    }
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
        document.documentElement.dataset.lang = lang;
        safeLsSet("language", lang);
        setCookie("language", lang, 365);
    }, [lang ]);

    function setLang(next) {
        if (next === "en" || next === "fa") setLangState(next);
    }

    function t(key, params) {
        let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
        if (params && typeof s === "string") {
            for (const [k, v] of Object.entries(params)) {
                s = s.replaceAll(`{${k}}`, String(v));
            }
        }
        return s;
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, serverDefault }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
