import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import "./PageBuilder.css";

const WIDGETS = [
    { id: "paragraph", label: { en: "Paragraph", fa: "متن" }, icon: "¶" },
    { id: "heading", label: { en: "Heading", fa: "تیتر" }, icon: "H" },
    { id: "image", label: { en: "Image", fa: "تصویر" }, icon: "🖼" },
    { id: "quote", label: { en: "Quote", fa: "نقل‌قول" }, icon: "💬" },
    { id: "columns", label: { en: "Columns", fa: "ستون‌ها" }, icon: "⧉" },
    { id: "spacer", label: { en: "Spacer", fa: "فاصله" }, icon: "⎯" },
    { id: "button", label: { en: "Button", fa: "دکمه" }, icon: "🔘" },
    { id: "html", label: { en: "HTML", fa: "HTML" }, icon: "</>" },
];

const DEFAULTS = {
    paragraph: { type: "paragraph", content: "", color: "#000000", bgColor: "", fontSize: "16px", align: "left", bold: false, italic: false, underline: false, highlight: "" },
    heading: { type: "heading", content: "Heading", level: 2, color: "#000000", align: "left", fontSize: "24px" },
    image: { type: "image", src: "", alt: "", caption: "", width: "100%", align: "center" },
    quote: { type: "quote", text: "", author: "", color: "#000000", align: "left" },
    columns: { type: "columns", count: 2, columns: [{ content: "" }, { content: "" }] },
    spacer: { type: "spacer", height: "20px" },
    button: { type: "button", text: "Button", url: "", color: "#ffffff", bgColor: "#aa3bff", align: "center" },
    html: { type: "html", content: "" },
};

export default function PageBuilder({ value, onChange }) {
    const { t } = useLanguage();
    const [widgets, setWidgets] = useState(() => {
        try {
            const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [showInserter, setShowInserter] = useState(false);
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);

    const selectedWidget = widgets[selectedIndex] ?? null;

    useEffect(() => {
        onChange?.(JSON.stringify(widgets, null, 2));
    }, [widgets, onChange]);

    const addWidget = useCallback((type, at = null) => {
        const widget = { ...DEFAULTS[type], id: Date.now().toString() };
        const pos = at !== null ? at : widgets.length;
        setWidgets(prev => {
            const next = [...prev];
            next.splice(pos, 0, widget);
            return next;
        });
        setSelectedIndex(pos);
        setShowInserter(false);
    }, [widgets]);

    const removeWidget = useCallback((index) => {
        setWidgets(prev => prev.filter((_, i) => i !== index));
        setSelectedIndex(null);
    }, []);

    const handleDragStart = (e, index) => {
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggingIndex !== null && draggingIndex !== index) setDropTarget(index);
    };

    const handleDragLeave = () => setDropTarget(null);

    const handleDrop = (e) => {
        e.preventDefault();
        if (draggingIndex !== null && dropTarget !== null && dropTarget !== draggingIndex) {
            setWidgets(prev => {
                const next = [...prev];
                const [removed] = next.splice(draggingIndex, 1);
                next.splice(dropTarget, 0, removed);
                return next;
            });
            setSelectedIndex(dropTarget);
        }
        setDraggingIndex(null);
        setDropTarget(null);
    };

    const handleDragEnd = () => { setDraggingIndex(null); setDropTarget(null); };

    return (
        <div className="pb-builder">
            <header className="pb-toolbar">
                <div className="pb-toolbar-left">
                    <h2 className="pb-title">{t("pages.title")}</h2>
                    <button type="button" className="pb-btn pb-btn-secondary" onClick={() => setShowInserter(true)}>
                        + {t("editor.addBlock") || "Add Widget"}
                    </button>
                </div>
                <div className="pb-toolbar-right">
                    <button type="button" className="pb-btn pb-btn-primary">{t("pages.save") || "Save"}</button>
                </div>
            </header>

            <div className="pb-body">
                <aside className="pb-sidebar pb-sidebar-nav">
                    <div className="pb-sidebar-header">
                        <span>{t("editor.widgets") || "Widgets"}</span>
                    </div>
                    <div className="pb-widget-list">
                        {widgets.length === 0 ? (
                            <div className="pb-empty">
                                <span className="pb-empty-icon">📄</span>
                                <p>{t("editor.emptyState") || "No widgets yet"}</p>
                            </div>
                        ) : (
                            widgets.map((widget, index) => (
                                <div
                                    key={widget.id || index}
                                    className={`pb-nav-item ${selectedIndex === index ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                                    draggable
                                    onDragStart={e => handleDragStart(e, index)}
                                    onDragOver={e => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => setSelectedIndex(index)}
                                >
                                    <span className="pb-nav-icon">{widget.type === "paragraph" ? "¶" : widget.type === "heading" ? "H" : widget.type === "image" ? "🖼" : widget.type === "quote" ? "💬" : "⧉"}</span>
                                    <span className="pb-nav-name">{widget.type}</span>
                                    <button type="button" className="pb-icon-btn pb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeWidget(index); }} title={t("editor.delete") || "Delete"}>✕</button>
                                </div>
                            ))
                        )}
                        {dropTarget === widgets.length && <div className="pb-drop-zone" />}
                    </div>
                </aside>

                <section className="pb-canvas">
                    <div className="pb-page">
                        <header className="pb-page-header"><h1>Page</h1></header>
                        <div className="pb-page-body">
                            {widgets.length === 0 ? (
                                <div className="pb-canvas-empty"><span>🧱</span><p>{t("editor.addBlockHint") || "Add a widget to start"}</p></div>
                            ) : (
                                widgets.map((widget, index) => (
                                    <div
                                        key={widget.id || index}
                                        className={`pb-widget ${selectedIndex === index ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                                        draggable
                                        onDragStart={e => handleDragStart(e, index)}
                                        onDragOver={e => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedIndex(index)}
                                    >
                                        <span className="pb-drag-handle">⋮⋮</span>
                                        <span className="pb-widget-type">{widget.type}</span>
                                        <button type="button" className="pb-icon-btn pb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeWidget(index); }} title={t("editor.delete") || "Delete"}>✕</button>
                                    </div>
                                ))
                            )}
                            {dropTarget === widgets.length && <div className="pb-drop-zone" />}
                        </div>
                    </div>
                </section>

                <aside className="pb-sidebar pb-sidebar-settings">
                    <div className="pb-sidebar-header">
                        <span>{selectedWidget ? t("editor.widgetSettings") || "Widget settings" : t("editor.selectWidget") || "Select a widget"}</span>
                        <button type="button" className="pb-icon-btn" onClick={() => setSelectedIndex(null)}>✕</button>
                    </div>
                    <div className="pb-settings-content">
                        {selectedWidget ? <div className="pb-setting-placeholder">{t("editor.settingsComing") || "Settings panel (coming next)"}</div> : <div className="pb-empty"><span>👆</span><p>{t("editor.clickWidget") || "Click a widget to edit"}</p></div>}
                    </div>
                </aside>
            </div>

            {showInserter && (
                <div className="pb-inserter-overlay" onClick={() => setShowInserter(false)}>
                    <div className="pb-inserter" onClick={e => e.stopPropagation()}>
                        <div className="pb-inserter-header">
                            <span>{t("editor.chooseWidget") || "Choose a widget"}</span>
                            <button type="button" className="pb-icon-btn" onClick={() => setShowInserter(false)}>✕</button>
                        </div>
                        <div className="pb-inserter-grid">
                            {WIDGETS.map(w => (
                                <button key={w.id} type="button" className="pb-inserter-item" onClick={() => addWidget(w.id)}>
                                    <span className="pb-inserter-icon">{w.icon}</span>
                                    <span>{w.label[t.lang === "fa" ? "fa" : "en"]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
