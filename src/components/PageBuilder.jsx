import { useState, useCallback, lazy, Suspense } from "react";
import { cellPlugins, LANGUAGES } from "./pageBuilderPlugins";
import "./PageBuilder.css";

/* Editor stylesheets */
import "@react-page/editor/lib/index.css";
import "@react-page/plugins-slate/lib/index.css";
import "@react-page/plugins-image/lib/index.css";
import "@react-page/plugins-background/lib/index.css";
import "@react-page/plugins-divider/lib/index.css";
import "@react-page/plugins-spacer/lib/index.css";

const Editor = lazy(() =>
    import("@react-page/editor").then((mod) => ({ default: mod.default }))
);

export default function PageBuilder({ value, onChange }) {
    const [doc, setDoc] = useState(() => {
        try {
            if (value === null || value === undefined || value === "") {
                return null;
            }
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            return parsed || null;
        } catch {
            return null;
        }
    });

    const handleChange = useCallback((next) => {
        setDoc(next);
        try {
            onChange?.(JSON.stringify(next, null, 2));
        } catch {
            onChange?.(JSON.stringify(next));
        }
    }, [onChange]);

    return (
        <div className="pb-page-wrapper">
            <Suspense fallback={<div>Loading editor…</div>}>
                <Editor
                    cellPlugins={cellPlugins}
                    value={doc}
                    lang={LANGUAGES[0].lang}
                    languages={LANGUAGES}
                    onChange={handleChange}
                />
            </Suspense>
        </div>
    );
}
