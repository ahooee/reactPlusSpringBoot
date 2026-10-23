import { useState, useCallback, Component } from "react";
import Editor from "@react-page/editor";
import { cellPlugins, LANGUAGES } from "./pageBuilderPlugins";
import "./PageBuilder.css";

/* Editor + plugin stylesheets */
import "@react-page/editor/lib/index.css";
import "@react-page/plugins-slate/lib/index.css";
import "@react-page/plugins-image/lib/index.css";
import "@react-page/plugins-background/lib/index.css";
import "@react-page/plugins-divider/lib/index.css";
import "@react-page/plugins-spacer/lib/index.css";

/* Error boundary so a crash inside react-page doesn't blank the whole page */
class EditorErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ info: errorInfo });
        console.error("[react-page editor error]", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="pb-error">
                    <div style={{ padding: 24, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                        <strong>react-page editor failed to load</strong>
                        <pre style={{ marginTop: 10, fontSize: 12, overflow: "auto", maxHeight: 300 }}>{String(this.state.error?.message ?? this.state.error)}</pre>
                        <pre style={{ marginTop: 8, fontSize: 11, opacity: 0.7, overflow: "auto", maxHeight: 200 }}>{this.state.info?.componentStack ?? ""}</pre>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

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
            <EditorErrorBoundary>
                <Editor
                    cellPlugins={cellPlugins}
                    value={doc}
                    lang={LANGUAGES[0].lang}
                    languages={LANGUAGES}
                    onChange={handleChange}
                />
            </EditorErrorBoundary>
        </div>
    );
}
