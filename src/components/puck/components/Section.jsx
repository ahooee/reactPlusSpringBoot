import { forwardRef } from "react";
import { getClassNameFactory } from "../getClassNameFactory";
import styles from "./Section.module.css";

const getClassName = getClassNameFactory("Section", styles);

export const Section = forwardRef(function Section(
    { children, className, maxWidth = "1280px", style = {} },
    ref
) {
    return (
        <div
            className={`${getClassName()}${className ? ` ${className}` : ""}`}
            style={{ ...style }}
            ref={ref}
        >
            <div className={getClassName("inner")} style={{ maxWidth }}>
                {children}
            </div>
        </div>
    );
});
