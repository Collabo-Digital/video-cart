import { DEFAULT_SETTINGS } from "./settings";

const DEFAULT_DEVICE_SETTINGS = {
    isVisible: true,
    layoutStyle: "floating",
    floatingPosition: "bottom",
    floatingBgColor: "#111827",
    inlinePosition: "nav",
    inlineInsertMode: "append",
    showNavIcon: true,
    iconPosition: "bottomBar",
    navLabel: "Videos",
};

const DEFAULT_VIDEO_DISCOVERY = {
    isEnabled: false,
    feedSource: "all",
    selectedFeedIds: [],
    sortOrder: "newest",
    desktop: { ...DEFAULT_DEVICE_SETTINGS },
    mobile: { ...DEFAULT_DEVICE_SETTINGS },
};

export function getAppSettingsFormDefaults(saved) {
    const { videoDiscovery: savedVD, ...savedGeneralRest } = saved?.general ?? {};
    const { desktop: savedDesktop, mobile: savedMobile, ...savedVDRest } = savedVD ?? {};

    return {
        settings: {
            general: {
                ...DEFAULT_SETTINGS.general,
                ...savedGeneralRest,
                videoDiscovery: {
                    ...DEFAULT_VIDEO_DISCOVERY,
                    ...savedVDRest,
                    desktop: { ...DEFAULT_DEVICE_SETTINGS, ...savedDesktop },
                    mobile: { ...DEFAULT_DEVICE_SETTINGS, ...savedMobile },
                },
            },
            design: {
                ...DEFAULT_SETTINGS.design,
                ...saved?.design,
            },
            translation: {
                ...DEFAULT_SETTINGS.translation,
                videoDiscoveryPageTitle: "Video Discovery",
                videoDiscoveryPageDescription: "Explore products through video",
                videoDiscoveryNavLabel: "Videos",
                videoDiscoveryEmptyText: "No videos are available at this time.",
                ...saved?.translation,
            },
        },
    };
}