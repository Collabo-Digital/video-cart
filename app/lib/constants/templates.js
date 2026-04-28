export const WIDGET_TEMPLATES = {
    carousel: [
        { id: "default", name: "Classic", description: "Horizontal scrollable cards with product overlay" },
        // { id: "lookbook", name: "Lookbook", description: "Editorial cards with heading and description overlay" },
        { id: "spotlight", name: "Spotlight", description: "3D coverflow layout with center card highlighted" },
    ],
    stories: [
        {
            id: "default",
            name: "Default",
            description: "Circular thumbnails with colored ring",
            thumbnail: "/images/templates/stories-classic.png",
            isPro: false,
        },
    ],
    grid: [
        { id: "default", name: "Default", description: "Horizontal scrollable cards with product overlay" },
    ],
    floating: [
        { id: "default", name: "Default", description: "Horizontal scrollable cards with product overlay" },
    ],
};

export function getTemplatesForType(widgetType) {
    return WIDGET_TEMPLATES[widgetType] || WIDGET_TEMPLATES.carousel;
}

export function getTemplateById(widgetType, templateId) {
    const templates = getTemplatesForType(widgetType);
    return templates.find((t) => t.id === templateId) || templates[0];
}