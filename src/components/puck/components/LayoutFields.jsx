import { FieldTab } from "@puckeditor/core";

/**
 * Renders the augmented component fields with a layout tab for the "layout" field.
 */
export const LayoutFields = ({ fields, AugmentedRenderFields }) => {
    const { layout, ...fieldsNoLayout } = fields;

    // Show the other fields in a tab if it doesn't define a custom fields layout
    const otherFields = AugmentedRenderFields ? (
        <AugmentedRenderFields fields={fieldsNoLayout} />
    ) : (
        <FieldTab label="General">{Object.values(fieldsNoLayout)}</FieldTab>
    );

    // Add the layout tab if it wasn't hidden
    return (
        <>
            {otherFields}
            {layout && <FieldTab label="Layout">{layout}</FieldTab>}
        </>
    );
};

export default LayoutFields;
