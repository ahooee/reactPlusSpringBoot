import { getClassNameFactory } from "../getClassNameFactory";
import { Section } from "../components/Section";
import styles from "./Stats.module.css";

const getClassName = getClassNameFactory("Stats", styles);

export const Stats = {
    fields: {
        items: {
            type: "array",
            getItemSummary: (item, i) =>
                item.title && item.description ? (
                    <>
                        {item.title} ({item.description})
                    </>
                ) : (
                    `Feature #${i}`
                ),
            defaultItemProps: {
                title: "Stat",
                description: "1,000",
            },
            arrayFields: {
                title: {
                    type: "text",
                    contentEditable: true,
                },
                description: {
                    type: "text",
                    contentEditable: true,
                },
            },
        },
    },
    defaultProps: {
        items: [
            {
                title: "Stat",
                description: "1,000",
            },
        ],
    },
    render: ({ items }) => {
        return (
            <Section className={getClassName()} maxWidth={"916px"}>
                <div className={getClassName("items")}>
                    {(items || []).map((item, i) => (
                        <div key={i} className={getClassName("item")}>
                            <div className={getClassName("label")}>
                                {item.title}
                            </div>
                            <div className={getClassName("value")}>
                                {item.description}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
        );
    },
};
