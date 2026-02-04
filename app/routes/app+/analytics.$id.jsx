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
  console.log("prefix ----->" , prefix);
  console.log("id ----->" , id);

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
  Frame,
  InlineGrid,
  Card,
  BlockStack,
  InlineStack,
  Button,
} from "@shopify/polaris";
import { useState } from "react";
import { useLoaderData } from "react-router";
import VideoDisplay from "../../components/VideoContainer/VideoContainer";
import { authenticate } from "../../config/shopify.server";
import * as VideoModel from "../../models/video.server";
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
  console.log("raw ----->" , raw);
  if (!raw) {
    throw new Response("Missing id", { status: 400 });
  }

  const parsed = parseAnalyticsParam(raw);
  console.log("parsed ----->" , parsed);
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
        (videoRecords || []).map((v) => [v.id, v.title ?? null])
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
    console.log("muxMetrics for feed", muxMetrics);
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
  title = video.title ?? "Video";
  entityId = video.id;
  const playbackId = video.videoPlaybackId ?? null;
  videos = [
    {
      videoId: video.id,
      playbackId,
      title: video.title ?? "Untitled",
      productsTagged: [],
      status: video.status,
      duration: video.duration,
    },
  ];

  const analytics = await getVideoAnalytics(entityId, startDate, endDate);
  const muxMetrics = await getOverallDataMetricsForVideoIds(
    [{ videoId: entityId, playbackId }],
    30
  );
  const hasMux = muxMetrics.aggregate.views > 0 || muxMetrics.aggregate.totalWatchTimeSeconds > 0 ||
    Object.keys(muxMetrics.byVideoId).length > 0;
  console.log("muxMetrics for video", muxMetrics);
  console.log("hasMux", hasMux);
  return {
    type,
    entityId,
    title,
    videos,
    analytics,
    muxMetrics: hasMux ? muxMetrics : null,
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

export default function AnalyticsByIdPage() {
  const { type, title, videos, analytics, muxMetrics, entityId } = useLoaderData();
  const [selectedVideoId, setSelectedVideoId] = useState(() =>
    type === "video" ? entityId : videos[0]?.videoId ?? undefined
  );

  const stats = type === "feed"
    ? analytics?.feed
    : analytics?.video;
  const summary = stats
    ? [
        { label: "Impressions", value: stats.impressions ?? 0 },
        { label: "Views", value: stats.views ?? 0 },
        { label: "Clicks", value: stats.clicks ?? 0 },
        { label: "Purchases", value: stats.purchases ?? 0 },
        { label: "Sales", value: stats.sales != null ? Number(stats.sales).toFixed(2) : "0" },
      ]
    : [];
  const muxAggregate = muxMetrics?.aggregate;

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

  return (
    <Frame>
      <Page
        title={type === "feed" ? `Analytics: ${title}` : `Video: ${title}`}
        backAction={{ content: "Back", url: "/app/feeds" }}
      >
        <InlineGrid columns={2} gap="400">
          <BlockStack gap="400">
            {videos.length > 1 && (
              <InlineStack align="end" blockAlign="end" gap="200">
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
            <Card>
              {videos.length > 1
                ? `Video ${currentIndex + 1} of ${videos.length}`
                : `${videos.length} video(s) in this ${type === "feed" ? "feed" : "video"}`}
              {selectedVideo ? (
                <Card>
                  <VideoDisplay video={selectedVideo} index={currentIndex} />
                </Card>
              ) : (
                <p>No video selected.</p>
              )}
            </Card>
          </BlockStack>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="200">
                <strong>Analytics</strong>
                <p>Last 30 days</p>
                {summary.length > 0 ? (
                  <BlockStack gap="100">
                    {summary.map(({ label, value }) => (
                      <InlineStack key={label} gap="200" blockAlign="center">
                        <span>{label}:</span>
                        <span>{value}</span>
                      </InlineStack>
                    ))}
                  </BlockStack>
                ) : (
                  <p>No analytics data for this period.</p>
                )}
                {muxMetrics && (
                  <BlockStack gap="100">
                    <strong>Mux Metrics for {selectedVideoId}</strong>
                    <InlineStack gap="200" blockAlign="center">
                      <span>Views:</span>
                      <span>{muxMetrics.byVideoId[selectedVideoId]?.views ?? 0}</span>
                      <span>Total watch time:</span>
                      <span>{formatWatchTime(muxMetrics.byVideoId[selectedVideoId]?.totalWatchTimeSeconds ?? 0)}</span>
                      <span>Avg watch time:</span>
                      <span>{formatWatchTime(muxMetrics.byVideoId[selectedVideoId]?.avgWatchTimeSeconds ?? 0)}</span>
                      <span>Viewer experience score:</span>
                      <span>{Number(muxMetrics.byVideoId[selectedVideoId]?.viewerExperienceScore ?? 0).toFixed(1)}</span>
                      <span>Playback failure %:</span>
                      <span>{Number(muxMetrics.byVideoId[selectedVideoId]?.playbackFailurePercentage ?? 0).toFixed(2)}%</span>
                      <span>Rebuffer %:</span>
                      <span>{Number(muxMetrics.byVideoId[selectedVideoId]?.rebufferPercentage ?? 0).toFixed(2)}%</span>
                    </InlineStack>
                  </BlockStack>
                )}
                {muxAggregate && (
                  <BlockStack gap="100">
                    <strong>Mux (overall data metrics)</strong>
                    <InlineStack gap="200" blockAlign="center">
                      <span>Views:</span>
                      <span>{muxAggregate.views ?? 0}</span>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <span>Total watch time:</span>
                      <span>{formatWatchTime(muxAggregate.totalWatchTimeSeconds)}</span>
                    </InlineStack>
                    {muxAggregate.avgWatchTimeSeconds != null && (
                      <InlineStack gap="200" blockAlign="center">
                        <span>Avg watch time:</span>
                        <span>{formatWatchTime(muxAggregate.avgWatchTimeSeconds)}</span>
                      </InlineStack>
                    )}
                    {muxAggregate.viewerExperienceScore != null && (
                      <InlineStack gap="200" blockAlign="center">
                        <span>Viewer experience score:</span>
                        <span>{Number(muxAggregate.viewerExperienceScore).toFixed(1)}</span>
                      </InlineStack>
                    )}
                    {muxAggregate.playbackFailurePercentage != null && (
                      <InlineStack gap="200" blockAlign="center">
                        <span>Playback failure %:</span>
                        <span>{Number(muxAggregate.playbackFailurePercentage).toFixed(2)}%</span>
                      </InlineStack>
                    )}
                    {muxAggregate.rebufferPercentage != null && (
                      <InlineStack gap="200" blockAlign="center">
                        <span>Rebuffer %:</span>
                        <span>{Number(muxAggregate.rebufferPercentage).toFixed(2)}%</span>
                      </InlineStack>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </InlineGrid>
        {/* <BlockStack gap="400">
          <Text as="p" variant="bodyMd" tone="subdued">
            {type === "feed"
              ? `${videos.length} video(s) in this feed`
              : "Single video"}
          </Text>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
            {videos.map((video, index) => (
              <Card key={video.videoId ?? index}>
                <VideoDisplay
                  video={video}
                  index={index}
                  onRemove={undefined}
                  onTaggedProductsChange={undefined}
                />
              </Card>
            ))}
          </InlineGrid>
          {videos.length === 0 && (
            <Card>
              <Text as="p" tone="subdued">
                No videos to show.
              </Text>
            </Card>
          )}
        </BlockStack> */}
      </Page>
    </Frame>
  );
}
