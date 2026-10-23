import { useState, useCallback, useRef, useEffect } from "react";
import { imageSrc } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import "./GutenbergEditor.css";

const BLOCKS = [
    { id: "paragraph", label: { en: "Paragraph", fa: "بخش متنی" }, icon: "¶" },
    { id: "heading", label: { en: "Heading", fa: "تیتر" }, icon: "H" },
    { id: "image", label: { en: "Image", fa: "تصویر" }, icon: "🖼" },
    { id: "quote", label: { en: "Quote", fa: "نقل‌قول" }, icon: "💬" },
    { id: "columns", label: { en: "Columns", fa: "ستونی" }, icon: "⧉" },
    { id: "spacer", label: { en: "Spacer", fa: "فاصله" }, icon: "⎯" },
    { id: "button", label: { en: "Button", fa: "دکمه" }, icon: "🔘" },
    { id: "html", label: { en: "HTML", fa: "HTML" }, icon: "</>" },
];

const DEFAULTS = {
    paragraph: { type: "paragraph", content: "", align: "left", fontSize: "medium" },
    heading: { type: "heading", content: "New Heading", level: 2, align: "left" },
    image: { type: "image", src: "", alt: "", caption: "", width: "full" },
    quote: { type: "quote", text: "", author: "", align: "left" },
    columns: { type: "columns", count: 2, columns: [{ content: "" }, { content: "" }] },
    spacer: { type: "spacer", height: "medium" },
    button: { type: "button", text: "Button", url: "", style: "primary", align: "center" },
    html: { type: "html", content: "" },
};

export default function GutenbergEditor({ value, onChange }) {
    const { t } = useLanguage();
    const [blocks, setBlocks] = useState(() => {
        try {
            const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [showInserter, setShowInserter] = useState(false);
    const [inserterPosition, setInserterPosition] = useState(null);
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [uploadingImageIndex, setUploadingImageIndex] = useState(null);

    const selectedBlock = blocks[selectedIndex] ?? null;

    useEffect(() => {
        onChange?.(JSON.stringify(blocks, null, 2));
    }, [blocks, onChange]);

    /* ---------- Block actions ---------- */
    const addBlock = useCallback((type, at = null) => {
        const newBlock = { ...DEFAULTS[type], id: Date.now().toString() };
        setBlocks(prev => {
            const next = [...prev];
            const pos = at !== null ? at : next.length;
            next.splice(pos, 0, newBlock);
            return next;
        });
        setSelectedIndex(at !== null ? at : blocks.length);
        setShowInserter(false);
        setInserterPosition(null);
    }, [blocks.length]);

    const removeBlock = useCallback((index) => {
        setBlocks(prev => prev.filter((_, i) => i !== index));
        setSelectedIndex(null);
    }, []);

    const moveBlock = useCallback((from, to) => {
        setBlocks(prev => {
            const next = [...prev];
            const [removed] = next.splice(from, 1);
            next.splice(to, 0, removed);
            return next;
        });
        setSelectedIndex(to);
    }, []);

    const updateBlock = useCallback((index, updates) => {
        setBlocks(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    }, []);

    const updateNested = useCallback((blockIndex, path, value) => {
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
    }, []);

    /* ---------- Drag & drop ---------- */
    const handleDragStart = (e, index) => {
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e, targetIndex) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggingIndex !== null && draggingIndex !== targetIndex) setDropTarget(targetIndex);
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
    const handleDragEnd = () => { setDraggingIndex(null); setDropTarget(null); };

    /* ---------- Image upload ---------- */
    const handleImageUpload = async (e, blockIndex) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploadingImageIndex(blockIndex);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${window.location.origin}/api/media/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
                body: fd,
            });
            if (!res.ok) throw new Error("Upload failed");
            const saved = await res.json();
            updateBlock(blockIndex, { src: saved.url || imageSrc(saved.url) });
        } catch (err) {
            alert(err.message);
        } finally {
            setUploadingImageIndex(null);
            setShowImageUpload(false);
        }
    };

    /* ---------- Rich text exec ---------- */
    const richEditorRef = useRef(null);
    const savedRange = useRef(null);

    const saveSelection = () => {
        try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (richEditorRef.current && richEditorRef.current.contains(range.commonAncestorContainer)) {
                    savedRange.current = range.cloneRange();
                }
            }
        } catch { /* ignore */ }
    };
    const restoreSelection = () => {
        try {
            richEditorRef.current?.focus({ preventScroll: true });
            const sel = window.getSelection();
            if (savedRange.current && sel) {
                sel.removeAllRanges();
                sel.addRange(savedRange.current);
            }
        } catch { /* ignore */ }
    };

    const execRich = (cmd, val = null) => {
        if (selectedIndex === null || blocks[selectedIndex].type !== "paragraph") return;
        restoreSelection();
        document.execCommand("styleWithCSS", false, true);
        document.execCommand(cmd, false, val);
        saveSelection();
        updateBlock(selectedIndex, { content: richEditorRef.current.innerHTML });
    };

    /* ---------- Renderers ---------- */
    const renderParagraph = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-paragraph ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); execRich("bold"); }}><b>B</b></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); execRich("italic"); }}><i>I</i></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); execRich("justifyLeft"); }}><span>☰←</span></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); execRich("justifyCenter"); }}><span>☰</span></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); execRich("justifyRight"); }}><span>→☰</span></button>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                        </>
                    )}
                </div>
                <div
                    ref={isSelected ? richEditorRef : null}
                    className="gb-richtext"
                    contentEditable={isSelected}
                    suppressContentEditableWarning
                    onInput={e => updateBlock(index, { content: e.target.innerHTML })}
                    onBlur={saveSelection}
                    dangerouslySetInnerHTML={{ __html: block.content || "" }}
                    style={{ textAlign: block.align }}
                />
            </div>
        );
    };

    const renderHeading = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-heading ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <select className="gb-select" value={block.level} onChange={e => updateBlock(index, { level: Number(e.target.value) })}>
                                <option value="2">H2</option><option value="1">H1</option><option value="3">H3</option>
                            </select>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); updateBlock(index, { align: "left" }); }}><span>☰←</span></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); updateBlock(index, { align: "center" }); }}><span>☰</span></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); updateBlock(index, { align: "right" }); }}><span>→☰</span></button>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                        </>
                    )}
                </div>
                <div
                    className="gb-heading-content"
                    contentEditable={isSelected}
                    suppressContentEditableWarning
                    onInput={e => updateBlock(index, { content: e.target.innerHTML })}
                    style={{ textAlign: block.align }}
                    dangerouslySetInnerHTML={{ __html: block.content || "" }}
                />
            </div>
        );
    };

    const renderImage = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-image ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <select className="gb-select" value={block.width} onChange={e => updateBlock(index, { width: e.target.value })}>
                                <option value="full">Full</option><option value="wide">Wide</option><option value="normal">Normal</option>
                            </select>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); setShowImageUpload(true); setUploadingImageIndex(index); }}>🖼</button>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                            {showImageUpload && uploadingImageIndex === index && (
                                <input type="file" accept="image/*" autoComplete="off" onChange={e => handleImageUpload(e, index)} style={{ display: "none" }} ref={el => el && el.click()} />
                            )}
                        </>
                    )}
                </div>
                <div className={`gb-image-wrap width-${block.width}`}>
                    {block.src ? (
                        <img src={imageSrc(block.src)} alt={block.alt || ""} />
                    ) : (
                        <div className="gb-image-placeholder">+ Image</div>
                    )}
                    {block.caption && <div className="gb-image-caption">{block.caption}</div>}
                </div>
            </div>
        );
    };

    const renderQuote = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-quote ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); updateBlock(index, { align: "left" }); }}><span>☰←</span></button>
                            <button type="button" className="gb-icon-btn" onClick={e => { e.stopPropagation(); updateBlock(index, { align: "center" }); }}><span>☰</span></button>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                        </>
                    )}
                </div>
                <blockquote style={{ textAlign: block.align }}>
                    <p>{block.text || ""}</p>
                    {block.author && <footer>{block.author}</footer>}
                </blockquote>
            </div>
        );
    };

    const renderColumns = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-columns ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <select className="gb-select" value={block.count} onChange={e => {
                                const count = Number(e.target.value);
                                const current = block.columns || [];
                                const cols = Array.from({ length: count }, (_, i) => current[i] || { content: "" });
                                updateBlock(index, { count, columns: cols });
                            }}>
                                <option value="2">2 Cols</option><option value="3">3 Cols</option><option value="4">4 Cols</option>
                            </select>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                        </>
                    )}
                </div>
                <div className={`gb-columns-wrap cols-${block.count}`}>
                    {(block.columns || []).map((col, i) => (
                        <div key={i} className="gb-column" contentEditable={isSelected} suppressContentEditableWarning
                            onInput={e => updateNested(index, ["columns", i, "content"], e.target.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: col.content || "" }}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const renderSpacer = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-spacer ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <select className="gb-select" value={block.height} onChange={e => updateBlock(index, { height: e.target.value })}>
                                <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                            </select>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                        </>
                    )}
                </div>
                <div className={`gb-spacer-content height-${block.height}`} />
            </div>
        );
    };

    const renderButton = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-button ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <>
                            <select className="gb-select" value={block.style} onChange={e => updateBlock(index, { style: e.target.value })}>
                                <option value="primary">Primary</option><option value="secondary">Secondary</option>
                            </select>
                            <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                        </>
                    )}
                </div>
                <a href={block.url || "#"} className={`gb-btn gb-btn-${block.style}`} style={{ textAlign: block.align, display: "inline-block" }}>
                    {block.text || "Button"}
                </a>
            </div>
        );
    };

    const renderHTML = (block, index) => {
        const isSelected = selectedIndex === index;
        return (
            <div
                className={`gb-block gb-html ${isSelected ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
            >
                <div className="gb-block-toolbar">
                    <span className="gb-drag-handle">⋮⋮</span>
                    {isSelected && (
                        <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }}>✕</button>
                    )}
                </div>
                <textarea
                    className="gb-html-input"
                    value={block.content || ""}
                    onChange={e => updateBlock(index, { content: e.target.value })}
                    disabled={!isSelected}
                    rows={6}
                />
                {isSelected && <div className="gb-html-preview" dangerouslySetInnerHTML={{ __html: block.content || "" }} />}
            </div>
        );
    };

    const renderBlock = (block, index) => {
        switch (block.type) {
            case "paragraph": return renderParagraph(block, index);
            case "heading": return renderHeading(block, index);
            case "image": return renderImage(block, index);
            case "quote": return renderQuote(block, index);
            case "columns": return renderColumns(block, index);
            case "spacer": return renderSpacer(block, index);
            case "button": return renderButton(block, index);
            case "html": return renderHTML(block, index);
            default: return <div className="gb-block gb-unknown">Unknown block: {block.type}</div>;
        }
    };

    /* ---------- Block settings sidebar ---------- */
    const renderSettings = () => {
        if (!selectedBlock) return null;
        switch (selectedBlock.type) {
            case "paragraph":
                return (
                    <div className="gb-setting-section">
                        <label>{t("editor.align") || "Alignment"}</label>
                        <select className="gb-select" value={selectedBlock.align} onChange={e => updateBlock(selectedIndex, { align: e.target.value })}>
                            <option value="left">{t("editor.alignLeft")}</option>
                            <option value="center">{t("editor.alignCenter")}</option>
                            <option value="right">{t("editor.alignRight")}</option>
                        </select>
                    </div>
                );
            case "heading":
                return (
                    <div className="gb-setting-section">
                        <label>{t("editor.headingLevel") || "Heading level"}</label>
                        <select className="gb-select" value={selectedBlock.level} onChange={e => updateBlock(selectedIndex, { level: Number(e.target.value) })}>
                            <option value="1">H1</option><option value="2">H2</option><option value="3">H3</option>
                        </select>
                    </div>
                );
            case "image":
                return (
                    <div className="gb-setting-section">
                        <label>{t("editor.imageAlt") || "Alt text"}</label>
                        <input className="gb-input" value={selectedBlock.alt || ""} onChange={e => updateBlock(selectedIndex, { alt: e.target.value })} />
                        <label style={{ marginTop: 12 }}>{t("editor.imageCaption") || "Caption"}</label>
                        <input className="gb-input" value={selectedBlock.caption || ""} onChange={e => updateBlock(selectedIndex, { caption: e.target.value })} />
                    </div>
                );
            case "button":
                return (
                    <div className="gb-setting-section">
                        <label>{t("editor.buttonText") || "Button text"}</label>
                        <input className="gb-input" value={selectedBlock.text || ""} onChange={e => updateBlock(selectedIndex, { text: e.target.value })} />
                        <label style={{ marginTop: 12 }}>{t("editor.buttonUrl") || "Button URL"}</label>
                        <input className="gb-input" value={selectedBlock.url || ""} onChange={e => updateBlock(selectedIndex, { url: e.target.value })} />
                    </div>
                );
            case "columns":
                return (
                    <div className="gb-setting-section">
                        <label>{t("editor.columns") || "Column count"}</label>
                        <select className="gb-select" value={selectedBlock.count} onChange={e => {
                            const count = Number(e.target.value);
                            const current = selectedBlock.columns || [];
                            const cols = Array.from({ length: count }, (_, i) => current[i] || { content: "" });
                            updateBlock(selectedIndex, { count, columns: cols });
                        }}>
                            <option value="2">2</option><option value="3">3</option><option value="4">4</option>
                        </select>
                    </div>
                );
            default:
                return <div>{t("editor.noSettings") || "No settings for this block"}</div>;
        }
    };

    /* ---------- Block inserter ---------- */
    const renderInserter = () => {
        if (!showInserter) return null;
        return (
            <div className="gb-inserter-overlay" onClick={() => setShowInserter(false)}>
                <div className="gb-inserter" onClick={e => e.stopPropagation()}>
                    <div className="gb-inserter-header">
                        <span>{t("editor.addBlock") || "Add block"}</span>
                        <button type="button" className="gb-icon-btn" onClick={() => setShowInserter(false)}>✕</button>
                    </div>
                    <div className="gb-inserter-list">
                        {BLOCKS.map(b => (
                            <button
                                key={b.id}
                                type="button"
                                className="gb-inserter-item"
                                onClick={e => {
                                    e.stopPropagation();
                                    addBlock(b.id, inserterPosition !== null ? inserterPosition : blocks.length);
                                }}
                            >
                                <span className="gb-inserter-icon">{b.icon}</span>
                                <span>{b.label[t.lang === "fa" ? "fa" : "en"]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="gutenberg-editor">
            {renderInserter()}

            {/* Top toolbar */}
            <header className="gb-toolbar">
                <div className="gb-toolbar-left">
                    <h2 className="gb-editor-title">{t("pages.title")}</h2>
                    <button type="button" className="gb-btn gb-btn-secondary" onClick={() => setShowInserter(true)}>
                        + {t("editor.addBlock") || "Add Block"}
                    </button>
                </div>
                <div className="gb-toolbar-right">
                    <button type="button" className="gb-btn gb-btn-primary" onClick={() => { /* save handled by form */ }}>
                        {t("pages.save") || "Save"}
                    </button>
                </div>
            </header>

            <div className="gb-body">
                {/* Left: block list / navigator */}
                <aside className="gb-sidebar gb-sidebar-nav">
                    <div className="gb-sidebar-header">
                        <span>{t("editor.blocks") || "Blocks"}</span>
                    </div>
                    <div className="gb-block-list">
                        {blocks.length === 0 ? (
                            <div className="gb-empty">
                                <span className="gb-empty-icon">📄</span>
                                <p>{t("editor.emptyState") || "No blocks yet. Click + Add Block to start."}</p>
                            </div>
                        ) : (
                            blocks.map((block, index) => (
                                <div
                                    key={block.id || index}
                                    className={`gb-nav-item ${selectedIndex === index ? "selected" : ""} ${draggingIndex === index ? "dragging" : ""} ${dropTarget === index ? "drop-target" : ""}`}
                                    draggable
                                    onDragStart={e => handleDragStart(e, index)}
                                    onDragOver={e => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => setSelectedIndex(index)}
                                >
                                    <span className="gb-nav-icon">{block.type === "paragraph" ? "¶" : block.type === "heading" ? "H" : block.type === "image" ? "🖼" : block.type === "quote" ? "💬" : "⧉"}</span>
                                    <span className="gb-nav-name">{block.type}</span>
                                    <button type="button" className="gb-icon-btn gb-icon-btn-danger" onClick={e => { e.stopPropagation(); removeBlock(index); }} title={t("editor.delete") || "Delete"}>✕</button>
                                </div>
                            ))
                        )}
                        {dropTarget === blocks.length && <div className="gb-drop-zone" />}
                    </div>
                </aside>

                {/* Center: main canvas */}
                <section className="gb-canvas">
                    <div className="gb-page">
                        <header className="gb-page-header">
                            <h1>Page Title</h1>
                        </header>
                        <div className="gb-page-body">
                            {blocks.length === 0 ? (
                                <div className="gb-canvas-empty">
                                    <span>🧱</span>
                                    <p>{t("editor.addBlockHint") || "Add a block to start designing"}</p>
                                </div>
                            ) : (
                                blocks.map((block, index) => renderBlock(block, index))
                            )}
                            {dropTarget === blocks.length && <div className="gb-drop-zone" />}
                        </div>
                    </div>
                </section>

                {/* Right: settings sidebar */}
                <aside className="gb-sidebar gb-sidebar-settings">
                    <div className="gb-sidebar-header">
                        <span>{selectedBlock ? t("editor.blockSettings") || "Block settings" : t("editor.selectBlock") || "Select a block"}</span>
                        <button type="button" className="gb-icon-btn" onClick={() => setSelectedIndex(null)}>✕</button>
                    </div>
                    <div className="gb-settings-content">
                        {selectedBlock ? renderSettings() : (
                            <div className="gb-empty">
                                <span>👆</span>
                                <p>{t("editor.clickBlock") || "Click a block to edit its settings"}</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
