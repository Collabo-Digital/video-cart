import { SlideshowIcon, StatusIcon, LayoutPopupIcon, LayoutColumns3Icon, HomeIcon, ProductIcon, DomainIcon } from '@shopify/polaris-icons';

export const WIDGET_TYPES = [
    {
        id: 1,
        name: 'Carousel',
        description: 'Show your videos in a scrollable carousel. Add the template to your store and customize its layout, products, and style in the theme editor.',
        image: '/widgetType/carousel-type.webp',
        icon: SlideshowIcon,
        redirectTo: '/app/feeds/new?widgetType=carousel',
        widgetPageOptions: [
            {
                content: 'Home Page',
                redirectTo: '/app/feeds/new?widgetType=carousel&widgetPage=homePage',
                icon: HomeIcon,
            }, {
                content: 'Product Page',
                redirectTo: '/app/feeds/new?widgetType=stories&widgetPage=productPage',
                icon: ProductIcon,
            }, {
                content: 'Collection Page',
                redirectTo: '/app/feeds/new?widgetType=floating&widgetPage=collectionPage',
                icon: DomainIcon,
            },
        ]
    },
    {
        id: 2,
        name: 'Stories',
        description: 'Create story-style videos similar to social media. Add the template and let customers explore products through interactive stories.',
        image: '/widgetType/stories-type.webp',
        icon: StatusIcon,
        redirectTo: '/app/feeds/new?widgetType=stories',
        widgetPageOptions: [
            {
                content: 'Home Page',
                redirectTo: '/app/feeds/new?widgetType=stories&widgetPage=homePage',
                icon: HomeIcon,
            }, {
                content: 'Product Page',
                redirectTo: '/app/feeds/new?widgetType=stories&widgetPage=productPage',
                icon: ProductIcon,
            },
            {
                content: 'Collection Page',
                redirectTo: '/app/feeds/new?widgetType=stories&widgetPage=collectionPage',
                icon: DomainIcon,
            },
        ]
    },
    {
        id: 3,
        name: 'Floating',
        description: 'Add a floating video widget that appears while customers browse. Great for promotions, demos, and quick product discovery.',
        image: '/widgetType/floating-type.webp',
        icon: LayoutPopupIcon,
        redirectTo: '/app/feeds/new?widgetType=floating',
        widgetPageOptions: [
            {
                content: 'Home Page',
                redirectTo: '/app/feeds/new?widgetType=floating&widgetPage=homePage',
                icon: HomeIcon,
            }, {
                content: 'Product Page',
                redirectTo: '/app/feeds/new?widgetType=floating&widgetPage=productPage',
                icon: ProductIcon,
            },
            {
                content: 'Collection Page',
                redirectTo: '/app/feeds/new?widgetType=floating&widgetPage=collectionPage',
                icon: DomainIcon,
            },
        ]
    },
    {
        id: 4,
        name: 'Grid',
        description: 'Display videos in a clean grid layout. Insert the template and create a visual video gallery anywhere on your store.',
        image: '/widgetType/grid-type.webp',
        icon: LayoutColumns3Icon,
        redirectTo: '/app/feeds/new?widgetType=grid',
        widgetPageOptions: [
            {
                content: 'Home Page',
                redirectTo: '/app/feeds/new?widgetType=grid&widgetPage=homePage',
                icon: HomeIcon,
            }, {
                content: 'Product Page',
                redirectTo: '/app/feeds/new?widgetType=grid&widgetPage=productPage',
                icon: ProductIcon,
            },
            {
                content: 'Collection Page',
                redirectTo: '/app/feeds/new?widgetType=grid&widgetPage=collectionPage',
                icon: DomainIcon,
            },
        ]
    },
];

export const APP_PLANS = [
    {
        id: 1,
        name: 'Free',
        value: 'free',
        description: 'For those getting started with shoppable videos.',
        features: [
            'Create unlimited widgets',
            '24/7 Customer Support',
        ],
    },
];