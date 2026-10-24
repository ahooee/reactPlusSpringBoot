/* eslint-disable react-refresh/only-export-components */
import { getClassNameFactory } from "../getClassNameFactory";
import { Section } from "../components/Section";
import { withLayout } from "../components/Layout";
import styles from "./Grid.module.css";

const getClassName = getClassNameFactory("Grid", styles);

const CustomSlot = (props) => {
    return <span {...props} />;
};

const GridInternal = {
    fields: {
        numColumns: {
            type: "number",
            label: "Number of columns",
            min: 1,
            max: 12,
        },
        gap: {
            label: "Gap",
            type: "number",
            min: 0,
        },
        items: {
            type: "slot",
        },
    },
    defaultProps: {
        numColumns: 4,
        gap: 24,
        items: [],
    },
    render: ({ gap, numColumns, items: Items }) => {
        return (
            <Section>
                <Items
                    as={CustomSlot}
                    disallow={["Hero", "Stats"]}
                    className={getClassName()}
                    style={{
                        gap,
                        gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
                    }}
                />
            </Section>
        );
    },
};

export const Grid = withLayout(GridInternal);
