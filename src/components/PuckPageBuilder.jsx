import { useState, useCallback } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./PuckPageBuilder.css";

/**
 * Puck-based visual page builder.
 * Admin drags blocks onto a canvas, configures them via the sidebar,
 * and the resulting JSON is saved as the page content.
 *
 * Blocks match https://demo.puckeditor.com/edit:
 * Text, Heading, RichText, Button, Card, Flex, Grid, Space,
 * Hero, Stats, Logos, Image, Divider, Container, Blank
 */

/* ---------- helpers ---------- */

const defaultLayout = {
    padding: "16px",
    maxWidth: "1200px",
    background: "#ffffff",
};

/* ---------- block definitions ---------- */

const PUCK_COMPONENTS = {
    /* ---------- Basic content blocks ---------- */

    Text: {
        label: "Text",
        fields: {
            text: {
                type: "textarea",
                label: "Text",
                defaultValue: "Text",
                contentEditable: true,
            },
            size: {
                type: "select",
                label: "Size",
                options: [
                    { label: "Small", value: "s" },
                    { label: "Medium", value: "m" },
                    { label: "Large", value: "l" },
                ],
                defaultValue: "m",
            },
            align: {
                type: "radio",
                label: "Alignment",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ],
                defaultValue: "left",
            },
            color: {
                type: "radio",
                label: "Color",
                options: [
                    { label: "Default", value: "default" },
                    { label: "Muted", value: "muted" },
                ],
                defaultValue: "default",
            },
            maxWidth: {
                type: "text",
                label: "Max Width",
                placeholder: "e.g. 800px",
            },
        },
        defaultProps: {
            text: "Text",
            size: "m",
            align: "left",
            color: "default",
            layout: { ...defaultLayout },
        },
        render: ({ text, align, size, color }) => (
            <section
                style={{
                    width: "100%",
                    background: "#ffffff",
                    display: "flex",
                    justifyContent:
                        align === "center"
                            ? "center"
                            : align === "right"
                              ? "flex-end"
                              : "flex-start",
                    fontSize: size === "s" ? "16px" : size === "l" ? "24px" : "20px",
                    color: color === "muted" ? "#6b7280" : "#111827",
                    padding: "16px",
                }}
            >
                {text}
            </section>
        ),
    },

    Heading: {
        label: "Heading",
        fields: {
            text: {
                type: "textarea",
                label: "Text",
                defaultValue: "Heading",
                contentEditable: true,
            },
            level: {
                type: "select",
                label: "Level",
                options: [
                    { label: "1", value: "1" },
                    { label: "2", value: "2" },
                    { label: "3", value: "3" },
                    { label: "4", value: "4" },
                    { label: "5", value: "5" },
                    { label: "6", value: "6" },
                ],
                defaultValue: "2",
            },
            size: {
                type: "select",
                label: "Size",
                options: [
                    { label: "XS", value: "xs" },
                    { label: "S", value: "s" },
                    { label: "M", value: "m" },
                    { label: "L", value: "l" },
                    { label: "XL", value: "xl" },
                    { label: "XXL", value: "xxl" },
                    { label: "XXXL", value: "xxxl" },
                ],
                defaultValue: "m",
            },
            align: {
                type: "radio",
                label: "Alignment",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ],
                defaultValue: "left",
            },
        },
        defaultProps: {
            text: "Heading",
            level: "2",
            size: "m",
            align: "left",
            layout: { ...defaultLayout, padding: "8px" },
        },
        render: ({ text, level, size, align }) => {
            const fontSizes = {
                xs: "16px",
                s: "20px",
                m: "24px",
                l: "32px",
                xl: "40px",
                xxl: "48px",
                xxxl: "56px",
            };
            const Tag = `h${level}`;
            return (
                <section style={{ width: "100%", background: "#ffffff", padding: "16px" }}>
                    <Tag
                        style={{
                            fontSize: fontSizes[size] ?? "24px",
                            textAlign: align,
                            width: "100%",
                            margin: "0",
                            fontWeight: 600,
                            display: "block",
                            color: "#111827",
                        }}
                    >
                        {text}
                    </Tag>
                </section>
            );
        },
    },

    RichText: {
        label: "Rich Text",
        fields: {
            richtext: {
                type: "richtext",
                label: "Content",
                defaultValue: "<h2>Heading</h2><p>Body</p>",
            },
        },
        defaultProps: {
            richtext: "<h2>Heading</h2><p>Body</p>",
            layout: { ...defaultLayout },
        },
        render: ({ richtext }) => (
            <section style={{ width: "100%", background: "#ffffff", padding: "16px" }} dangerouslySetInnerHTML={{ __html: richtext || "" }} />
        ),
    },

    /* ---------- Layout & container blocks ---------- */

    Container: {
        label: "Container",
        fields: {
            padding: {
                type: "text",
                label: "Padding",
                placeholder: "e.g. 16px",
                defaultValue: "16px",
            },
            maxWidth: {
                type: "text",
                label: "Max Width",
                placeholder: "e.g. 1200px",
                defaultValue: "1200px",
            },
            background: {
                type: "text",
                label: "Background Color",
                placeholder: "e.g. #f9fafb",
                defaultValue: "#ffffff",
            },
        },
        defaultProps: {
            padding: "16px",
            maxWidth: "1200px",
            background: "#ffffff",
            layout: defaultLayout,
        },
        render: ({ padding, maxWidth, background }) => (
            <section
                style={{
                    padding,
                    maxWidth,
                    background: background || "#ffffff",
                    margin: "0 auto",
                    width: "100%",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                }}
            >
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>Container</div>
            </section>
        ),
    },

    Flex: {
        label: "Flex",
        fields: {
            direction: {
                type: "radio",
                label: "Direction",
                options: [
                    { label: "Row", value: "row" },
                    { label: "Column", value: "column" },
                ],
                defaultValue: "row",
            },
            justifyContent: {
                type: "radio",
                label: "Justify Content",
                options: [
                    { label: "Start", value: "start" },
                    { label: "Center", value: "center" },
                    { label: "End", value: "end" },
                ],
                defaultValue: "start",
            },
            gap: {
                type: "number",
                label: "Gap",
                min: 0,
                defaultValue: 24,
            },
            wrap: {
                type: "radio",
                label: "Wrap",
                options: [
                    { label: "Wrap", value: "wrap" },
                    { label: "No Wrap", value: "nowrap" },
                ],
                defaultValue: "wrap",
            },
            items: {
                type: "slot",
                label: "Items",
            },
        },
        defaultProps: {
            direction: "row",
            justifyContent: "start",
            gap: 24,
            wrap: "wrap",
            items: [],
            layout: { ...defaultLayout, grow: true },
        },
        render: ({ direction, justifyContent, gap, wrap, items: Items }) => (
            <section
                style={{
                    display: "flex",
                    flexDirection: direction,
                    justifyContent,
                    gap,
                    flexWrap: wrap,
                    width: "100%",
                    padding: "16px",
                    background: "#f3f4f6",
                    borderRadius: "8px",
                }}
            >
                <Items />
            </section>
        ),
    },

    Grid: {
        label: "Grid",
        fields: {
            numColumns: {
                type: "number",
                label: "Columns",
                min: 1,
                max: 12,
                defaultValue: 4,
            },
            gap: {
                type: "number",
                label: "Gap",
                min: 0,
                defaultValue: 24,
            },
            items: {
                type: "slot",
                label: "Items",
            },
        },
        defaultProps: {
            numColumns: 4,
            gap: 24,
            items: [],
            layout: defaultLayout,
        },
        render: ({ numColumns, gap, items: Items }) => (
            <section
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${numColumns || 4}, 1fr)`,
                    gap: gap || 24,
                    width: "100%",
                    padding: "16px",
                    background: "#f3f4f6",
                    borderRadius: "8px",
                }}
            >
                <Items />
            </section>
        ),
    },

    /* ---------- Decorative blocks ---------- */

    Space: {
        label: "Space",
        fields: {
            size: {
                type: "select",
                label: "Size",
                options: [
                    { label: "8px", value: "8px" },
                    { label: "16px", value: "16px" },
                    { label: "24px", value: "24px" },
                    { label: "32px", value: "32px" },
                    { label: "48px", value: "48px" },
                    { label: "64px", value: "64px" },
                ],
                defaultValue: "24px",
            },
        },
        defaultProps: {
            size: "24px",
            inline: true,
        },
        render: ({ size }) => (
            <div style={{ height: size || "24px", width: "100%", background: "#ffffff" }} />
        ),
    },

    Divider: {
        label: "Divider",
        fields: {},
        defaultProps: {},
        render: () => (
            <div
                style={{
                    height: "1px",
                    background: "#e5e7eb",
                    width: "100%",
                    margin: "24px 0",
                }}
            />
        ),
    },

    Blank: {
        label: "Blank",
        fields: {},
        defaultProps: {},
        render: () => <div style={{ width: "100%", height: "40px", background: "#ffffff" }} />,
    },

    /* ---------- Media blocks ---------- */

    Image: {
        label: "Image",
        fields: {
            src: {
                type: "text",
                label: "Image URL",
                placeholder: "/uploads/... or https://...",
            },
            alt: {
                type: "text",
                label: "Alt Text",
                placeholder: "Describe the image",
            },
        },
        defaultProps: {
            src: "",
            alt: "",
        },
        render: ({ src }) => (
            src ? (
                <section style={{ width: "100%", background: "#ffffff" }}>
                    <img src={src} alt="" style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }} />
                </section>
            ) : (
                <section
                    style={{
                        width: "100%",
                        height: "200px",
                        background: "#f3f4f6",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        fontSize: "14px",
                    }}
                >
                    Image
                </section>
            )
        ),
    },

    Video: {
        label: "Video",
        fields: {
            src: {
                type: "text",
                label: "Video URL",
                placeholder: "https://www.youtube.com/watch?v=...",
            },
        },
        defaultProps: {
            src: "",
        },
        render: ({ src }) => (
            src ? (
                <section style={{ width: "100%", borderRadius: "8px", overflow: "hidden", background: "#ffffff" }}>
                    <iframe src={src} style={{ width: "100%", height: "300px", border: "0" }} />
                </section>
            ) : (
                <section
                    style={{
                        width: "100%",
                        height: "200px",
                        background: "#f3f4f6",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                    }}
                >
                    Video
                </section>
            )
        ),
    },

    /* ---------- Component blocks ---------- */

    Button: {
        label: "Button",
        fields: {
            label: {
                type: "text",
                label: "Button Text",
                placeholder: "Button",
                defaultValue: "Button",
                contentEditable: true,
            },
            href: {
                type: "text",
                label: "URL",
                placeholder: "#",
                defaultValue: "#",
            },
            variant: {
                type: "radio",
                label: "Variant",
                options: [
                    { label: "Primary", value: "primary" },
                    { label: "Secondary", value: "secondary" },
                ],
                defaultValue: "primary",
            },
        },
        defaultProps: {
            label: "Button",
            href: "#",
            variant: "primary",
            layout: defaultLayout,
        },
        render: ({ label, variant }) => {
            const styles = {
                primary: {
                    background: "#2563eb",
                    color: "#ffffff",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-block",
                },
                secondary: {
                    background: "#ffffff",
                    color: "#2563eb",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "2px solid #2563eb",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-block",
                },
            };
            return (
                <a href="#" style={styles[variant || "primary"]}>
                    {label}
                </a>
            );
        },
    },

    Card: {
        label: "Card",
        fields: {
            title: {
                type: "text",
                label: "Title",
                placeholder: "Card title",
                defaultValue: "",
                contentEditable: true,
            },
            description: {
                type: "textarea",
                label: "Description",
                placeholder: "Card description",
                defaultValue: "",
                contentEditable: true,
            },
            icon: {
                type: "text",
                label: "Icon Name",
                placeholder: "e.g. Feather, Home, etc.",
                defaultValue: "Feather",
            },
            mode: {
                type: "radio",
                label: "Mode",
                options: [
                    { label: "Card", value: "card" },
                    { label: "Flat", value: "flat" },
                ],
                defaultValue: "flat",
            },
        },
        defaultProps: {
            title: "",
            description: "",
            icon: "Feather",
            mode: "flat",
            layout: defaultLayout,
        },
        render: ({ title, description, mode }) => (
            <section
                style={{
                    border: mode === "card" ? "1px solid #e5e7eb" : "none",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#ffffff",
                    boxShadow: mode === "card" ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
                    width: "100%",
                }}
            >
                {title && <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", color: "#111827" }}>{title}</div>}
                {description && <div style={{ color: "#6b7280", fontSize: "14px" }}>{description}</div>}
            </section>
        ),
    },

    Stats: {
        label: "Stats",
        fields: {
            items: {
                type: "array",
                label: "Stats",
                defaultValue: [
                    { title: "Stat", description: "1,000" },
                ],
                itemFields: {
                    title: {
                        type: "text",
                        label: "Title",
                        defaultValue: "Stat",
                        contentEditable: true,
                    },
                    description: {
                        type: "text",
                        label: "Value",
                        defaultValue: "1,000",
                        contentEditable: true,
                    },
                },
            },
        },
        defaultProps: {
            items: [
                { title: "Stat", description: "1,000" },
            ],
            layout: defaultLayout,
        },
        render: ({ items }) => {
            const stats = items || [{ title: "Stat", description: "1,000" }];
            return (
                <section
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        flexWrap: "wrap",
                        width: "100%",
                        background: "#ffffff",
                    }}
                >
                    {stats.map((item, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                minWidth: "120px",
                                textAlign: "center",
                                padding: "16px",
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: "20px", marginBottom: "4px", color: "#111827" }}>
                                {item.description}
                            </div>
                            <div style={{ color: "#6b7280", fontSize: "14px" }}>{item.title}</div>
                        </div>
                    ))}
                </section>
            );
        },
    },

    Logos: {
        label: "Logos",
        fields: {
            logos: {
                type: "array",
                label: "Logos",
                defaultValue: [
                    { alt: "Company", imageUrl: "" },
                    { alt: "Company", imageUrl: "" },
                    { alt: "Company", imageUrl: "" },
                    { alt: "Company", imageUrl: "" },
                    { alt: "Company", imageUrl: "" },
                ],
                itemFields: {
                    alt: {
                        type: "text",
                        label: "Alt Text",
                    },
                    imageUrl: {
                        type: "text",
                        label: "Image URL",
                    },
                },
            },
        },
        defaultProps: {
            logos: [
                { alt: "Company", imageUrl: "" },
                { alt: "Company", imageUrl: "" },
                { alt: "Company", imageUrl: "" },
                { alt: "Company", imageUrl: "" },
                { alt: "Company", imageUrl: "" },
            ],
            layout: defaultLayout,
        },
        render: ({ logos }) => {
            const logoList = logos || [];
            return (
                <section
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "32px",
                        flexWrap: "wrap",
                        width: "100%",
                        padding: "24px 0",
                        background: "#ffffff",
                    }}
                >
                    {logoList.map((item, i) => (
                        <div key={i} style={{ height: "64px" }}>
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.alt || ""} style={{ height: "64px", width: "auto" }} />
                            ) : (
                                <div style={{ height: "64px", width: "120px", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3ab", fontSize: "12px" }}>
                                    Logo {i + 1}
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            );
        },
    },

    /* ---------- Hero block ---------- */

    Hero: {
        label: "Hero",
        fields: {
            title: {
                type: "textarea",
                label: "Title",
                placeholder: "Enter a title",
                defaultValue: "",
                contentEditable: true,
            },
            description: {
                type: "richtext",
                label: "Description",
                defaultValue: "<p>Description</p>",
            },
            align: {
                type: "radio",
                label: "Alignment",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                ],
                defaultValue: "left",
            },
            image: {
                type: "text",
                label: "Image URL",
                placeholder: "https://...",
            },
            padding: {
                type: "text",
                label: "Padding",
                placeholder: "e.g. 64px",
                defaultValue: "64px",
            },
        },
        defaultProps: {
            title: "",
            description: "<p>Description</p>",
            align: "left",
            image: "",
            padding: "64px",
            layout: defaultLayout,
        },
        render: ({ title, description, align, image, padding }) => (
            <section
                style={{
                    width: "100%",
                    padding,
                    textAlign: align === "center" ? "center" : "left",
                    background: "#f9fafb",
                    borderRadius: "12px",
                }}
            >
                {image && (
                    <img src={image} alt="" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "8px", marginBottom: "16px" }} />
                )}
                {title && (
                    <h1
                        style={{
                            fontSize: "32px",
                            fontWeight: 700,
                            margin: "0 0 12px 0",
                            textAlign: align === "center" ? "center" : "left",
                            color: "#111827",
                        }}
                    >
                        {title}
                    </h1>
                )}
                <div
                    style={{ fontSize: "18px", color: "#4b5563", marginBottom: "16px" }}
                    dangerouslySetInnerHTML={{ __html: description || "" }}
                />
            </section>
        ),
    },

    /* ---------- Template block ---------- */

    Template: {
        label: "Template",
        fields: {
            template: {
                type: "select",
                label: "Template",
                options: [
                    { label: "Blank", value: "blank" },
                    { label: "Example 1", value: "example_1" },
                    { label: "Example 2", value: "example_2" },
                ],
                defaultValue: "example_1",
            },
        },
        defaultProps: {
            template: "example_1",
            layout: defaultLayout,
        },
        render: ({ template }) => (
            <section style={{ width: "100%", padding: "24px", background: "#ffffff" }}>
                <div style={{ color: "#6b7280", fontSize: "14px", fontStyle: "italic" }}>
                    Template: {template} (configured on edit)
                </div>
            </section>
        ),
    },
};

/* ---------- component ---------- */

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
        <div className="puck-page-builder" style={{ background: "#ffffff" }}>
            <Puck
                config={{ components: PUCK_COMPONENTS }}
                data={data}
                onPublish={handlePublish}
            />
        </div>
    );
}
