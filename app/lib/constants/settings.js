/**
 * Default values for the feed editor form.
 * Single source of truth for all settings fields.
 */
const DEFAULT_SETTINGS = {
    general: {
        addToCartButtonBehavior: "addToCart",

        // future: showPrice: true, maxProducts: 4, ...
    },
    design: {
        // future: theme: "light", cardStyle: "minimal", ...
    },
    translation: {
        carouselTitle: "Check out these products",
        carouselDescription: "These products are available for purchase",
        addToCartText: "Shop Now",
        // future: viewAllText: "View all", ...
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
export function getFeedFormDefaultValues(feed) {
    return {
        feedName: feed?.feedName ?? getDefaultFeedName(),
        widgetType: feed?.widgetType ?? "carousel",
        isEnabled: feed?.isEnabled ?? true,
        widgetPage: feed?.widgetPage ?? "homePage",
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
