import { useEffect } from "react";
import {
    BlockStack,
    Card,
    Page,
    Text,
    Button,
    InlineStack,
    Badge,
    MediaCard,
    VideoThumbnail,
    Box,
    InlineGrid,
    Icon,
    ProgressBar,
} from "@shopify/polaris";
import { onCLS, onINP, onLCP } from 'web-vitals'
// import { getFeedsByShop } from "../../services/feed/feed.service.server";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../../config/shopify.server";
import { PlayCircleIcon, QuestionCircleIcon, ChatIcon,  NotificationIcon, SlideshowIcon, StatusIcon, LayoutPopupIcon, LayoutColumns3Icon } from '@shopify/polaris-icons';

export const loader = async ({ request }) => {
    try {
        const { session } = await authenticate.admin(request);
        // const feeds = await getFeedsByShop(session.shop);
        const feeds = [];
        return { feeds };
    } catch (error) {
        console.error("Error fetching feeds:", error);
        return { feeds: [] };
    }
};

export default function IndexPage() {
    const { feeds } = useLoaderData();
    const navigate = useNavigate();

    useEffect(() => {
        onCLS(console.log);
        onINP(console.log);
        onLCP(console.log);
    }, []);

    const widgetTypes = [
        {
            id: 1,
            name: 'Carousel',
            description: 'Show your videos in a scrollable carousel. Add the template to your store and customize its layout, products, and style in the theme editor.',
            image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
            icon: SlideshowIcon,
            onAction: () => {
                navigate('/app/feeds/new?widgetType=carousel');
            }
        },
        {
            id: 2,
            name: 'Stories',
            description: 'Create story-style videos similar to social media. Add the template and let customers explore products through interactive stories.',
            image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
            icon: StatusIcon,
            onAction: () => {
                navigate('/app/feeds/new?widgetType=stories');
            }
        },
        {
            id: 3,
            name: 'Floating',
            description: 'Add a floating video widget that appears while customers browse. Great for promotions, demos, and quick product discovery.',
            image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
            icon: LayoutPopupIcon,
            onAction: () => {
                navigate('/app/feeds/new?widgetType=floating');
            }
        },
        {
            id: 4,
            name: 'Grid',
            description: 'Display videos in a clean grid layout. Insert the template and create a visual video gallery anywhere on your store.',
            image: 'https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850',
            icon: LayoutColumns3Icon,
            onAction: () => {
                navigate('/app/feeds/new?widgetType=grid');
            }
        },
    ];



    console.log(feeds);

    return (
        <Page
            title="Video Cart"
            subtitle="Video Cart is a tool that helps you manage your video cart."
            titleMetadata={<Badge tone="info">1.0.0</Badge>}
            compactTitle
            primaryAction={<Button variant="tertiary" icon={NotificationIcon} size="slim">What's new</Button>}
        >
            <BlockStack gap="400">

                <MediaCard
                    title="Create your first shoppable video"
                    size="small"
                    description={`Upload a video and tag products to turn your content into an interactive shopping experience. Customers can watch, explore, and buy — all in one place.`}
                >
                    <VideoThumbnail
                        videoLength={80}
                        thumbnailUrl="https://images.wondershare.com/virbo/article/2024/shoppable-video-1.png?width=1850"
                        onClick={() => console.log('clicked')}
                    />
                </MediaCard>

                <Card>
                    <BlockStack gap="300">
                        <InlineStack align="start" blockAlign="center" gap="400" wrap={false}>
                            <BlockStack gap="100">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Plan</Text>
                                <Badge tone="info">Free</Badge>
                            </BlockStack>
                            <div style={{ width: '1px', height: 'stretch', backgroundColor: '#e3e3e3' }} />
                            <Box width="100%" >
                                <InlineStack align="start" blockAlign="center" gap="200" wrap={false}>
                                    <Box width="100%">
                                        <ProgressBar progress={80} size="small" tone="critical" />
                                    </Box>
                                    <Text as="p" variant="bodyMd">Limit</Text>
                                </InlineStack>
                                <div style={{ paddingTop: '8px' }} />
                                <Button size="slim">View Billing</Button>
                            </Box>
                        </InlineStack>
                    </BlockStack>
                </Card>

                <Card>
                    <BlockStack gap="400">
                        <BlockStack gap="100">
                            <Text as="h2" variant="headingMd">Widget Types</Text>
                            <Text as="p" variant="bodyMd" tone="subdued">Choose the type of widget you want to use to display your video cart.</Text>
                        </BlockStack>
                        <InlineGrid columns={2} gap="200">


                            {widgetTypes.map((widgetType) => (
                                <Box
                                key={widgetType.id}
                                background="bg-surface-secondary"
                                borderRadius="200"
                                borderWidth="0165"
                                borderColor="border"
                                overflow="hidden"
                            >
                                <Box position="relative" >
                                    <Box
                                        background="bg-fill-secondary"
                                        borderRadius="100"
                                        minHeight="120px"
                                        position="relative"
                                    >
                                        <BlockStack gap="100">

                                            <Box  borderStartStartRadius="200" borderEndStartRadius="200" >
                                                <InlineStack gap="100" wrap={false} blockAlign="center">
                                                    {/* {[

                                                        'https://docs.aspose.com/svg/images/drawing/viewport2_1.png',
                                                    ].map((src, i) => ( */}
                                                            <Box
                                                            minWidth="48px"
                                                            minHeight="64px"
                                                            borderRadius="100"
                                                            overflow="hidden"
                                                            background="bg-fill-tertiary"
                                                        >
                                                            <img
                                                                alt=""
                                                                src={widgetType.image}
                                                                style={{
                                                                    objectFit: 'cover',
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    display: 'block',
                                                                    borderTopLeftRadius:'10px',
                                                                    borderTopRightRadius:'10px',
                                                                }}
                                                            />
                                                        </Box>
                                                    {/* ))} */}
                                                </InlineStack>
                                            </Box>
                                        </BlockStack>
                                        
                                    </Box>
                                </Box>

                                {/* Content area */}
                                <Box padding="300">
                                    <BlockStack gap="200">
                                        <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
                                            <InlineStack gap="100" blockAlign="center">
                                                <Icon source={widgetType.icon} tone="subdued" />
                                                <Text as="h2" variant="headingMd" fontWeight="bold">
                                                   {widgetType.name}
                                                </Text>
                                            </InlineStack>
                                            {/* <Badge tone="subdued">Inactive</Badge> */}
                                        </InlineStack>
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                                {widgetType.description}
                                        </Text>
                                        <InlineStack align="end" blockAlign="end">
                                            <Button size="slim" onClick={widgetType.onAction}>
                                                Create
                                            </Button>
                                        </InlineStack>
                                    </BlockStack>
                                </Box>
                            </Box>
                            ))}

                            
                        </InlineGrid>
                    </BlockStack>
                </Card>

                <Card >
                    <BlockStack gap="200">
                        <InlineStack gap="200">
                            <Text as="h2" variant="headingMd">Need help ?</Text>
                            <Badge tone="info">Free Setup Assistance</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">Our team is here to help you get started with Video Cart. We offer free setup assistance to help you get the most out of our platform.</Text>


                        <InlineGrid columns={3}>
                            <Box padding="300" background="bg-surface-secondary" borderEndStartRadius="200" borderStartStartRadius="200" borderWidth="0165" borderColor="border">
                                <BlockStack gap="200">
                                    <InlineStack align="start" blockAlign="start" gap="200">
                                        <BlockStack gap="100">
                                            <Icon source={ChatIcon} />
                                        </BlockStack>
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">Live Chat</Text>
                                    </InlineStack>
                                    <Text as="p" variant="bodyMd">24/7 live chat support to help you instantly whenever you need assistance.</Text>
                                    <InlineStack>
                                        <Button variant="primary" size="slim">Chat with us</Button>
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                            <Box padding="300" background="bg-surface-secondary" borderWidth="0165" borderColor="border">
                                <BlockStack gap="200">
                                    <InlineStack align="start" blockAlign="start" gap="200">
                                        <BlockStack gap="100">
                                            <Icon source={PlayCircleIcon} />
                                        </BlockStack>
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">Video Tutorials</Text>
                                    </InlineStack>
                                    <Text as="p" variant="bodyMd">Learn quickly with short, easy-to-follow video tutorials.</Text>
                                    <InlineStack>
                                        <Button size="slim">Watch tutorials</Button>
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                            <Box padding="300" background="bg-surface-secondary" borderWidth="0165" borderColor="border" borderEndEndRadius="200" borderStartEndRadius="200">
                                <BlockStack gap="200">
                                    <InlineStack align="start" blockAlign="start" gap="200">
                                        <BlockStack gap="100">
                                            <Icon source={QuestionCircleIcon} />
                                        </BlockStack>
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">Help Center</Text>
                                    </InlineStack>
                                    <Text as="p" variant="bodyMd">Find answers fast with our detailed guides and documentation.</Text>
                                    <InlineStack>
                                        <Button size="slim">Read documentation</Button>
                                    </InlineStack>
                                </BlockStack>
                            </Box>

                        </InlineGrid>
                    </BlockStack>

                </Card>

            </BlockStack>

        </Page>
    );
}