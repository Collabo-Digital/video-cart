import { useEffect, useRef, useState } from "react";
import {
    ActionList,
    Badge,
    BlockStack,
    Box,
    Button,
    Card,
    Icon,
    InlineGrid,
    InlineStack,
    MediaCard,
    Page,
    Popover,
    ProgressBar,
    Text,
    VideoThumbnail,
} from "@shopify/polaris";
import {
    NotificationIcon,
    PlusIcon,
} from "@shopify/polaris-icons";
import { Crisp } from "crisp-sdk-web";
import { useLoaderData, useNavigate } from "react-router";

import { authenticate } from "../../config/shopify.server";
import { WIDGET_TYPES } from "../../lib/constants/common";
import { toClientShop } from "../../lib/dto/shop";
import useLocalStorage from "../../lib/hooks/useLocalStorage";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import { getNextResetDate, getPercentage } from "../../lib/utils/common";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";
import { initCrisp } from "../../lib/utils/intiCrisp";
import * as ShopModel from "../../models/shop.server";
import * as VideoModel from "../../models/video.server";
import { getOverallDataMetricsForVideoIds } from "../../services/mux/mux-metrics.service.server";
import { SHOPPABLE_VIDEO_THUMBNAIL, LOOM_PREVIEW_URL, SUPPORT_CARDS } from "../../lib/constants/homePage";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);

    try {
        let shopData = await ShopModel.findByDomain(session.shop);

        if (!shopData) {
            return apiError("Shop not found", {
                route: "app-index",
                layer: "route",
                code: "SHOP_NOT_FOUND",
                statusCode: 404,
            });
        }

        const now = new Date();
        const limits = shopData.planLimits ?? {};

        // Reset monthly view counts when the billing cycle rolls over.
        // resetDate is stored as an ISO string, so parse it before comparing —
        // comparing a string directly against a Date coerces to NaN (always false).
        const resetAt = limits.resetDate ? new Date(limits.resetDate).getTime() : 0;
        let didReset = false;
        if (!limits.resetDate || Number.isNaN(resetAt) || resetAt <= now.getTime()) {
            limits.videoViewCount = 0;
            limits.videoViewLimitReached = false;
            limits.resetDate = getNextResetDate(now).toISOString();
            shopData = await ShopModel.updateByDomain(session.shop, {
                planLimits: limits,
            });
            didReset = true;
        }

        const resetDate = new Date(shopData.planLimits.resetDate);
        const cycleStart = new Date(resetDate);
        cycleStart.setDate(cycleStart.getDate() - 30);
        const dateWindow = { startDate: cycleStart, endDate: new Date() };

        const shopVideos = await VideoModel.findVideoIdsAndPlaybackIdsByShop(
            session.shop
        );

        let muxMetrics = null;
        // Skip Mux on the request where the cycle just reset: the window is
        // [now, now] (0 views this cycle) and Mux rejects a zero-length timeframe.
        if (shopVideos.length > 0 && !didReset) {
            muxMetrics = await getOverallDataMetricsForVideoIds(
                shopVideos,
                30,
                dateWindow
            );
        }

        // Flag if the shop has reached its view limit for this cycle
        const viewLimitReached =
            muxMetrics?.aggregate?.views >= shopData?.planLimits?.videoViewLimit;

        if (viewLimitReached && !limits.videoViewLimitReached) {
            limits.videoViewLimitReached = true;
            shopData = await ShopModel.updateByDomain(session.shop, {
                planLimits: limits,
            });
        }

        // Never return `session` or the raw shop record — both carry the Admin
        // API access token, which would be serialized into the client HTML.
        return apiSuccess({ feeds: [], shopData: toClientShop(shopData), muxMetrics });
    } catch (error) {
        console.error("Error fetching feeds:", error);

        captureRouteError(error, {
            route: "app-index",
            url: request.url,
            method: request.method,
            shop: session?.shop ?? "unknown",
            extras: {
                requestId: request.id,
            },
        });

        return apiError(error, {
            route: "app-index",
            layer: "route",
            code: "FETCH_FEEDS_ERROR",
            statusCode: 500,
            requestId: request.id,
        });
    }
};


function PlanUsageCard({ shopData, totalViews, onBillingClick }) {
    const viewLimit = shopData?.planLimits?.videoViewLimit ?? 0;
    const progressValue = getPercentage(totalViews, viewLimit);
    const progressTone = progressValue >= 80 ? "critical" : "highlight";

    return (
        <Card>
            <BlockStack gap="300">
                <InlineStack align="start" blockAlign="center" gap="400" wrap={false}>
                    <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                            Plan
                        </Text>
                        <Badge tone="info">{shopData?.appPlan ?? "Free"}</Badge>
                    </BlockStack>

                    <div
                        style={{ width: "1px", alignSelf: "stretch", backgroundColor: "#e3e3e3" }}
                        aria-hidden
                    />

                    <Box width="100%">
                        <InlineStack
                            align="center"
                            blockAlign="center"
                            gap="200"
                            wrap={false}
                        >
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                                {totalViews}
                            </Text>
                            <Box width="100%">
                                <ProgressBar
                                    progress={progressValue}
                                    size="small"
                                    tone={progressTone}
                                />
                            </Box>
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                                {viewLimit}
                            </Text>
                        </InlineStack>

                        <Box paddingBlockStart="200">
                            <Button size="slim" onClick={onBillingClick}>
                                View Billing
                            </Button>
                        </Box>
                    </Box>
                </InlineStack>
            </BlockStack>
        </Card>
    );
}

function WidgetTypeCard({ widgetType, isPopoverOpen, onPopoverToggle, onPopoverClose, onNavigate }) {
    return (
        <Box
            background="bg-surface-secondary"
            borderRadius="200"
            borderWidth="0165"
            borderColor="border"
        >
            <Box
                background="bg-fill-secondary"
                borderRadius="100"
                minHeight="120px"
            >
                <Box
                    minWidth="48px"
                    minHeight="64px"
                    borderRadius="100"
                    background="bg-fill-tertiary"
                >
                    <img
                        alt={widgetType.name}
                        src={widgetType.image}
                        style={{
                            display: "block",
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderTopLeftRadius: "10px",
                            borderTopRightRadius: "10px",
                        }}
                    />
                </Box>
            </Box>
            <Box padding="300">
                <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
                        <InlineStack gap="100" blockAlign="center">
                            <Icon source={widgetType.icon} tone="subdued" />
                            <Text as="h2" variant="headingMd" fontWeight="bold">
                                {widgetType.name}
                            </Text>
                        </InlineStack>
                    </InlineStack>

                    <Text as="p" variant="bodyMd" tone="subdued">
                        {widgetType.description}
                    </Text>

                    <InlineStack align="end">
                        <Popover
                            active={isPopoverOpen}
                            autofocusTarget="first-node"
                            onClose={onPopoverClose}
                            activator={
                                <Button
                                    icon={PlusIcon}
                                    size="slim"
                                    onClick={onPopoverToggle}
                                >
                                    Create
                                </Button>
                            }
                        >
                            <ActionList
                                actionRole="menuitem"
                                items={widgetType.widgetPageOptions.map((option) => ({
                                    content: option.content,
                                    icon: option.icon,
                                    onAction: () => onNavigate(option.redirectTo),
                                }))}
                            />
                        </Popover>
                    </InlineStack>
                </BlockStack>
            </Box>
        </Box>
    );
}


function SupportCard({ onChatClick }) {
    const borderRadiusByIndex = {
        0: {
            borderEndStartRadius: "200",
            borderStartStartRadius: "200",
        },
        2: {
            borderEndEndRadius: "200",
            borderStartEndRadius: "200",
        },
    };

    return (
        <Card>
            <BlockStack gap="200">
                <InlineStack gap="200">
                    <Text as="h2" variant="headingMd">
                        Need help?
                    </Text>
                    <Badge tone="info">Free Setup Assistance</Badge>
                </InlineStack>

                <Text as="p" variant="bodyMd" tone="subdued">
                    Our team is here to help you get started with Video Cart. We offer
                    free setup assistance to help you get the most out of our platform.
                </Text>

                <InlineGrid columns={3}>
                    {SUPPORT_CARDS.map((card, index) => (
                        <Box
                            key={card.id}
                            padding="300"
                            background="bg-surface-secondary"
                            borderWidth="0165"
                            borderColor="border"
                            {...(borderRadiusByIndex[index] ?? {})}
                        >
                            <BlockStack gap="200">
                                <InlineStack align="start" blockAlign="start" gap="200">
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {card.title}
                                    </Text>
                                    <InlineStack>
                                        <Icon source={card.icon} />
                                    </InlineStack>
                                </InlineStack>

                                <Text as="p" variant="bodyMd" tone="subdued">
                                    {card.description}
                                </Text>

                                <InlineStack>
                                    <Button
                                        variant={card.action.available ? "primary" : undefined}
                                        disabled={!card.action.available}
                                        size="slim"
                                        onClick={card.action.available ? onChatClick : undefined}
                                    >
                                        {card.action.label}
                                    </Button>
                                </InlineStack>
                            </BlockStack>
                        </Box>
                    ))}
                </InlineGrid>
            </BlockStack>
        </Card>
    );
}

export default function IndexPage() {
    const loaderData = useLoaderData();
    const { shopData, muxMetrics } = loaderData?.data ?? {};

    const totalViews = muxMetrics?.aggregate?.views ?? 0;

    const navigate = useNavigate();
    const modalRef = useRef(null);

    const [activePopoverId, setActivePopoverId] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const [, setShopDataLocalStorage] = useLocalStorage("shopData", shopData);

    const handleOpenPreview = () => {
        setIsPreviewOpen(true);
        modalRef.current?.showOverlay?.();
    };

    const handleChatWithUs = () => {
        Crisp.chat.open();
    };

    const handlePopoverToggle = (id) => {
        setActivePopoverId((prev) => (prev === id ? null : id));
    };

    const handlePopoverClose = () => setActivePopoverId(null);

    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;

        const handleAfterHide = () => setIsPreviewOpen(false);
        el.addEventListener("afterhide", handleAfterHide);

        return () => el.removeEventListener("afterhide", handleAfterHide);
    }, []);

    useEffect(() => {
        if (shopData) {
            initCrisp(shopData);
            // shopData is the token-free DTO (see loader); safe to cache.
            setShopDataLocalStorage(shopData);
        }
    }, [shopData]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Page
            title="Video Cart"
            subtitle="Manage your shoppable video experiences."
            titleMetadata={<Badge tone="magic">1.0.0</Badge>}
            compactTitle
            primaryAction={
                <Button variant="tertiary" icon={NotificationIcon} size="slim">
                    What's new
                </Button>
            }
        >
            <BlockStack gap="400">
                <PlanUsageCard
                    shopData={shopData}
                    totalViews={totalViews}
                    onBillingClick={() => navigate("/app/pricing")}
                />

                <MediaCard
                    title="Create your first shoppable video"
                    size="small"
                    description="Upload a video and tag products to turn your content into an interactive shopping experience. Customers can watch, explore, and buy — all in one place."
                >
                    <VideoThumbnail
                        videoLength={80}
                        thumbnailUrl={SHOPPABLE_VIDEO_THUMBNAIL}
                        onClick={handleOpenPreview}
                    />
                </MediaCard>

                <Card>
                    <BlockStack gap="400">
                        <BlockStack gap="100">
                            <Text as="h2" variant="headingMd">
                                Widget Types
                            </Text>
                            <Text as="p" variant="bodyMd" tone="subdued">
                                Choose the type of widget you want to use to display your video
                                cart.
                            </Text>
                        </BlockStack>

                        <InlineGrid columns={2} gap="200">
                            {WIDGET_TYPES.map((widgetType) => (
                                <WidgetTypeCard
                                    key={widgetType.id}
                                    widgetType={widgetType}
                                    isPopoverOpen={activePopoverId === widgetType.id}
                                    onPopoverToggle={() => handlePopoverToggle(widgetType.id)}
                                    onPopoverClose={handlePopoverClose}
                                    onNavigate={navigate}
                                />
                            ))}
                        </InlineGrid>
                    </BlockStack>
                </Card>

                <SupportCard onChatClick={handleChatWithUs} />
            </BlockStack>

            <s-modal
                ref={modalRef}
                id="youtube-preview-modal"
                heading="Shoppable video preview"
                size="large"
                padding="none"
            >
                {isPreviewOpen && (
                    <div
                        style={{
                            position: "relative",
                            paddingBottom: "48.13%",
                            height: 0,
                        }}
                    >
                        <iframe
                            title="Shoppable video preview"
                            src={LOOM_PREVIEW_URL}
                            frameBorder="0"
                            webkitallowfullscreen
                            mozallowfullscreen
                            allowFullScreen
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    </div>
                )}

                <s-button
                    slot="secondary-actions"
                    variant="secondary"
                    commandFor="youtube-preview-modal"
                    command="--hide"
                >
                    Close
                </s-button>
            </s-modal>
        </Page>
    );
}