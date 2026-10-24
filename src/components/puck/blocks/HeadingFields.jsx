import { FieldGroup, FieldTab } from "@puckeditor/core";
import { Sliders } from "lucide-react";

/**
 * Renders the fields layout for the Heading component.
 */
export const HeadingFields = ({ fields }) => (
    <FieldTab label="General">
        {fields.text}
        {fields.level}
        <FieldGroup icon={<Sliders size={16} />} label="Appearance">
            {fields.size}
            {fields.align}
        </FieldGroup>
    </FieldTab>
);
