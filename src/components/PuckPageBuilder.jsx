import { useState, useCallback } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./PuckPageBuilder.css";

/**
 * Puck-based visual page builder.
 * Admin drags blocks onto a canvas, configures them via the sidebar,
 * and the resulting JSON is saved as the page content.
 */
const PUCK_COMPONENTS = {
    text: {
        label: "Text",
        preview: ({ children }) => <p>{children}</p>,
        fields: {
            children: {
                type: "text",
                label: "Content",
                multiline: true,
            },
        },
    },
    heading: {
        label: "Heading",
        preview: ({ children, level }) => (
            <h2 style={{ fontSize: level === "h1" ? "2.5rem" : level === "h3" ? "1.5rem" : "2rem" }}>{children}</h2>
        ),
        fields: {
            children: { type: "text", label: "Text" },
            level: {
                type: "select",
                label: "Level",
                options: ["h1", "h2", "h3"],
                defaultValue: "h2",
            },
        },
    },
    image: {
        label: "Image",
        preview: ({ src }) => (
            src ? <img src={src} alt="" style={{ maxWidth: "100%" }} /> : null
        ),
        fields: {
            src: {
                type: "text",
                label: "Image URL",
                placeholder: "/uploads/... or https://...",
            },
            alt: { type: "text", label: "Alt text" },
        },
    },
    button: {
        label: "Button",
        preview: ({ children, url }) => (
            <a href={url || "#"} style={{ display: "inline-block", padding: "10px 20px", background: "#aa3bff", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>
                {children}
            </a>
        ),
        fields: {
            children: { type: "text", label: "Button text" },
            url: { type: "text", label: "Button URL" },
        },
    },
    quote: {
        label: "Quote",
        preview: ({ children, author }) => (
            <blockquote style={{ borderLeft: "4px solid #aa3bff", paddingLeft: "1rem", fontStyle: "italic" }}>
                {children}
                {author && <footer>- {author}</footer>}
            </blockquote>
        ),
        fields: {
            children: { type: "text", label: "Quote text", multiline: true },
            author: { type: "text", label: "Author" },
        },
    },
    columns: {
        label: "Columns",
        preview: ({ columns }) => (
            <div style={{ display: "flex", gap: "1rem" }}>
                {columns?.map((col, i) => (
                    <div key={i} style={{ flex: 1, padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                        {col.children}
                    </div>
                ))}
            </div>
        ),
        fields: {
            columns: {
                type: "array",
                label: "Columns",
                itemFields: {
                    children: { type: "text", label: "Content", multiline: true },
                },
            },
        },
    },
    spacer: {
        label: "Spacer",
        preview: () => <div style={{ height: "2rem" }} />,
        fields: {},
    },
};

export default function PuckPageBuilder({ value, onChange }) {
    const [data, setData] = useState(() => {
        try {
            if (value === null || value === undefined || value === "") {
                return {};
            }
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            return parsed || {};
        } catch {
            return {};
        }
    });

    const handlePublish = useCallback(
        (next) => {
            setData(next);
            try {
                onChange?.(JSON.stringify(next, null, 2));
            } catch {
                onChange?.(JSON.stringify(next));
            }
        },
        [onChange]
    );

    return (
        <div className="puck-page-builder">
            <Puck
                config={{ components: PUCK_COMPONENTS }}
                data={data}
                onPublish={handlePublish}
            />
        </div>
    );
}
