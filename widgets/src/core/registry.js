// Functional widget registry
const widgets = new Map();

export function registerWidget(definition) {
    widgets.set(definition.type, definition);
}

export function getWidget(type) {
    return widgets.get(type);
}

export function getAllWidgets() {
    return Array.from(widgets.values());
}

export function hasWidget(type) {
    return widgets.has(type);
}