/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { createUsePuck } from "@puckeditor/core";
import { Heading1 } from "lucide-react";
import { getClassNameFactory } from "./getClassNameFactory";
import styles from "./HeadingAnalyzer.module.css";

const getClassName = getClassNameFactory("HeadingAnalyzer", styles);
const getClassNameItem = getClassNameFactory("HeadingAnalyzerItem", styles);

const usePuck = createUsePuck();

/** The Puck canvas lives in an iframe when the iframe option is enabled. */
const getFrame = () => {
    const iframe = document.querySelector("iframe");
    return iframe?.contentDocument || document;
};

const getOutline = ({ frame } = {}) => {
    const headings = frame?.querySelectorAll("h1,h2,h3,h4,h5,h6") || [];

    const outline = [];

    headings.forEach((item) => {
        if (item.closest("[data-dnd-dragging]")) {
            return;
        }

        outline.push({
            rank: parseInt(item.tagName.split("H")[1], 10),
            text: item.textContent || "",
            element: item,
        });
    });

    return outline;
};

const buildHierarchy = (frame) => {
    const headings = getOutline({ frame });

    const root = { rank: 0, children: [], text: "" };
    let path = [root];

    for (const heading of headings) {
        const node = {
            rank: heading.rank,
            text: heading.text,
            children: [],
            element: heading.element,
        };

        // When encountering an h1, reset the path to only the root
        if (node.rank === 1) {
            path = [root];
        } else {
            // Go up the path until finding a node where this heading can be a child
            while (path[path.length - 1].rank >= node.rank) {
                path.pop();
            }

            // Add missing nodes if necessary
            while (path.length < node.rank) {
                const missingNode = {
                    rank: path.length,
                    missing: true,
                    children: [],
                    text: "",
                };
                path[path.length - 1].children?.push(missingNode);
                path.push(missingNode);
            }
        }

        // Add this node to its parent in the path and update path
        path[path.length - 1].children?.push(node);
        path.push(node);
    }

    return root.children;
};

const highlightElement = (el) => {
    const oldStyle = { outline: el.style.outline, outlineOffset: el.style.outlineOffset };

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    el.style.outline = "4px solid var(--puck-color-rose-06)";
    el.style.outlineOffset = "4px";

    setTimeout(() => {
        el.style.outline = oldStyle.outline || "";
        el.style.outlineOffset = oldStyle.outlineOffset || "";
    }, 2000);
};

const HeadingItem = ({ node }) => {
    const handleClick = (e) => {
        e.stopPropagation();

        if (!node.element) return;

        highlightElement(node.element);
    };

    return (
        <li className={getClassNameItem()}>
            <button
                type="button"
                className={getClassNameItem({
                    missing: node.missing,
                })}
                onClick={node.element ? handleClick : undefined}
                style={{
                    background: "none",
                    border: "none",
                    padding: "4px 0",
                    textAlign: "start",
                    width: "100%",
                    cursor: node.element ? "pointer" : "default",
                    color: node.missing
                        ? "var(--puck-color-red-04)"
                        : "inherit",
                    fontSize: 12,
                }}
            >
                {node.missing ? (
                    <>
                        <b>H{node.rank}</b>: Missing
                    </>
                ) : (
                    <>
                        <b>H{node.rank}</b>: {node.text}
                    </>
                )}
            </button>
            {node.children?.length > 0 && (
                <ul
                    style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        paddingInlineStart: 16,
                    }}
                >
                    {node.children.map((child, i) => (
                        <HeadingItem key={i} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export const HeadingAnalyzer = () => {
    const data = usePuck((s) => s.appState.data);
    const [hierarchy, setHierarchy] = useState([]);

    // Re-render when content changes
    useEffect(() => {
        let currentEntry = null;
        let entryObserver = null;
        let lastSignature = "";

        const refresh = () => {
            const frame = getFrame();
            const entry = frame?.querySelector("[data-puck-entry]");

            if (!entry) return;

            // The canvas iframe can be replaced when viewports change
            if (entry !== currentEntry) {
                currentEntry = entry;
                entryObserver?.disconnect();
                entryObserver = new MutationObserver(refresh);
                entryObserver.observe(entry, {
                    subtree: true,
                    childList: true,
                    characterData: true,
                });
            }

            const next = buildHierarchy(entry);
            const signature = JSON.stringify(
                next.map((node) => ({ rank: node.rank, text: node.text }))
            );

            if (signature !== lastSignature) {
                lastSignature = signature;
                setHierarchy(next);
            }
        };

        refresh();

        // Plugins can mount before the iframe canvas has rendered
        const interval = setInterval(refresh, 600);

        return () => {
            clearInterval(interval);
            entryObserver?.disconnect();
        };
    }, [data]);

    return (
        <div className={getClassName()}>
            {hierarchy.length === 0 && <div>No headings.</div>}

            {hierarchy.length > 0 && (
                <ul
                    style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                    }}
                >
                    {hierarchy.map((node, i) => (
                        <HeadingItem key={i} node={node} />
                    ))}
                </ul>
            )}
        </div>
    );
};

const headingAnalyzer = {
    name: "heading-analyzer",
    label: "Audit",
    render: HeadingAnalyzer,
    icon: <Heading1 />,
};

export default headingAnalyzer;
