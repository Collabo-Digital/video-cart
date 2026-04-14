import { ChatIcon, PlayCircleIcon, QuestionCircleIcon } from "@shopify/polaris-icons";

export const SHOPPABLE_VIDEO_THUMBNAIL =
    "https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850";

export const LOOM_PREVIEW_URL =
    "https://www.loom.com/embed/7718a14c87f04d84ac4c1d88045bf91f";

export const SUPPORT_CARDS = [
    {
        id: "live-chat",
        icon: ChatIcon,
        title: "Live Chat",
        description:
            "24/7 live chat support to help you instantly whenever you need assistance.",
        action: { label: "Chat with us", variant: "primary", available: true },
    },
    {
        id: "video-tutorials",
        icon: PlayCircleIcon,
        title: "Video Tutorials",
        description: "Learn quickly with short, easy-to-follow video tutorials.",
        action: { label: "Available soon", variant: "secondary", available: false },
    },
    {
        id: "help-center",
        icon: QuestionCircleIcon,
        title: "Help Center",
        description:
            "Find answers fast with our detailed guides and documentation.",
        action: { label: "Available soon", variant: "secondary", available: false },
    },
];