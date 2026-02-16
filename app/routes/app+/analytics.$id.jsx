/**
 * GET /app/analytics/:id
 * Analytics for a feed or a video. Param: fdid-<feedId> or vdid-<videoId>
 * e.g. fdid-697b06a080826b8a91a722ac or vdid-697b06a080826b8a91a722ac
 */

const FEED_ID_PREFIX = "fdid";
const VIDEO_ID_PREFIX = "vdid";

/**
 * Parse analytics param: fdid-<id> = feed, vdid-<id> = video.
 * @returns {{ type: 'feed'|'video', id: string }|null}
 */
function parseAnalyticsParam(param) {
  if (typeof param !== "string") return null;

  const trimmed = param.trim();
  const [prefix, id] = trimmed.split("_");

  if (!id) return null;

  if (prefix === FEED_ID_PREFIX) {
    return { type: "feed", id };
  }

  if (prefix === VIDEO_ID_PREFIX) {
    return { type: "video", id };
  }

  return null;
}


import {
  Page,
  InlineGrid,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Badge,
  Box,
  Layout,
  Tabs,
  ResourceItem,
  Avatar,
} from "@shopify/polaris";
import { useState } from "react";
import PropTypes from "prop-types";
import { useLoaderData } from "react-router";
import { authenticate } from "../../config/shopify.server";
import * as VideoModel from "../../models/video.server";
import * as FeedModel from "../../models/feed.server";
import { getFeedById } from "../../services/feed/feed.service.server";
import { getFeedAnalytics, getVideoAnalytics } from "../../services/analytics/analytics.service.server";
import { getOverallDataMetricsForVideoIds } from "../../services/mux/mux-metrics.service.server";
import {
  CircleLeftIcon, CircleRightIcon
} from '@shopify/polaris-icons';

/** Default analytics date range: last 30 days */
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { startDate: start, endDate: end };
}

export const loader = async ({ params, request }) => {
  const { session } = await authenticate.admin(request);
  const raw = params.id;
  if (!raw) {
    throw new Response("Missing id", { status: 400 });
  }

  const parsed = parseAnalyticsParam(raw);
  if (!parsed) {
    throw new Response(
      "Invalid id: use fdid-<feedId> for a feed or vdid-<videoId> for a video",
      { status: 400 }
    );
  }

  const { type: paramType, id } = parsed;
  let type = null;
  let title = null;
  let videos = [];
  let entityId = id;
  const { startDate, endDate } = getDefaultDateRange();

  if (paramType === "feed") {
    const feed = await getFeedById(id, session.shop);
    type = "feed";
    title = feed.feedName ?? "Feed";
    entityId = feed.id;

    const feedVideos = feed.videos ?? [];
    if (feedVideos.length === 0) {
      videos = [];
    } else {
      const videoIds = feedVideos.map((fv) => fv.videoId);
      const videoRecords = await VideoModel.findManyByIds(videoIds);
      const titleMap = new Map(
        (videoRecords || []).map((v) => [v.id, v.fileName ?? v.title ?? null])
      );
      videos = feedVideos.map((fv) => ({
        videoId: fv.videoId,
        playbackId: fv.playbackId,
        position: fv.position,
        productsTagged: fv.productsTagged || [],
        title: titleMap.get(fv.videoId) ?? "Untitled",
      }));
    }

    const analytics = await getFeedAnalytics(entityId, startDate, endDate);
    const muxMetrics = await getOverallDataMetricsForVideoIds(
      videos.map((v) => ({ videoId: v.videoId, playbackId: v.playbackId ?? null })),
      30
    );
    return {
      type,
      entityId,
      title,
      videos,
      analytics,
      muxMetrics,
    };

  }

  const video = await VideoModel.findById(id);
  if (!video) {
    throw new Response("Video not found", { status: 404 });
  }
  type = "video";
  title = video.fileName ?? video.title ?? "Video";
  entityId = video.id;
  const playbackId = video.videoPlaybackId ?? null;

  // Fetch all feeds that contain this video (model filters by shop and non-deleted)
  const feedVideos = await FeedModel.findFeedVideosByVideoId(entityId, session.shop);

  const relatedFeeds = feedVideos.map((fv) => ({
    feedId: fv.feed.id,
    feedName: fv.feed.feedName,
    widgetId: fv.feed.widgetId,
    productsTagged: fv.productsTagged || [],
    position: fv.position,
    playbackId: fv.playbackId,
  }));

  // Fetch analytics for each related feed
  const relatedFeedsAnalytics = await Promise.all(
    relatedFeeds.map(async (feed) => {
      const feedAnalytics = await getFeedAnalytics(feed.feedId, startDate, endDate);
      
      // Extract video-specific analytics for this video from the feed analytics
      const videoAnalyticsInFeed = feedAnalytics?.videos?.find(
        (v) => v.videoId === entityId
      ) || null;

      return {
        feedId: feed.feedId,
        analytics: feedAnalytics,
        videoAnalytics: videoAnalyticsInFeed, // Video-specific analytics in this feed
      };
    })
  );

  // Create a map of feedId -> analytics for easy lookup
  const relatedFeedsAnalyticsMap = new Map(
    relatedFeedsAnalytics.map((item) => [item.feedId, item])
  );

  // Attach analytics to each related feed, including video-specific metrics
  const relatedFeedsWithAnalytics = relatedFeeds.map((feed) => {
    const analyticsData = relatedFeedsAnalyticsMap.get(feed.feedId);
    return {
      ...feed,
      analytics: analyticsData?.analytics || null, // Overall feed analytics
      videoAnalytics: analyticsData?.videoAnalytics || null, // This video's analytics in this feed
      // Convenience fields for easy access
      videoRevenue: analyticsData?.videoAnalytics?.revenue || 0,
      videoOrders: analyticsData?.videoAnalytics?.orders || 0,
      videoViews: analyticsData?.videoAnalytics?.videoViews || 0,
      videoProductClicks: analyticsData?.videoAnalytics?.productClicks || 0,
      videoAddToCart: analyticsData?.videoAnalytics?.addToCart || 0,
    };
  });

  // Collect all productsTagged from all feeds (flattened, unique by product id)
  const allProductsTagged = [];
  const productIdsSeen = new Set();
  for (const fv of feedVideos) {
    const products = Array.isArray(fv.productsTagged) ? fv.productsTagged : [];
    for (const product of products) {
      if (product?.id && !productIdsSeen.has(product.id)) {
        productIdsSeen.add(product.id);
        allProductsTagged.push(product);
      }
    }
  }

  videos = [
    {
      videoId: video.id,
      playbackId,
      title: video.fileName ?? video.title ?? "Untitled",
      productsTagged: allProductsTagged,
      status: video.status,
      duration: video.duration,
    },
  ];

  // Fetch overall analytics for this video (across all feeds)
  const analytics = await getVideoAnalytics(entityId, startDate, endDate);
  const muxMetrics = await getOverallDataMetricsForVideoIds(
    [{ videoId: entityId, playbackId }],
    30
  );
  const hasMux = muxMetrics.aggregate.views > 0 || muxMetrics.aggregate.totalWatchTimeSeconds > 0 ||
    Object.keys(muxMetrics.byVideoId).length > 0;
  return {
    type,
    entityId,
    title,
    videos,
    analytics,
    muxMetrics: hasMux ? muxMetrics : null,
    relatedFeeds: relatedFeedsWithAnalytics, // Related feeds with their analytics
  };
};

function formatWatchTime(seconds) {
  if (seconds == null || seconds < 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatRevenue(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function formatNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US").format(n);
}

export default function AnalyticsByIdPage() {
  const { type, title, videos, analytics, muxMetrics, entityId } = useLoaderData();
  const [selectedVideoId, setSelectedVideoId] = useState(() =>
    type === "video" ? entityId : videos[0]?.videoId ?? undefined
  );

  const summary =
    type === "feed"
      ? [
          // { label: "Widget impressions", value: analytics?.widget?.impressions ?? 0, isRevenue: false },
          // { label: "Widget views", value: analytics?.widget?.views ?? 0, isRevenue: false },
          // { label: "Widget clicks", value: analytics?.widget?.clicks ?? 0, isRevenue: false },
          // { label: "Video plays", value: analytics?.widget?.videoPlays ?? 0, isRevenue: false },
          { label: "Product clicks", value: analytics?.widget?.productClicks ?? 0, isRevenue: false },
          { label: "Add to cart", value: analytics?.widget?.addToCart ?? 0, isRevenue: false },
          { label: "Orders", value: analytics?.widget?.orders ?? 0, isRevenue: false },
          { label: "Revenue", value: Number(analytics?.widget?.revenue ?? 0), isRevenue: true },
        ]
      : [
          { label: "Video impressions", value: analytics?.video?.videoImpressions ?? 0, isRevenue: false },
          { label: "Video views", value: analytics?.video?.videoViews ?? 0, isRevenue: false },
          { label: "Product clicks", value: analytics?.video?.productClicks ?? 0, isRevenue: false },
          { label: "ATC clicks", value: analytics?.video?.atcClicks ?? 0, isRevenue: false },
          { label: "Add to cart", value: analytics?.video?.addToCart ?? 0, isRevenue: false },
          { label: "Orders", value: analytics?.video?.orders ?? 0, isRevenue: false },
          { label: "Revenue", value: Number(analytics?.video?.revenue ?? 0), isRevenue: true },
        ];
  const currentIndex = videos.findIndex((v) => v.videoId === selectedVideoId);
  const selectedVideo = currentIndex >= 0 ? videos[currentIndex] : null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < videos.length - 1;

  const goPrev = () => {
    if (hasPrev) setSelectedVideoId(videos[currentIndex - 1].videoId);
  };
  const goNext = () => {
    if (hasNext) setSelectedVideoId(videos[currentIndex + 1].videoId);
  };

  const productsTagged = selectedVideoId && videos.find((v) => v.videoId === selectedVideoId)?.productsTagged;

  const tabs = [
    { id: 'overview', index: 0, content: 'Video Overview' },
    { id: 'products-tagged', index: 1, content: 'Products Tagged' },
  ];
  const [selected, setSelected] = useState(0);

  const handleTabChange = (selected) => {
    setSelected(selected);
  };

  const ProductsTaggedTab = ({ product }) => {
    return (
      <ResourceItem
        id={product?.id ?? ""}
        url={`/products/${product?.handle ?? ""}`}
        media={
          <Avatar
            source={product?.image ? product.image : undefined}
            initials={
              product?.image
                ? undefined
                : (product?.title || "?").slice(0, 1).toUpperCase()
            }
            accessibilityLabel={product?.title || "Product"}
          />
        }
        accessibilityLabel={`View details for ${product?.name ?? ""}`}
      >
        <Text variant="bodyMd" as="h3">
          {product?.title ?? ""}
        </Text>
      </ResourceItem>
    );
  };
  ProductsTaggedTab.propTypes = {
    product: PropTypes.shape({
      id: PropTypes.string,
      handle: PropTypes.string,
      image: PropTypes.string,
      title: PropTypes.string,
      name: PropTypes.string,
    }),
  };

  // Normalize analytics.videos and find analytics row for selected video
const videosAnalyticsArray = Array.isArray(analytics?.videos)
  ? analytics.videos
  : analytics?.videos
    ? Object.values(analytics.videos)
    : [];

const selectedVideoAnalytics =
  videosAnalyticsArray.find(
    (v) =>
      v.videoId === selectedVideoId ||
      v.videoId === selectedVideo?.videoId
  ) ?? null;

const videoOverview = [
  {
    label: "Views",
    value: muxMetrics?.byPlaybackId[selectedVideo?.playbackId]?.views ?? 0,
  },
  {
    label: "Average Watch Time",
    value: formatWatchTime(
      muxMetrics?.byPlaybackId[selectedVideo?.playbackId]?.avgWatchTimeSeconds ?? 0
    ),
  },
  {
    label: "Product Clicks",
    value: selectedVideoAnalytics?.productClicks ?? analytics?.video?.productClicks ?? 0,
  },
  {
    label: "Add to Cart",
    value: selectedVideoAnalytics?.addToCart ?? analytics?.video?.addToCart ?? 0,
  },
  {
    label: "Orders",
    value: selectedVideoAnalytics?.orders ?? analytics?.video?.orders ?? 0,
  },
  {
    label: "Revenue",
    value: selectedVideoAnalytics?.revenue ?? analytics?.video?.revenue ?? 0,
  },
];

  const VideoOverviewTab = () => {
    return (
      <BlockStack gap="400">
        <Box padding="300" borderRadius="200" >
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          {videoOverview.map(({ label, value }) => (
            <Box key={label} padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                {label}
              </Text>
              <Text as="p" variant="headingMd" fontWeight="semibold">
                {formatNumber(value)}
              </Text>
              </BlockStack>
            </Box>
          ))}
        </InlineGrid>
        </Box>
      </BlockStack>
    );
  };

  return (
      <Page
        title={title}
        // backAction={{ content: "Back", url: "/app/feeds" }}
        titleMetadata={type ? <Badge tone={type === "feed" ? "info" : "attention"}>{type === "feed" ? "Feed" : "Video"}</Badge> : null}
      >
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" wrap={false}>
                <Text as="h2" variant="headingMd">
               {type === "feed" ? "Feed Overview" : "Video Overview"}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Last 30 days
              </Text>
              </InlineStack>
              <InlineGrid columns={{ xs: 1, md: 4 }} gap="400">
                 {summary.map(({ label, value, isRevenue }) => (
                    <Box key={label} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          {label}
                        </Text>
                        <Text as="p" variant="headingMd" fontWeight="semibold">
                          {isRevenue ? formatRevenue(value) : formatNumber(value)}
                        </Text>
                      </BlockStack>
                    </Box>
                  ))}
              </InlineGrid>
            </BlockStack>
          </Card>

            <Layout>
          <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" wrap={false}>
                <Text as="h2" variant="headingMd">
                Video
              </Text>
              <InlineStack gap="200">
                <Button
                  icon={CircleLeftIcon}
                  onClick={goPrev}
                  disabled={!hasPrev}
                  accessibilityLabel="Previous video"
                />
                <Button
                  icon={CircleRightIcon}
                  onClick={goNext}
                  disabled={!hasNext}
                  accessibilityLabel="Next video"
                />
              </InlineStack>
              </InlineStack>
              <Box paddingBlockStart="200" borderRadius="200" background="bg-surface-secondary" minHeight="350px">
                {selectedVideo?.playbackId ? (
    <div
      style={{
        width: "100%",
        minHeight: "350px",
        maxHeight: "350px",
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--p-border-radius-200)",
      }}
    >
      <video
        style={{
          width: "100%",
          minHeight: "350px",
          height: "100%",
          maxHeight: "350px",
          objectFit: "contain",
          display: "block",
          background: "#000",
        }}
        controls
        src={`https://stream.mux.com/${selectedVideo.playbackId}.m3u8`}
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    </div>
  ) : (
    <Box padding="400">
      <Text as="p" tone="subdued">
        No video selected.
      </Text>
    </Box>
  )}
              </Box>
            </BlockStack>
          </Card>
          </Layout.Section>
          <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
               <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted>
                {selected === 1 ? productsTagged.map((product) => <ProductsTaggedTab key={product.id} product={product} />) : <VideoOverviewTab />}
                </Tabs>
            </BlockStack>
          </Card>
        {/* </InlineGrid> */}
          </Layout.Section>
        </Layout>
        </BlockStack>

        
        {/* <BlockStack gap="600">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" wrap={false}>
                <Text as="h2" variant="headingMd">
                  Overview
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Last 30 days
                </Text>
              </InlineStack>
              {summary.length > 0 ? (
                <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
                  {summary.map(({ label, value, isRevenue }) => (
                    <Box key={label} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          {label}
                        </Text>
                        <Text as="p" variant="headingMd" fontWeight="semibold">
                          {isRevenue ? formatRevenue(value) : formatNumber(value)}
                        </Text>
                      </BlockStack>
                    </Box>
                  ))}
                </InlineGrid>
              ) : (
                <Box padding="400">
                  <Text as="p" tone="subdued">
                    No analytics data for this period.
                  </Text>
                </Box>
              )}
            </BlockStack>
          </Card>

          <InlineGrid columns={{ xs: 1, md: 2 }} gap="600">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                  <Text as="h2" variant="headingMd">
                    Video
                  </Text>
                  {videos.length > 1 && (
                    <InlineStack gap="200">
                      <Button
                        icon={CircleLeftIcon}
                        onClick={goPrev}
                        disabled={!hasPrev}
                        accessibilityLabel="Previous video"
                      />
                      <Button
                        icon={CircleRightIcon}
                        onClick={goNext}
                        disabled={!hasNext}
                        accessibilityLabel="Next video"
                      />
                    </InlineStack>
                  )}
                </InlineStack>
                {videos.length > 1 && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Video {currentIndex + 1} of {videos.length}
                    {selectedVideo?.title ? ` · ${selectedVideo.title}` : ""}
                  </Text>
                )}
                {selectedVideo ? (
                  <Box paddingBlockStart="200">
                    <VideoDisplay video={selectedVideo} index={currentIndex} />
                  </Box>
                ) : (
                  <Box padding="400">
                    <Text as="p" tone="subdued">
                      No video selected.
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>

            <BlockStack gap="400">
              {muxPerVideo && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Playback metrics (this video)
                    </Text>
                    <Divider />
                    <BlockStack gap="200">
                      {[
                        { label: "Views", value: formatNumber(muxPerVideo.views ?? 0) },
                        { label: "Total watch time", value: formatWatchTime(muxPerVideo.totalWatchTimeSeconds ?? 0) },
                        { label: "Avg watch time", value: formatWatchTime(muxPerVideo.avgWatchTimeSeconds ?? 0) },
                        { label: "Viewer experience score", value: Number(muxPerVideo.viewerExperienceScore ?? 0).toFixed(1) },
                        { label: "Playback failure", value: `${Number(muxPerVideo.playbackFailurePercentage ?? 0).toFixed(2)}%` },
                        { label: "Rebuffer", value: `${Number(muxPerVideo.rebufferPercentage ?? 0).toFixed(2)}%` },
                      ].map(({ label, value }) => (
                        <InlineStack key={label} align="space-between" blockAlign="center" wrap={false}>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {label}
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="medium">
                            {value}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              {muxAggregate && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Playback metrics (overall)
                    </Text>
                    <Divider />
                    <BlockStack gap="200">
                      {[
                        { label: "Views", value: formatNumber(muxAggregate.views ?? 0) },
                        { label: "Total watch time", value: formatWatchTime(muxAggregate.totalWatchTimeSeconds) },
                        muxAggregate.avgWatchTimeSeconds != null && { label: "Avg watch time", value: formatWatchTime(muxAggregate.avgWatchTimeSeconds) },
                        muxAggregate.viewerExperienceScore != null && { label: "Viewer experience score", value: Number(muxAggregate.viewerExperienceScore).toFixed(1) },
                        muxAggregate.playbackFailurePercentage != null && { label: "Playback failure", value: `${Number(muxAggregate.playbackFailurePercentage).toFixed(2)}%` },
                        muxAggregate.rebufferPercentage != null && { label: "Rebuffer", value: `${Number(muxAggregate.rebufferPercentage).toFixed(2)}%` },
                      ].filter(Boolean).map(({ label, value }) => (
                        <InlineStack key={label} align="space-between" blockAlign="center" wrap={false}>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {label}
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="medium">
                            {value}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </InlineGrid>
        </BlockStack> */}
      </Page>
  );
}
