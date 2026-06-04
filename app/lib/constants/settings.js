/**
 * Default values for the feed editor form.
 * Single source of truth for all settings fields.
 */
export const DEFAULT_SETTINGS = {
    general: {
        buttonBehavior: "addToCart",
        autoPlay: "always",
        autoLoop: true,
        visibleOnDesktop: true,
        visibleOnMobile: true,
        videosPerRow: 4,
    },
    design: {
        cardCornerRadius: 20,
        videoGap: 20,
        titleAlignment: "start",
        hoverEffect: "lift",
        buttonBackgroundColor: "#000080",
        buttonTextColor: "#ffffff",
        template: "default",
    },
    translation: {
        widgetHeading: "Check out these products",
        widgetDescription: "These products are available for purchase",
        addToCartText: "Shop Now",
    },
};

function getDefaultFeedName() {
    const num = Date.now() % 100000;
    return `Feed #${num}`;
}

export function getFeedFormDefaultValues(feed, widgetType, widgetPage, globalSettings) {
    const defaultWidgetType = widgetType || feed?.widgetType || "carousel";
    const defaultWidgetPage = widgetPage || feed?.widgetPage || "homePage";

    const globalGeneral = globalSettings?.general ?? {};
    const globalDesign = globalSettings?.design ?? {};
    const globalTranslation = globalSettings?.translation ?? {};

    return {
        feedName: feed?.feedName ?? getDefaultFeedName(),
        widgetType: defaultWidgetType,
        isEnabled: feed?.isEnabled ?? true,
        widgetPage: defaultWidgetPage,
        customPagePath: feed?.customPagePath || "",
        settings: {
            general: {
                ...DEFAULT_SETTINGS.general,
                ...globalGeneral,
                ...feed?.settings?.general,
            },
            design: {
                ...DEFAULT_SETTINGS.design,
                ...globalDesign,
                ...feed?.settings?.design,
            },
            translation: {
                ...DEFAULT_SETTINGS.translation,
                ...globalTranslation,
                ...feed?.settings?.translation,
            },
        },
    };
}