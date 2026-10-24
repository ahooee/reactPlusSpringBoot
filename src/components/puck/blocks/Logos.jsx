import { getClassNameFactory } from "../getClassNameFactory";
import { Section } from "../components/Section";
import styles from "./Logos.module.css";

const getClassName = getClassNameFactory("Logos", styles);

const defaultLogos = [
    {
        alt: "google",
        imageUrl:
            "https://logolook.net/wp-content/uploads/2021/06/Google-Logo.png",
    },
    {
        alt: "google",
        imageUrl:
            "https://logolook.net/wp-content/uploads/2021/06/Google-Logo.png",
    },
    {
        alt: "google",
        imageUrl:
            "https://logolook.net/wp-content/uploads/2021/06/Google-Logo.png",
    },
    {
        alt: "google",
        imageUrl:
            "https://logolook.net/wp-content/uploads/2021/06/Google-Logo.png",
    },
    {
        alt: "google",
        imageUrl:
            "https://logolook.net/wp-content/uploads/2021/06/Google-Logo.png",
    },
];

export const Logos = {
    fields: {
        logos: {
            type: "array",
            getItemSummary: (item, i) => item.alt || `Feature #${i}`,
            defaultItemProps: {
                alt: "",
                imageUrl: "",
            },
            arrayFields: {
                alt: { type: "text" },
                imageUrl: { type: "text" },
            },
        },
    },
    defaultProps: {
        logos: defaultLogos,
    },
    render: ({ logos }) => {
        return (
            <Section className={getClassName()}>
                <div className={getClassName("items")}>
                    {(logos || []).map((item, i) => (
                        <div key={i} className={getClassName("item")}>
                            <img
                                className={getClassName("image")}
                                alt={item.alt}
                                src={item.imageUrl}
                                height={64}
                            />
                        </div>
                    ))}
                </div>
            </Section>
        );
    },
};
