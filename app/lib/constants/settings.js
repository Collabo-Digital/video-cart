/**
 * Default values for the feed editor form.
 * Single source of truth for all settings fields.
 */
const DEFAULT_SETTINGS = {
    general: {
        buttonBehavior: "addToCart",
        autoPlay: "always",
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
    const num = Date.now() % 100000; // last 5 digits
    return `Feed #${num}`;
}

/**
 * Returns defaultValues for useForm, merging saved feed data when editing.
 * @param {object|null} feed - Loader feed (null when creating).
 */
export function getFeedFormDefaultValues(feed, widgetType, widgetPage) {
    const defaultWidgetType = widgetType || feed?.widgetType || "carousel";
    const defaultWidgetPage = widgetPage || feed?.widgetPage || "homePage";

    return {
        feedName: feed?.feedName ?? getDefaultFeedName(),
        widgetType: defaultWidgetType,
        isEnabled: feed?.isEnabled ?? true,
        widgetPage: defaultWidgetPage,
        customPagePath: feed?.customPagePath || "",
        settings: {
            general: { ...DEFAULT_SETTINGS.general, ...feed?.settings?.general },
            design: { ...DEFAULT_SETTINGS.design, ...feed?.settings?.design },
            translation: {
                ...DEFAULT_SETTINGS.translation,
                ...feed?.settings?.translation,
                // Backfill legacy keys if you stored them at settings.carouselTitle etc.
                ...(feed?.settings?.carouselTitle !== undefined && {
                    carouselTitle: feed.settings.carouselTitle,
                }),
                // same for carouselDescription, addToCartText if needed
            },
        },
    };
}
