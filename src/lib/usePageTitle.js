import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

export function siteNameOf(settings, lang) {
    if (lang === "fa") return settings?.siteNameFa || settings?.siteName || "My Store";
    return settings?.siteName || settings?.siteNameFa || "My Store";
}

// Sets document.title to "Page name | Site name" (or just the site name
// when no label is given). Site name follows the admin-controlled branding
// and the current language.
export function usePageTitle(label) {
    const { settings } = useTheme();
    const { lang } = useLanguage();
    const site = siteNameOf(settings, lang);

    useEffect(() => {
        document.title = label ? `${label} | ${site}` : site;
    }, [label, site]);
}
