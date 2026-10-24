/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/static-components */
import { lazy, Suspense } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { getClassNameFactory } from "../getClassNameFactory";
import { withLayout } from "../components/Layout";
import styles from "./Card.module.css";

const getClassName = getClassNameFactory("Card", styles);

const iconOptions = Object.keys(dynamicIconImports).map((iconName) => ({
    label: iconName,
    value: iconName,
}));

const iconCache = new Map();

const toKebabCase = (value) =>
    value
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();

const getIconComponent = (name) => {
    if (!name) return null;

    const key = dynamicIconImports[name] ? name : toKebabCase(name);
    const loader = dynamicIconImports[key];

    if (!loader) return null;

    if (!iconCache.has(key)) {
        iconCache.set(
            key,
            lazy(() =>
                loader().then((mod) => ({
                    default: mod.default || mod[key] || mod,
                }))
            )
        );
    }

    return iconCache.get(key);
};

const CardIcon = ({ name }) => {
    const Icon = getIconComponent(name);

    if (!Icon) return null;

    return (
        <Suspense fallback={null}>
            <Icon />
        </Suspense>
    );
};

const CardInner = {
    fields: {
        title: {
            type: "text",
            contentEditable: true,
            placeholder: "Enter a title",
        },
        description: {
            type: "textarea",
            contentEditable: true,
            placeholder: "Enter a description",
        },
        icon: {
            type: "select",
            options: iconOptions,
        },
        mode: {
            type: "radio",
            options: [
                { label: "card", value: "card" },
                { label: "flat", value: "flat" },
            ],
        },
    },
    defaultProps: {
        title: "",
        description: "",
        icon: "Feather",
        mode: "flat",
    },
    render: ({ title, icon, description, mode }) => {
        return (
            <div className={getClassName({ [mode]: mode })}>
                <div className={getClassName("inner")}>
                    <div className={getClassName("icon")}>
                        {icon && <CardIcon name={icon} />}
                    </div>

                    <div className={getClassName("title")}>{title}</div>
                    <div className={getClassName("description")}>
                        {description}
                    </div>
                </div>
            </div>
        );
    },
};

export const Card = withLayout(CardInner);
