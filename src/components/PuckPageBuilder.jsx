import { useState, useCallback } from "react";
import {
    AutoField,
    Button,
    FieldLabel,
    Puck,
} from "@puckeditor/core";
import { Type } from "lucide-react";
import "@puckeditor/core/puck.css";
import { PUCK_CONFIG } from "./puck";
import headingAnalyzer from "./puck/HeadingAnalyzer";
import "./PuckPageBuilder.css";

const EDITOR_OVERRIDES = {
    fieldTypes: {
        // Example of a user field provided via overrides.
        userField: ({ readOnly, field, name, value, onChange }) => (
            <FieldLabel
                label={field.label || name}
                readOnly={readOnly}
                icon={<Type size={16} />}
            >
                <AutoField
                    field={{ type: "text" }}
                    onChange={onChange}
                    value={value}
                    readOnly={readOnly}
                />
            </FieldLabel>
        ),
    },
};

/* ---------- component ---------- */

export default function PuckPageBuilder({
    value,
    onChange,
    onPublish,
    viewHref,
    headerPath,
}) {
    const [data] = useState(() => {
        try {
            if (value === null || value === undefined || value === "") {
                return {};
            }
            const parsed =
                typeof value === "string" ? JSON.parse(value) : value;
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

    const overrides = viewHref
        ? {
              ...EDITOR_OVERRIDES,
              headerActions: ({ children }) => (
                  <>
                      <div>
                          <Button
                              href={viewHref}
                              newTab
                              variant="secondary"
                          >
                              View page
                          </Button>
                      </div>
                      {children}
                  </>
              ),
          }
        : EDITOR_OVERRIDES;

    return (
        <div className="puck-page-builder">
            <Puck
                config={PUCK_CONFIG}
                data={data}
                plugins={[headingAnalyzer]}
                onChange={handleChange}
                onPublish={handlePublish}
                headerPath={headerPath}
                iframe={{ enabled: true }}
                dnd={{ enableDragHandle: true }}
                fieldTransforms={{
                    userField: ({ value: fieldValue }) => fieldValue,
                }}
                _experimentalVirtualization
                overrides={overrides}
                metadata={{ example: "Hello, world" }}
            />
        </div>
    );
}
