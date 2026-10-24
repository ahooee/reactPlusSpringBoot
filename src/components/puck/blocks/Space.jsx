import { spacingOptions } from "../options";
import { getClassNameFactory } from "../getClassNameFactory";
import styles from "./Space.module.css";

const getClassName = getClassNameFactory("Space", styles);

export const Space = {
    label: "Space",
    fields: {
        size: {
            type: "select",
            options: spacingOptions,
        },
        directions: {
            type: "checkbox",
            options: [
                { value: "vertical", label: "Vertical" },
                { value: "horizontal", label: "Horizontal" },
            ],
        },
    },
    defaultProps: {
        directions: ["vertical", "horizontal"],
        size: "24px",
    },
    inline: true,
    render: ({ directions, size, puck }) => {
        const modifier =
            directions?.length === 1 ? directions[0] : null;

        return (
            <div
                ref={puck.dragRef}
                className={getClassName(
                    modifier ? { [modifier]: true } : {}
                )}
                style={{ "--size": size }}
            />
        );
    },
};
