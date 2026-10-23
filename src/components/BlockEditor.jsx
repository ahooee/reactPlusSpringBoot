import { useState, useCallback, useRef, useEffect } from "react";
import { API_URL, authHeaders, imageSrc } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import "./BlockEditor.css";

const BLOCK_TYPES = [
    { type: "richtext", label: { en: "Rich Text", fa: "متن قالب‌بندی‌شده" }, icon: "✎", description: { en: "Formatted text with headings, lists, links", fa: "متن با تیترها، لیست‌ها، پیوندها" } },
    { type: "hero", label: { en: "Hero Section", fa: "بخش геро" }, icon: "🎯", description: { en: "Large headline with subtext and CTA buttons", fa: "تیتر بزرگ با متن و دکمه‌های اقدام" } },
    { type: "features", label: { en: "Feature Grid", fa: "شبکه ویژگی‌ها" }, icon: "✦", description: { en: "Grid of feature cards with icons", fa: "شبکه کارت‌های ویژگی با آیکون" } },
    { type: "stats", label: { en: "Stats Counter", fa: "شمارنده آمار" }, icon: "📊", description: { en: "Numbered statistics with labels", fa: "آمار عددی با برچسب‌ها" } },
    { type: "timeline", label: { en: "Timeline", fa: "زمان‌بندی" }, icon: "📅", description: { en: "Chronological story panels", fa: "پنل‌های داستانی زمان‌دار" } },
    { type: "media", label: { en: "Image / Media", fa: "تصویر / رسانه" }, icon: "🖼", description: { en: "Single image, gallery, or video embed", fa: "تصویر منفرد، گالری، یا ویدیو" } },
    { type: "cta", label: { en: "Call to Action", fa: "دعوت به اقدام" }, icon: "🔘", description: { en: "Prominent action button section", fa: "بخش دکمه اقدام برجسته" } },
    { type: "quote", label: { en: "Quote / Testimonial", fa: "نقل‌قول / نظر" }, icon: "💬", description: { en: "Styled quotation with author", fa: "نقل‌قول قالب‌بندی‌شده با نویسنده" } },
    { type: "columns", label: { en: "Columns Layout", fa: "چیدمان ستونی" }, icon: "⧉", description: { en: "Multi-column content layout", fa: "چیدمان محتوای چندستونی" } },
    { type: "html", label: { en: "Custom HTML", fa: "HTML سفارشی" }, icon: "</>", description: { en: "Raw HTML for advanced use", fa: "HTML خام برای کاربری پیشرفته" } },
];

const DEFAULT_BLOCKS = {
    richtext: { type: "richtext", content: "" },
    hero: { type: "hero", title: "", subtitle: "", ctaText: "", ctaUrl: "", backgroundImage: "", alignment: "center" },
    features: { type: "features", columns: 3, items: [{ icon: "", title: "", description: "" }, { icon: "", title: "", description: "" }, { icon: "", title: "", description: "" }] },
    stats: { type: "stats", items: [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }] },
    timeline: { type: "timeline", items: [{ year: "", title: "", description: "" }, { year: "", title: "", description: "" }, { year: "", title: "", description: "" }, { year: "", title: "", description: "" }] },
    media: { type: "media", mediaType: "image", src: "", alt: "", caption: "", width: "full" },
    cta: { type: "cta", title: "", description: "", buttonText: "", buttonUrl: "", style: "primary" },
    quote: { type: "quote", text: "", author: "", role: "", avatar: "" },
    columns: { type: "columns", count: 2, columns: [{ content: "" }, { content: "" }] },
    html: { type: "html", content: "" },
};

export default function BlockEditor({ value, onChange, readOnly = false }) {
    const { t } = useLanguage();
    const [blocks, setBlocks] = useState(() => {
        try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
        } catch {
            return [];
        }
    });
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [showBlockPicker, setShowBlockPicker] = useState(false);
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const editorRefs = useRef([]);

    useEffect(() => {
        if (value !== undefined) {
            try {
                const parsed = typeof value === "string" ? JSON.parse(value) : value;
                if (Array.isArray(parsed)) {
                    setBlocks(parsed);
                }
            } catch {
                // ignore
            }
        }
    }, [value]);

    const emit = useCallback(() => {
        onChange?.(JSON.stringify(blocks, null, 2));
    }, [blocks, onChange]);

    const addBlock = (type, index = null) => {
        const newBlock = { ...DEFAULT_BLOCKS[type], id: Date.now().toString() };
        setBlocks(prev => {
            const next = [...prev];
            const insertAt = index !== null ? index + 1 : next.length;
            next.splice(insertAt, 0, newBlock);
            return next;
        });
        setShowBlockPicker(false);
        emit();
    };

    const removeBlock = (index) => {
        setBlocks(prev => prev.filter((_, i) => i !== index));
        if (selectedIndex === index) setSelectedIndex(null);
        else if (selectedIndex > index) setSelectedIndex(s => s - 1);
        emit();
    };

    const duplicateBlock = (index) => {
        const block = { ...blocks[index], id: Date.now().toString() };
        setBlocks(prev => {
            const next = [...prev];
            next.splice(index + 1, 0, block);
            return next;
        });
        emit();
    };

    const moveBlock = (fromIndex, toIndex) => {
        setBlocks(prev => {
            const next = [...prev];
            const [removed] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, removed);
            return next;
        });
        emit();
    };

    const updateBlock = (index, updates) => {
        setBlocks(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
        emit();
    };

    const updateNestedBlock = (blockIndex, path, value) => {
        setBlocks(prev => {
            const next = [...prev];
            const block = { ...next[blockIndex] };
            let target = block;
            for (let i = 0; i < path.length - 1; i++) {
                target = target[path[i]] = { ...target[path[i]] };
            }
            target[path[path.length - 1]] = value;
            next[blockIndex] = block;
            return next;
        });
        emit();
    };

    const handleDragStart = (e, index) => {
        setDraggingIndex(index);
        setDropTarget(null);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, targetIndex) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggingIndex !== null && draggingIndex !== targetIndex) {
            setDropTarget(targetIndex);
        }
    };

    const handleDragLeave = () => setDropTarget(null);

    const handleDrop = (e) => {
        e.preventDefault();
        if (draggingIndex !== null && dropTarget !== null && dropTarget !== draggingIndex) {
            moveBlock(draggingIndex, dropTarget);
        }
        setDraggingIndex(null);
        setDropTarget(null);
    };

    const handleDragEnd = () => {
        setDraggingIndex(null);
        setDropTarget(null);
    };

    const renderBlock = (block, index) => {
        const isSelected = selectedIndex === index;
        const isDragging = draggingIndex === index;
        const isDropTarget = dropTarget === index;
        const blockDef = BLOCK_TYPES.find(b => b.type === block.type);
        const label = blockDef?.label[t.lang === "fa" ? "fa" : "en"] || block.type;

        return (
            <>
                {isDropTarget && (
                    <div className="drop-zone" onDragOver={e => handleDragOver(e, index)} onDrop={handleDrop} onDragLeave={handleDragLeave} />
                )}
                <div
                    key={block.id || index}
                    className={`block-wrapper ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""} ${isDropTarget ? "drop-target" : ""}`}
                    draggable={!readOnly}
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onDragLeave={handleDragLeave}
                    onClick={() => !readOnly && setSelectedIndex(index)}
                >
                    {!readOnly && (
                        <div className="block-handle" onClick={e => { e.stopPropagation(); setSelectedIndex(index); }}>
                            <span className="drag-handle" title={t("editor.dragToReorder") || "Drag to reorder"}>⋮⋮</span>
                            <div className="block-actions">
                                <button type="button" className="icon-btn" onClick={e => { e.stopPropagation(); duplicateBlock(index); }} title={t("editor.duplicate") || "Duplicate"}>📋</button>
                                <button type="button" className="icon-btn danger" onClick={e => { e.stopPropagation(); removeBlock(index); }} title={t("editor.delete") || "Delete"}>🗑</button>
                            </div>
                        </div>
                    )}
                    <div className="block-content" ref={el => editorRefs.current[index] = el}>
                        <BlockRenderer
                            block={block}
                            index={index}
                            selected={isSelected}
                            readOnly={readOnly}
                            onUpdate={updateBlock}
                            onUpdateNested={updateNestedBlock}
                            t={t}
                        />
                    </div>
                    {!readOnly && (
                        <div className="block-type-badge">{label}</div>
                    )}
                </div>
            </>
        );
    };

    if (blocks.length === 0) {
        return (
            <div className="block-editor empty" onClick={() => setShowBlockPicker(true)}>
                <div className="empty-state">
                    <span className="empty-icon">📄</span>
                    <p>{t("editor.emptyState") || "Click to add your first block"}</p>
                    <button type="button" className="btn" onClick={e => { e.stopPropagation(); setShowBlockPicker(true); }}>
                        {t("editor.addBlock") || "+ Add Block"}
                    </button>
                </div>
                {showBlockPicker && <BlockPicker onAdd={addBlock} onClose={() => setShowBlockPicker(false)} t={t} />}
            </div>
        );
    }

    return (
        <div className="block-editor">
            <div className="blocks-container">
                {blocks.map(renderBlock)}
                {dropTarget === blocks.length && (
                    <div className="drop-zone" onDragOver={e => handleDragOver(e, blocks.length)} onDrop={handleDrop} onDragLeave={handleDragLeave} />
                )}
                {!readOnly && (
                    <div className="add-block-zone" onClick={() => setShowBlockPicker(true)}>
                        <span>+</span>
                        <span>{t("editor.addBlock") || "Add Block"}</span>
                    </div>
                )}
            </div>
            {showBlockPicker && <BlockPicker onAdd={addBlock} onClose={() => setShowBlockPicker(false)} t={t} />}
        </div>
    );
}

function BlockPicker({ onAdd, onClose, t }) {
    return (
        <div className="block-picker-overlay" onClick={onClose}>
            <div className="block-picker" onClick={e => e.stopPropagation()}>
                <h3>{t("editor.chooseBlock") || "Choose a block"}</h3>
                <div className="block-categories">
                    {BLOCK_TYPES.map(bt => (
                        <button
                            key={bt.type}
                            type="button"
                            className="block-option"
                            onClick={() => onAdd(bt.type)}
                        >
                            <span className="block-option-icon">{bt.icon}</span>
                            <div className="block-option-info">
                                <span className="block-option-label">{bt.label[t.lang === "fa" ? "fa" : "en"]}</span>
                                <span className="block-option-desc">{bt.description[t.lang === "fa" ? "fa" : "en"]}</span>
                            </div>
                        </button>
                    ))}
                </div>
                <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel") || "Cancel"}</button>
            </div>
        </div>
    );
}

function BlockRenderer({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e, field = "src") => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${API_URL}/api/media/upload`, {
                method: "POST",
                headers: { ...authHeaders() },
                body: fd,
            });
            if (!res.ok) throw new Error("Upload failed");
            const saved = await res.json();
            onUpdateNested(index, [field], imageSrc(saved.url));
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };

    switch (block.type) {
        case "richtext":
            return <RichTextBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "hero":
            return <HeroBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} handleImageUpload={handleImageUpload} uploading={uploading} t={t} />;

        case "features":
            return <FeaturesBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "stats":
            return <StatsBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "timeline":
            return <TimelineBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "media":
            return <MediaBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} handleImageUpload={handleImageUpload} uploading={uploading} t={t} />;

        case "cta":
            return <CTABlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "quote":
            return <QuoteBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "columns":
            return <ColumnsBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        case "html":
            return <HTMLBlock block={block} index={index} selected={selected} readOnly={readOnly} onUpdate={onUpdate} onUpdateNested={onUpdateNested} t={t} />;

        default:
            return <div className="unknown-block">Unknown block type: {block.type}</div>;
    }
}

function RichTextBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    const editorRef = useRef(null);
    const savedRange = useRef(null);
    const isFocusedRef = useRef(false);

    const saveSelection = () => {
        try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                    savedRange.current = range.cloneRange();
                }
            }
        } catch { }
    };

    const restoreSelection = () => {
        try {
            editorRef.current?.focus({ preventScroll: true });
            const sel = window.getSelection();
            if (savedRange.current && sel) {
                sel.removeAllRanges();
                sel.addRange(savedRange.current);
            }
        } catch { }
    };

    // Sync external content changes into the DOM, but never while the user is typing
    // (otherwise React clobbers the caret mid-keystroke).
    useEffect(() => {
        const el = editorRef.current;
        if (!el || isFocusedRef.current) return;
        const next = block.content || "";
        if (el.innerHTML !== next) {
            el.innerHTML = next;
        }
    }, [block.content]);

    const emit = () => {
        if (editorRef.current) {
            onUpdate(index, { content: editorRef.current.innerHTML });
            saveSelection();
        }
    };

    const exec = (cmd, val = null) => {
        restoreSelection();
        document.execCommand("styleWithCSS", false, true);
        document.execCommand(cmd, false, val);
        emit();
    };

    const addLink = () => {
        restoreSelection();
        const url = window.prompt(t("editor.linkPrompt") || "Link URL:", "https://");
        if (!url) return;
        restoreSelection();
        document.execCommand("createLink", false, url);
        emit();
    };

    const addImageUrl = () => {
        restoreSelection();
        const url = window.prompt(t("editor.imagePrompt") || "Image URL:", "https://");
        if (!url) return;
        restoreSelection();
        document.execCommand("insertImage", false, url);
        emit();
    };

    return (
        <div className="block-richtext">
            {!readOnly && (
                <div className="rte-toolbar" onMouseDownCapture={saveSelection}>
                    <span className="rte-group">
                        <button type="button" title={t("editor.bold")} onMouseDown={e => e.preventDefault()} onClick={() => exec("bold")}><b>B</b></button>
                        <button type="button" title={t("editor.italic")} onMouseDown={e => e.preventDefault()} onClick={() => exec("italic")}><i>I</i></button>
                        <button type="button" title={t("editor.underline")} onMouseDown={e => e.preventDefault()} onClick={() => exec("underline")}><u>U</u></button>
                        <button type="button" title={t("editor.strike")} onMouseDown={e => e.preventDefault()} onClick={() => exec("strikeThrough")}>S</button>
                    </span>
                    <span className="rte-group">
                        <select title={t("editor.block")} value="" onChange={e => { if (e.target.value) exec("formatBlock", e.target.value); e.target.value = ""; }}>
                            <option value="">{t("editor.block")}</option>
                            <option value="p">{t("editor.p")}</option>
                            <option value="h2">{t("editor.h2")}</option>
                            <option value="h3">{t("editor.h3")}</option>
                            <option value="blockquote">{t("editor.quote")}</option>
                        </select>
                    </span>
                    <span className="rte-group">
                        <button type="button" title={t("editor.alignLeft")} onMouseDown={e => e.preventDefault()} onClick={() => exec("justifyLeft")}>☰←</button>
                        <button type="button" title={t("editor.alignCenter")} onMouseDown={e => e.preventDefault()} onClick={() => exec("justifyCenter")}>☰</button>
                        <button type="button" title={t("editor.alignRight")} onMouseDown={e => e.preventDefault()} onClick={() => exec("justifyRight")}>→☰</button>
                        <button type="button" title={t("editor.bullets")} onMouseDown={e => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>•☰</button>
                        <button type="button" title={t("editor.numbering")} onMouseDown={e => e.preventDefault()} onClick={() => exec("insertOrderedList")}>1.☰</button>
                    </span>
                    <span className="rte-group">
                        <button type="button" title={t("editor.link")} onMouseDown={e => e.preventDefault()} onClick={addLink}>🔗</button>
                        <button type="button" title={t("editor.unlink")} onMouseDown={e => e.preventDefault()} onClick={() => exec("unlink")}>⛔🔗</button>
                        <button type="button" title={t("editor.image")} onMouseDown={e => e.preventDefault()} onClick={addImageUrl}>🖼</button>
                        <button type="button" title={t("editor.clear")} onMouseDown={e => e.preventDefault()} onClick={() => exec("removeFormat")}>⌫</button>
                    </span>
                </div>
            )}
            <div
                ref={editorRef}
                className="rte-canvas prose"
                contentEditable={!readOnly}
                suppressContentEditableWarning
                dir="auto"
                data-placeholder={t("editor.placeholder") || "Write content here…"}
                onInput={emit}
                onKeyUp={saveSelection}
                onMouseUp={saveSelection}
                onFocus={() => { isFocusedRef.current = true; }}
                onBlur={() => { isFocusedRef.current = false; }}
            />
        </div>
    );
}

function HeroBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, handleImageUpload, uploading, t }) {
    return (
        <div className="block-hero preview">
            <div className="field-row">
                <label>
                    <span>{t("editor.hero.title") || "Headline"}</span>
                    <input
                        value={block.title || ""}
                        onChange={e => onUpdate(index, { title: e.target.value })}
                        placeholder={t("editor.hero.titlePlaceholder") || "Main headline"}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.hero.subtitle") || "Subtitle"}</span>
                    <textarea
                        value={block.subtitle || ""}
                        onChange={e => onUpdate(index, { subtitle: e.target.value })}
                        placeholder={t("editor.hero.subtitlePlaceholder") || "Supporting text"}
                        rows={3}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row two-col">
                <label>
                    <span>{t("editor.hero.ctaText") || "Button Text"}</span>
                    <input
                        value={block.ctaText || ""}
                        onChange={e => onUpdate(index, { ctaText: e.target.value })}
                        placeholder={t("editor.hero.ctaTextPlaceholder") || "Get Started"}
                        disabled={readOnly}
                    />
                </label>
                <label>
                    <span>{t("editor.hero.ctaUrl") || "Button URL"}</span>
                    <input
                        value={block.ctaUrl || ""}
                        onChange={e => onUpdate(index, { ctaUrl: e.target.value })}
                        placeholder="/shop or https://..."
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.hero.alignment") || "Alignment"}</span>
                    <select
                        value={block.alignment || "center"}
                        onChange={e => onUpdate(index, { alignment: e.target.value })}
                        disabled={readOnly}
                    >
                        <option value="left">{t("editor.alignLeft") || "Left"}</option>
                        <option value="center">{t("editor.alignCenter") || "Center"}</option>
                        <option value="right">{t("editor.alignRight") || "Right"}</option>
                    </select>
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.hero.backgroundImage") || "Background Image"}</span>
                    <div className="image-upload">
                        {block.backgroundImage && (
                            <div className="image-preview">
                                <img src={imageSrc(block.backgroundImage)} alt="" />
                                <button type="button" className="remove-btn" onClick={e => { e.stopPropagation(); onUpdate(index, { backgroundImage: "" }); }} disabled={readOnly}>✕</button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={e => handleImageUpload(e, "backgroundImage")}
                            disabled={readOnly || uploading}
                            ref={el => el && !readOnly && (window.heroBgInput = el)}
                        />
                        <button type="button" className="btn secondary" onClick={() => !readOnly && window.heroBgInput?.click()} disabled={readOnly || uploading}>
                            {uploading ? "⏳" : block.backgroundImage ? (t("editor.change") || "Change") : (t("editor.upload") || "Upload")}
                        </button>
                        <input
                            type="text"
                            value={block.backgroundImage || ""}
                            onChange={e => onUpdate(index, { backgroundImage: e.target.value })}
                            placeholder="/uploads/... or https://..."
                            className="url-input"
                            disabled={readOnly}
                        />
                    </div>
                </label>
            </div>
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className={`hero-preview align-${block.alignment || "center"}`} style={{ backgroundImage: block.backgroundImage ? `url(${imageSrc(block.backgroundImage)})` : "none" }}>
                <div className="hero-content">
                    {block.title && <h1>{block.title}</h1>}
                    {block.subtitle && <p>{block.subtitle}</p>}
                    {block.ctaText && block.ctaUrl && (
                        <a href={block.ctaUrl} className="btn-primary">{block.ctaText}</a>
                    )}
                </div>
            </div>
        </div>
    );
}

function FeaturesBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-features">
            <div className="field-row">
                <label>
                    <span>{t("editor.features.columns") || "Columns"}</span>
                    <select
                        value={block.columns || 3}
                        onChange={e => onUpdate(index, { columns: parseInt(e.target.value) })}
                        disabled={readOnly}
                    >
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                    </select>
                </label>
            </div>
            <div className="features-list">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="feature-item">
                        <div className="field-row three-col">
                            <label>
                                <span>{t("editor.features.icon") || "Icon"}</span>
                                <input
                                    value={item.icon || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "icon"], e.target.value)}
                                    placeholder="✦ or emoji"
                                    disabled={readOnly}
                                />
                            </label>
                            <label>
                                <span>{t("editor.features.title") || "Title"}</span>
                                <input
                                    value={item.title || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "title"], e.target.value)}
                                    placeholder={t("editor.features.titlePlaceholder") || "Feature title"}
                                    disabled={readOnly}
                                />
                            </label>
                            <label>
                                <span>{t("editor.features.description") || "Description"}</span>
                                <input
                                    value={item.description || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "description"], e.target.value)}
                                    placeholder={t("editor.features.descPlaceholder") || "Feature description"}
                                    disabled={readOnly}
                                />
                            </label>
                        </div>
                        {!readOnly && (
                            <button type="button" className="icon-btn danger" onClick={() => {
                                onUpdate(index, { items: block.items.filter((_, j) => j !== i) });
                            }}>🗑</button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <button type="button" className="btn secondary small" onClick={() => {
                    onUpdate(index, { items: [...(block.items || []), { icon: "", title: "", description: "" }] });
                }}>
                    {t("editor.addItem") || "+ Add Feature"}
                </button>
            )}
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className={`features-preview cols-${block.columns || 3}`}>
                {(block.items || []).map((item, i) => (
                    <div key={i} className="feature-card">
                        {item.icon && <span className="feature-icon">{item.icon}</span>}
                        {item.title && <h4>{item.title}</h4>}
                        {item.description && <p>{item.description}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatsBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-stats">
            <div className="stats-list">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="stat-item">
                        <div className="field-row two-col">
                            <label>
                                <span>{t("editor.stats.value") || "Value"}</span>
                                <input
                                    value={item.value || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "value"], e.target.value)}
                                    placeholder="200,000+"
                                    disabled={readOnly}
                                />
                            </label>
                            <label>
                                <span>{t("editor.stats.label") || "Label"}</span>
                                <input
                                    value={item.label || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "label"], e.target.value)}
                                    placeholder={t("editor.stats.labelPlaceholder") || "Books"}
                                    disabled={readOnly}
                                />
                            </label>
                        </div>
                        {!readOnly && (
                            <button type="button" className="icon-btn danger" onClick={() => {
                                onUpdate(index, { items: block.items.filter((_, j) => j !== i) });
                            }}>🗑</button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <button type="button" className="btn secondary small" onClick={() => {
                    onUpdate(index, { items: [...(block.items || []), { value: "", label: "" }] });
                }}>
                    {t("editor.addItem") || "+ Add Stat"}
                </button>
            )}
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className="stats-preview">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="stat-card">
                        <span className="stat-value">{item.value}</span>
                        <span className="stat-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TimelineBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-timeline">
            <div className="timeline-list">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="timeline-item">
                        <div className="field-row three-col">
                            <label>
                                <span>{t("editor.timeline.year") || "Year"}</span>
                                <input
                                    value={item.year || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "year"], e.target.value)}
                                    placeholder="1395"
                                    disabled={readOnly}
                                />
                            </label>
                            <label>
                                <span>{t("editor.timeline.title") || "Title"}</span>
                                <input
                                    value={item.title || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "title"], e.target.value)}
                                    placeholder={t("editor.timeline.titlePlaceholder") || "Milestone title"}
                                    disabled={readOnly}
                                />
                            </label>
                            <label>
                                <span>{t("editor.timeline.description") || "Description"}</span>
                                <input
                                    value={item.description || ""}
                                    onChange={e => onUpdateNested(index, ["items", i, "description"], e.target.value)}
                                    placeholder={t("editor.timeline.descPlaceholder") || "What happened"}
                                    disabled={readOnly}
                                />
                            </label>
                        </div>
                        {!readOnly && (
                            <button type="button" className="icon-btn danger" onClick={() => {
                                onUpdate(index, { items: block.items.filter((_, j) => j !== i) });
                            }}>🗑</button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <button type="button" className="btn secondary small" onClick={() => {
                    onUpdate(index, { items: [...(block.items || []), { year: "", title: "", description: "" }] });
                }}>
                    {t("editor.addItem") || "+ Add Timeline Item"}
                </button>
            )}
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className="timeline-preview">
                {(block.items || []).map((item, i) => (
                    <div key={i} className="timeline-card">
                        <span className="timeline-year">{item.year}</span>
                        <div className="timeline-content">
                            {item.title && <h4>{item.title}</h4>}
                            {item.description && <p>{item.description}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MediaBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, handleImageUpload, uploading, t }) {
    return (
        <div className="block-media">
            <div className="field-row">
                <label>
                    <span>{t("editor.media.type") || "Media Type"}</span>
                    <select
                        value={block.mediaType || "image"}
                        onChange={e => onUpdate(index, { mediaType: e.target.value })}
                        disabled={readOnly}
                    >
                        <option value="image">{t("editor.media.image") || "Image"}</option>
                        <option value="video">{t("editor.media.video") || "Video"}</option>
                        <option value="embed">{t("editor.media.embed") || "Embed (YouTube, etc.)"}</option>
                    </select>
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.media.src") || "Source URL"}</span>
                    <div className="image-upload">
                        {block.src && block.mediaType === "image" && (
                            <div className="image-preview">
                                <img src={imageSrc(block.src)} alt="" />
                                <button type="button" className="remove-btn" onClick={e => { e.stopPropagation(); onUpdate(index, { src: "" }); }} disabled={readOnly}>✕</button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*,video/*"
                            hidden
                            onChange={handleImageUpload}
                            disabled={readOnly || uploading || block.mediaType === "embed"}
                            ref={el => el && !readOnly && (window.mediaInput = el)}
                        />
                        <button type="button" className="btn secondary" onClick={() => !readOnly && block.mediaType !== "embed" && window.mediaInput?.click()} disabled={readOnly || uploading || block.mediaType === "embed"}>
                            {uploading ? "⏳" : block.src ? (t("editor.change") || "Change") : (t("editor.upload") || "Upload")}
                        </button>
                        <input
                            type="text"
                            value={block.src || ""}
                            onChange={e => onUpdate(index, { src: e.target.value })}
                            placeholder={block.mediaType === "embed" ? "https://youtube.com/..." : "/uploads/... or https://..."}
                            className="url-input"
                            disabled={readOnly}
                        />
                    </div>
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.media.alt") || "Alt Text"}</span>
                    <input
                        value={block.alt || ""}
                        onChange={e => onUpdate(index, { alt: e.target.value })}
                        placeholder={t("editor.media.altPlaceholder") || "Description for accessibility"}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.media.caption") || "Caption"}</span>
                    <input
                        value={block.caption || ""}
                        onChange={e => onUpdate(index, { caption: e.target.value })}
                        placeholder={t("editor.media.captionPlaceholder") || "Optional caption"}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.media.width") || "Width"}</span>
                    <select
                        value={block.width || "full"}
                        onChange={e => onUpdate(index, { width: e.target.value })}
                        disabled={readOnly}
                    >
                        <option value="full">{t("editor.media.full") || "Full Width"}</option>
                        <option value="wide">{t("editor.media.wide") || "Wide"}</option>
                        <option value="normal">{t("editor.media.normal") || "Normal"}</option>
                        <option value="narrow">{t("editor.media.narrow") || "Narrow"}</option>
                    </select>
                </label>
            </div>
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className={`media-preview width-${block.width || "full"}`}>
                {block.mediaType === "image" && block.src && (
                    <img src={imageSrc(block.src)} alt={block.alt || ""} />
                )}
                {block.mediaType === "video" && block.src && (
                    <video controls src={imageSrc(block.src)} />
                )}
                {block.mediaType === "embed" && block.src && (
                    <div className="embed-wrapper">
                        <iframe src={block.src} frameBorder="0" allowFullScreen></iframe>
                    </div>
                )}
                {block.caption && <figcaption>{block.caption}</figcaption>}
            </div>
        </div>
    );
}

function CTABlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-cta">
            <div className="field-row">
                <label>
                    <span>{t("editor.cta.title") || "Title"}</span>
                    <input
                        value={block.title || ""}
                        onChange={e => onUpdate(index, { title: e.target.value })}
                        placeholder={t("editor.cta.titlePlaceholder") || "Ready to get started?"}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.cta.description") || "Description"}</span>
                    <textarea
                        value={block.description || ""}
                        onChange={e => onUpdate(index, { description: e.target.value })}
                        placeholder={t("editor.cta.descPlaceholder") || "Join thousands of users..."}
                        rows={3}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row two-col">
                <label>
                    <span>{t("editor.cta.buttonText") || "Button Text"}</span>
                    <input
                        value={block.buttonText || ""}
                        onChange={e => onUpdate(index, { buttonText: e.target.value })}
                        placeholder={t("editor.cta.btnPlaceholder") || "Sign Up Now"}
                        disabled={readOnly}
                    />
                </label>
                <label>
                    <span>{t("editor.cta.buttonUrl") || "Button URL"}</span>
                    <input
                        value={block.buttonUrl || ""}
                        onChange={e => onUpdate(index, { buttonUrl: e.target.value })}
                        placeholder="/signup or https://..."
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.cta.style") || "Style"}</span>
                    <select
                        value={block.style || "primary"}
                        onChange={e => onUpdate(index, { style: e.target.value })}
                        disabled={readOnly}
                    >
                        <option value="primary">{t("editor.cta.primary") || "Primary"}</option>
                        <option value="secondary">{t("editor.cta.secondary") || "Secondary"}</option>
                        <option value="outline">{t("editor.cta.outline") || "Outline"}</option>
                    </select>
                </label>
            </div>
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className={`cta-preview style-${block.style || "primary"}`}>
                {block.title && <h3>{block.title}</h3>}
                {block.description && <p>{block.description}</p>}
                {block.buttonText && block.buttonUrl && (
                    <a href={block.buttonUrl} className={`btn-${block.style || "primary"}`}>{block.buttonText}</a>
                )}
            </div>
        </div>
    );
}

function QuoteBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-quote">
            <div className="field-row">
                <label>
                    <span>{t("editor.quote.text") || "Quote Text"}</span>
                    <textarea
                        value={block.text || ""}
                        onChange={e => onUpdate(index, { text: e.target.value })}
                        placeholder={t("editor.quote.textPlaceholder") || "\"Your quote here\""}
                        rows={4}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row two-col">
                <label>
                    <span>{t("editor.quote.author") || "Author"}</span>
                    <input
                        value={block.author || ""}
                        onChange={e => onUpdate(index, { author: e.target.value })}
                        placeholder={t("editor.quote.authorPlaceholder") || "Author Name"}
                        disabled={readOnly}
                    />
                </label>
                <label>
                    <span>{t("editor.quote.role") || "Role/Title"}</span>
                    <input
                        value={block.role || ""}
                        onChange={e => onUpdate(index, { role: e.target.value })}
                        placeholder={t("editor.quote.rolePlaceholder") || "CEO, Company"}
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="field-row">
                <label>
                    <span>{t("editor.quote.avatar") || "Avatar URL"}</span>
                    <input
                        value={block.avatar || ""}
                        onChange={e => onUpdate(index, { avatar: e.target.value })}
                        placeholder="/uploads/... or https://..."
                        disabled={readOnly}
                    />
                </label>
            </div>
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className="quote-preview">
                <blockquote>
                    <p>{block.text || t("editor.quote.textPlaceholder") || "\"Your quote here\""}</p>
                    {block.author && (
                        <footer>
                            {block.avatar && <img src={imageSrc(block.avatar)} alt="" className="quote-avatar" />}
                            <div>
                                <cite>{block.author}</cite>
                                {block.role && <span>{block.role}</span>}
                            </div>
                        </footer>
                    )}
                </blockquote>
            </div>
        </div>
    );
}

function ColumnsBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-columns">
            <div className="field-row">
                <label>
                    <span>{t("editor.columns.count") || "Columns"}</span>
                    <select
                        value={block.count || 2}
                        onChange={e => {
                            const count = parseInt(e.target.value);
                            const currentCols = block.columns || [];
                            const newCols = Array.from({ length: count }, (_, i) =>
                                currentCols[i] || { content: "" }
                            );
                            onUpdate(index, { count, columns: newCols });
                        }}
                        disabled={readOnly}
                    >
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                    </select>
                </label>
            </div>
            <div className="columns-editor">
                {(block.columns || []).map((col, i) => (
                    <div key={i} className="column-editor">
                        <label>
                            <span>{t("editor.columns.column") || "Column"} {i + 1}</span>
                            <div className="column-content" contentEditable={!readOnly} suppressContentEditableWarning
                                onInput={e => onUpdateNested(index, ["columns", i, "content"], e.target.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: col.content || "" }}
                            />
                        </label>
                    </div>
                ))}
            </div>
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className={`columns-preview cols-${block.count || 2}`}>
                {(block.columns || []).map((col, i) => (
                    <div key={i} className="column-preview" dangerouslySetInnerHTML={{ __html: col.content || "" }} />
                ))}
            </div>
        </div>
    );
}

function HTMLBlock({ block, index, selected, readOnly, onUpdate, onUpdateNested, t }) {
    return (
        <div className="block-html">
            <label className="full-width">
                <span>{t("editor.html.content") || "HTML Content"}</span>
                <textarea
                    value={block.content || ""}
                    onChange={e => onUpdate(index, { content: e.target.value })}
                    placeholder="<div>Your custom HTML</div>"
                    rows={10}
                    className="code-input"
                    disabled={readOnly}
                />
            </label>
            <div className="block-preview-label">{t("editor.preview") || "Preview"}</div>
            <div className="html-preview" dangerouslySetInnerHTML={{ __html: block.content || "" }} />
        </div>
    );
}