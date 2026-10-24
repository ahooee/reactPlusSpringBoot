import { useState, useCallback } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { PUCK_COMPONENTS } from "./puckConfig";
import "./PuckPageBuilder.css";

/* ---------- component ---------- */

export default function PuckPageBuilder({ value, onChange, onPublish }) {
    const [data] = useState(() => {
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

    const handleChange = useCallback(
        (next) => {
            try {
                onChange?.(JSON.stringify(next, null, 2));
            } catch {
                onChange?.(JSON.stringify(next));
            }
        },
        [onChange]
    );

    const handlePublish = useCallback(
        (next) => {
            handleChange(next);
            onPublish?.(next);
        },
        [handleChange, onPublish]
    );

    return (
        <div className="puck-page-builder" style={{ background: "#ffffff" }}>
            <Puck
                config={{ components: PUCK_COMPONENTS }}
                data={data}
                onChange={handleChange}
                onPublish={handlePublish}
            />
        </div>
    );
}
