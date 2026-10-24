import { getClassNameFactory } from "../getClassNameFactory";
import styles from "./PuckHeading.module.css";

const getClassName = getClassNameFactory("Heading", styles);

export const PuckHeading = ({ children, rank, size = "m" }) => {
    const Tag = rank ? `h${rank}` : "span";

    return (
        <Tag
            className={getClassName({
                [size]: true,
            })}
        >
            {children}
        </Tag>
    );
};
