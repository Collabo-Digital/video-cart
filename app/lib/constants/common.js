import { SlideshowIcon, StatusIcon, LayoutPopupIcon, LayoutColumns3Icon } from '@shopify/polaris-icons';

export const WIDGET_TYPES = [
    {
        id: 1,
        name: 'Carousel',
        description: 'Show your videos in a scrollable carousel. Add the template to your store and customize its layout, products, and style in the theme editor.',
        image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
        icon: SlideshowIcon,
        redirectTo: '/app/feeds/new?widgetType=carousel',
    },
    {
        id: 2,
        name: 'Stories',
        description: 'Create story-style videos similar to social media. Add the template and let customers explore products through interactive stories.',
        image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
        icon: StatusIcon,
        redirectTo: '/app/feeds/new?widgetType=stories',
    },
    {
        id: 3,
        name: 'Floating',
        description: 'Add a floating video widget that appears while customers browse. Great for promotions, demos, and quick product discovery.',
        image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
        icon: LayoutPopupIcon,
        redirectTo: '/app/feeds/new?widgetType=floating',
    },
    {
        id: 4,
        name: 'Grid',
        description: 'Display videos in a clean grid layout. Insert the template and create a visual video gallery anywhere on your store.',
        image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
        icon: LayoutColumns3Icon,
        redirectTo: '/app/feeds/new?widgetType=grid',
    },
];