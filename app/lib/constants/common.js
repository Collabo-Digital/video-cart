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

export const APP_FREE_PLAN = {
    id: 1,
    name: 'Free',
    value: 'free',
    price: '0',
    description: 'For those getting started with shoppable videos.',
    features: [
        '500 views per month',
        '10 video uploads',
        'Unlimited Impression',
        'All app features'
    ],
};

export const APP_BILLING_PLANS = {
    Basic: {
        lineItems: [
            {
                amount: 9.99,
                currencyCode: 'USD',
                interval: 'EVERY_30_DAYS',
            },
        ],
    },
    Growth: {
        lineItems: [
            {
                amount: 49.99,
                currencyCode: 'USD',
                interval: 'EVERY_30_DAYS',
            },
        ],
    },
    Advanced: {
        lineItems: [
            {
                amount: 99.99,
                currencyCode: 'USD',
                interval: 'EVERY_30_DAYS',
            },
        ],
    },
};

export const APP_BILLING_PLANS_NAMES = ["Basic", "Growth", "Advanced"];

export const VIDEO_VIEW_LIMITS = {
    free: 500,
    basic: 10000,
    growth: 25000,
    advanced: 50000,
};
export const VIDEO_UPLOAD_LIMITS = {
    free: 10,
    basic: 25,
    growth: 50,
    advanced: 100,
};

export const APP_PAID_PLANS = [

    {
        id: 1,
        name: 'Basic',
        value: 'basic',
        price: '9.99',
        description: 'Ideal for small stores using shoppable videos.',
        features: [
            '10,000 views per month',
            '25 video uploads',
            'Unlimited Impression',
            'All app features',
        ],
    },
    {
        id: 2,
        name: 'Growth',
        value: 'growth',
        price: '49.99',
        description: 'Scale your video content as your store grows.',
        features: [
            '25,000 views per month',
            '50 video uploads',
            'Unlimited Impression',
            'All app features',
        ],
    }, {
        id: 3,
        name: 'Advanced',
        value: 'advanced',
        price: '99.99',
        description: 'Built for high-traffic stores using video at scale.',
        features: [
            '50,000 views per month',
            '100 video uploads',
            'Unlimited Impression',
            'All app features',
        ],
    },
];