import { getClassNameFactory } from "../getClassNameFactory";
import { Section } from "../components/Section";
import styles from "./Template.module.css";

const getClassName = getClassNameFactory("Template", styles);

export const Template = ({ children: Children }) => {
    return (
        <Section>
            <Children className={getClassName()} />
        </Section>
    );
};

export default Template;
