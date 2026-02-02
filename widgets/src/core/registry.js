// Functional widget registry: type → { type, component }
const widgetRegistry = new Map();

export function registerWidget(definition) {
  widgetRegistry.set(definition.type, definition);
}

export function getWidget(type) {
  return widgetRegistry.get(type);
}

export function getAllWidgets() {
  return Array.from(widgetRegistry.values());
}

export function hasWidget(type) {
  return widgetRegistry.has(type);
}