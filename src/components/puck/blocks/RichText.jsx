import { withLayout } from "../components/Layout";
import { Section } from "../components/Section";

const RichTextInner = {
    fields: {
        richtext: {
            type: "richtext",
        },
    },
    render: ({ richtext }) => {
        return <Section>{richtext}</Section>;
    },
    defaultProps: {
        richtext: "<h2>Heading</h2><p>Body</p>",
    },
};

export const RichText = withLayout(RichTextInner);
