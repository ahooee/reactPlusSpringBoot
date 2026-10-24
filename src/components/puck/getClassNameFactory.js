/**
 * Tiny replacement for Puck's internal getClassNameFactory.
 * Supports the same call signatures used by the official demo:
 *   getClassName()
 *   getClassName("inner")
 *   getClassName({ "is-active": true, card: mode === "card" })
 */
export function getClassNameFactory(base, styles) {
    return (modifiers) => {
        const classes = [styles?.[base]].filter(Boolean);

        if (typeof modifiers === "string") {
            const modifier = styles?.[`${base}-${modifiers}`];
            if (modifier) classes.push(modifier);
        } else if (modifiers && typeof modifiers === "object") {
            Object.entries(modifiers).forEach(([key, active]) => {
                if (!active) return;
                const modifier = styles?.[`${base}-${key}`];
                if (modifier) classes.push(modifier);
            });
        }

        return classes.join(" ");
    };
}
