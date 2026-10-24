export const PUCK_COMPONENT_KEY = "puck-demo";

export const generateId = (type = "component") => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return `${type}-${crypto.randomUUID()}`;
    }
    return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
