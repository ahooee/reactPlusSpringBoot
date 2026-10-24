/* eslint-disable react-refresh/only-export-components */
import { Button } from "./blocks/Button";
import { Card } from "./blocks/Card";
import { Grid } from "./blocks/Grid";
import { Hero } from "./blocks/HeroBlock";
import { Heading } from "./blocks/Heading";
import { Flex } from "./blocks/Flex";
import { Logos } from "./blocks/Logos";
import { Stats } from "./blocks/Stats";
import { Template } from "./blocks/TemplateBlock";
import { Text } from "./blocks/Text";
import { Space } from "./blocks/Space";
import { RichText } from "./blocks/RichText";

import { PUCK_ROOT } from "./root";

export const PUCK_CATEGORIES = {
    layout: {
        components: ["Grid", "Flex", "Space"],
    },
    typography: {
        components: ["Heading", "Text", "RichText"],
    },
    interactive: {
        title: "Actions",
        components: ["Button"],
    },
    other: {
        title: "Other",
        components: ["Card", "Hero", "Logos", "Stats", "Template"],
    },
};

export const PUCK_COMPONENTS = {
    Button,
    Card,
    Grid,
    Hero,
    Heading,
    Flex,
    Logos,
    Stats,
    Template,
    Text,
    Space,
    RichText,
};

export const PUCK_ROOT_CONFIG = PUCK_ROOT;

/**
 * Full Puck config, matching https://demo.puckeditor.com/edit.
 */
export const PUCK_CONFIG = {
    root: PUCK_ROOT,
    categories: PUCK_CATEGORIES,
    components: PUCK_COMPONENTS,
};

export default PUCK_CONFIG;
