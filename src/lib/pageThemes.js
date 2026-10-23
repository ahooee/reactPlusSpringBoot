/**
 * Page themes — WordPress-like theme system.
 * Each theme has an id, label, accent color and a CSS class applied to the
 * rendered page. The admin picks one when creating/editing a page.
 */
export const PAGE_THEMES = [
    {
        id: "default",
        label: { en: "Default", fa: "پیش‌فرض" },
        accent: "#aa3bff",
        cssClass: "theme-default",
        preview: "Clean, modern white canvas.",
    },
    {
        id: "modern",
        label: { en: "Modern", fa: "مدرن" },
        accent: "#0ea5e9",
        cssClass: "theme-modern",
        preview: "Bold accents with rounded cards.",
    },
    {
        id: "minimal",
        label: { en: "Minimal", fa: "مینیمال" },
        accent: "#6b7280",
        cssClass: "theme-minimal",
        preview: "Plenty of whitespace, light gray.",
    },
    {
        id: "bold",
        label: { en: "Bold", fa: "شیلد" },
        accent: "#dc2626",
        cssClass: "theme-bold",
        preview: "Dark canvas with vivid colors.",
    },
    {
        id: "elegant",
        label: { en: "Elegant", fa: "شیک" },
        accent: "#7c3aed",
        cssClass: "theme-elegant",
        preview: "Serif headings, muted palette.",
    },
    {
        id: "ocean",
        label: { en: "Ocean", fa: "اقیانوس" },
        accent: "#0d9488",
        cssClass: "theme-ocean",
        preview: "Cool blue-teal tones.",
    },
    {
        id: "sunset",
        label: { en: "Sunset", fa: "آفتاب‌غرب" },
        accent: "#f97316",
        cssClass: "theme-sunset",
        preview: "Warm orange gradient feel.",
    },
    {
        id: "forest",
        label: { en: "Forest", fa: " جنگل" },
        accent: "#16a34a",
        cssClass: "theme-forest",
        preview: "Green earthy tones.",
    },
    {
        id: "classic",
        label: { en: "Classic", fa: "کلاسیک" },
        accent: "#92400e",
        cssClass: "theme-classic",
        preview: "Newspaper-style serif layout.",
    },
    {
        id: "creative",
        label: { en: "Creative", fa: "خلاقانه" },
        accent: "#ec4899",
        cssClass: "theme-creative",
        preview: "Playful shapes and rounded corners.",
    },
];

export function getThemeById(id) {
    return PAGE_THEMES.find(t => t.id === id) || PAGE_THEMES[0];
}

export function getThemeLabel(theme, lang) {
    const t = getThemeById(theme);
    return t.label[lang === "fa" ? "fa" : "en"];
}
