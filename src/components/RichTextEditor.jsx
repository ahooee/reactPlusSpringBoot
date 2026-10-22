import { useEffect, useRef, useState } from "react";
import { API_URL, authHeaders, imageSrc } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";
import "./RichTextEditor.css";

const FONTS = [
    { value: "", label: "Font" },
    { value: "Vazirmatn, Tahoma, sans-serif", label: "Vazirmatn" },
    { value: "Tahoma, sans-serif", label: "Tahoma" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "monospace", label: "Monospace" },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
    const editorRef = useRef(null);
    const fileRef = useRef(null);
    const savedRange = useRef(null);
    const [uploading, setUploading] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const el = editorRef.current;
        if (el && (value || "") !== el.innerHTML && document.activeElement !== el) {
            el.innerHTML = value || "";
        }
    }, [value]);

    function saveSelection() {
        try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                    savedRange.current = range.cloneRange();
                }
            }
        } catch {
            // ignore
        }
    }

    function restoreSelection() {
        try {
            editorRef.current?.focus({ preventScroll: true });
            const sel = window.getSelection();
            if (savedRange.current && sel) {
                sel.removeAllRanges();
                sel.addRange(savedRange.current);
            }
        } catch {
            // ignore
        }
    }

    function emit() {
        if (editorRef.current) {
            onChange?.(editorRef.current.innerHTML);
        }
        saveSelection();
    }

    function exec(cmd, val = null) {
        restoreSelection();
        document.execCommand("styleWithCSS", false, true);
        document.execCommand(cmd, false, val);
        emit();
    }

    function addLink() {
        restoreSelection();
        const url = window.prompt(t("editor.linkPrompt"), "https://");
        if (!url) return;
        restoreSelection();
        document.execCommand("createLink", false, url);
        emit();
    }

    function addImageUrl() {
        restoreSelection();
        const url = window.prompt(t("editor.imagePrompt"), "https://");
        if (!url) return;
        restoreSelection();
        document.execCommand("insertImage", false, url);
        emit();
    }

    async function handleFile(e) {
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
            restoreSelection();
            document.execCommand("insertImage", false, imageSrc(saved.url));
            emit();
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="rte">
            <div className="rte-toolbar" onMouseDownCapture={saveSelection}>
                <span className="rte-group">
                    <button type="button" title={t("editor.bold")} onMouseDown={e => e.preventDefault()} onClick={() => exec("bold")}><b>B</b></button>
                    <button type="button" title={t("editor.italic")} onMouseDown={e => e.preventDefault()} onClick={() => exec("italic")}><i>I</i></button>
                    <button type="button" title={t("editor.underline")} onMouseDown={e => e.preventDefault()} onClick={() => exec("underline")}><u>U</u></button>
                    <button type="button" title={t("editor.strike")} onMouseDown={e => e.preventDefault()} onClick={() => exec("strikeThrough")}><s>S</s></button>
                </span>
                <span className="rte-group">
                    <select title={t("editor.block")} value="" onChange={e => { if (e.target.value) exec("formatBlock", e.target.value); e.target.value = ""; }}>
                        <option value="">{t("editor.block")}</option>
                        <option value="p">{t("editor.p")}</option>
                        <option value="h2">{t("editor.h2")}</option>
                        <option value="h3">{t("editor.h3")}</option>
                        <option value="blockquote">{t("editor.quote")}</option>
                    </select>
                    <select title={t("editor.font")} value="" onChange={e => { if (e.target.value) exec("fontName", e.target.value); e.target.value = ""; }}>
                        {FONTS.map(f => <option key={f.label} value={f.value}>{f.label === "Font" ? t("editor.font") : f.label}</option>)}
                    </select>
                    <select title={t("editor.size")} value="" onChange={e => { if (e.target.value) exec("fontSize", e.target.value); e.target.value = ""; }}>
                        <option value="">{t("editor.size")}</option>
                        <option value="2">{t("editor.small")}</option>
                        <option value="3">{t("editor.normal")}</option>
                        <option value="5">{t("editor.large")}</option>
                        <option value="7">{t("editor.huge")}</option>
                    </select>
                </span>
                <span className="rte-group">
                    <label className="rte-color" title={t("editor.color")}>
                        A
                        <input type="color" onChange={e => exec("foreColor", e.target.value)} />
                    </label>
                    <label className="rte-color rte-hl" title={t("editor.highlight")}>
                        ✎
                        <input type="color" defaultValue="#ffff00" onChange={e => exec("hiliteColor", e.target.value)} />
                    </label>
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
                    <button type="button" title={t("editor.imageUpload")} disabled={uploading} onMouseDown={e => e.preventDefault()} onClick={() => fileRef.current?.click()}>
                        {uploading ? "⏳" : "⬆🖼"}
                    </button>
                    <button type="button" title={t("editor.clear")} onMouseDown={e => e.preventDefault()} onClick={() => exec("removeFormat")}>⌫</button>
                </span>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
            </div>
            <div
                ref={editorRef}
                className="rte-canvas prose"
                contentEditable
                suppressContentEditableWarning
                dir="auto"
                data-placeholder={placeholder || t("editor.placeholder")}
                onInput={emit}
                onKeyUp={saveSelection}
                onMouseUp={saveSelection}
            />
        </div>
    );
}
