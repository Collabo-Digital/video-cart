
import { useState, useMemo, useCallback, useEffect } from "react";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import {
  ActionList,
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  EmptyState,
  Icon,
  IndexTable,
  InlineGrid,
  InlineStack,
  Page,
  Popover,
  Text,
} from "@shopify/polaris";
import {
  OrderIcon,
  ChartVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RewardIcon
} from "@shopify/polaris-icons";


import DateRangePicker from "../../components/DatePicker/DatePicker.jsx";
import { authenticate } from "../../config/shopify.server.js";
import * as FeedAnalyticsModel from "../../models/feedAnalytics.server.js";
import * as VideoAnalyticsModel from "../../models/videoAnalytics.server.js";
import * as VideoCartOrderModel from "../../models/videoCartOrder.server.js";
import * as VideoModel from "../../models/video.server.js";
import Chart from "../../components/Chart/Chart.jsx";
import SparkLine from "../../components/Chart/SparkLine.jsx";
import { getOverallDataMetricsForVideoIds } from "../../services/mux/mux-metrics.service.server.js";
import { parseDateRange, formatRevenue, mergeDailyChartData, getChartTrend } from "../../lib/utils/common.js";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {

    const { start, end } = parseDateRange(request);
    const url = new URL(request.url);
    const ordersCursor = url.searchParams.get("ordersCursor") ?? undefined;

    // Previous period window (for percent-change comparisons)
    const rangeMs = end - start;
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeMs);

    const [
      widgetAgg, videoAgg, shopVideos,
      orderStats, prevOrderStats,
      dailyFeed, dailyVideo,
      ordersPage,
      feedsData,
      videosData,
    ] = await Promise.all([
      FeedAnalyticsModel.getAggregatedByShop(session.shop, { startDate: start, endDate: end }),
      VideoAnalyticsModel.getAggregatedByShop(session.shop, { startDate: start, endDate: end }),
      VideoModel.findVideoIdsAndPlaybackIdsByShop(session.shop),
      VideoCartOrderModel.getOrderStatsByShop(session.shop, { startDate: start, endDate: end }),
      VideoCartOrderModel.getOrderStatsByShop(session.shop, { startDate: prevStart, endDate: prevEnd }),
      FeedAnalyticsModel.getDailyByShop(session.shop, { startDate: start, endDate: end }),
      VideoAnalyticsModel.getDailyByShop(session.shop, { startDate: start, endDate: end }),
      VideoCartOrderModel.findByShopPaginated(session.shop, {
        startDate: start,
        endDate: end,
        limit: 5,
        cursor: ordersCursor,
      }),
      FeedAnalyticsModel.getListofFeedsWithAnalytics(session.shop, { take: 5, startDate: start, endDate: end }),
      VideoAnalyticsModel.getListofVideosWithAnalytics(session.shop, { take: 5, startDate: start, endDate: end }),
    ]);

    let muxMetrics = null;
    if (shopVideos.length > 0) {
      muxMetrics = await getOverallDataMetricsForVideoIds(shopVideos, 30, { startDate: start, endDate: end });
    }

    const totalImpressions = (widgetAgg.widgetImpressions ?? 0) + (videoAgg.videoImpressions ?? 0);
    const totalVideoViews = videoAgg.videoViews ?? 0;
    const totalAddToCart = (widgetAgg.widgetAddToCart ?? 0) + (videoAgg.videoAddToCart ?? 0);
    const totalOrders = orderStats.orderCount ?? 0;
    const totalRevenue = orderStats.totalRevenue ?? 0;
    const atcRate =
      totalVideoViews > 0 ? totalAddToCart / totalVideoViews
        : totalImpressions > 0 ? totalAddToCart / totalImpressions
          : 0;

    return apiSuccess({
      analytics: {
        totalOrderCount: totalOrders,
        totalRevenue,
        atcRate,
        totalImpressions,
        totalVideoViews,
        totalAddToCart,
        widgetImpressions: widgetAgg.widgetImpressions ?? 0,
        widgetAddToCart: widgetAgg.widgetAddToCart ?? 0,
        videoImpressions: videoAgg.videoImpressions ?? 0,
        videoViews: videoAgg.videoViews ?? 0,
        videoAddToCart: videoAgg.videoAddToCart ?? 0,
        muxMetrics,
        percentChange: {
          orders: getChartTrend(dailyFeed, "widgetOrders"),
          revenue: getChartTrend(dailyFeed, "widgetRevenue", true),
          addToCart: getChartTrend(dailyFeed, "widgetAddToCart"),
          views: getChartTrend(dailyFeed, "videoViews"),
        },
      },
      feedsData,
      videosData,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      chartData: mergeDailyChartData(dailyFeed, dailyVideo),
      orders: ordersPage.orders,
      ordersNextCursor: ordersPage.nextCursor ?? null,
    });
  } catch (error) {
    captureRouteError(error, {
      route: "analytics",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
    return apiError(error, {
      route: "analytics",
      code: "FETCH_ANALYTICS_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
    // console.error("Error fetching analytics:", error);
  }
};

const LineIcon = () => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill="none" xmlns="http://www.w3.org/2000/svg"
    transform="rotate(270)"
  >
    <path
      d="M12 15V9"
      stroke="#919191" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

const DashedLabel = ({ children }) => (
  <Box borderBlockEndWidth="050" borderStyle="dashed" borderColor="border-disabled">
    {children}
  </Box>
);

function ChangeBadge({ value }) {
  if (value == null) return <Text tone="subdued">—</Text>;
  return (
    <Badge tone={value?.direction === "up" ? "success" : "critical"}>
      <InlineStack blockAlign="center" wrap={false}>
        {value.direction === "up" ? `+${value.diff}` : `-${value.diff}`}
        {value.direction === "up" ? <Icon source={ArrowUpIcon} /> : <Icon source={ArrowDownIcon} />}
      </InlineStack>
    </Badge>
  );
}



function MetricCard({ title, value, change, sparkline, isLast = false }) {

  return (
    <Box
      borderInlineEndWidth={isLast ? undefined : "050"}
      borderStyle="solid"
      borderColor="border-disabled"
      paddingInlineEnd="300"
    >
      <InlineStack gap="200" wrap={false}>
        <BlockStack gap="200">
          <Text as="h2" variant="bodyMd" fontWeight="semibold">
            <DashedLabel>{title}</DashedLabel>
          </Text>
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <Text as="h3" variant="headingLg" fontWeight="medium">
              {value}
            </Text>
            <ChangeBadge value={change} />
          </InlineStack>
        </BlockStack>
        <SparkLine values={sparkline} />
      </InlineStack>
    </Box>
  );
}


function OverviewRow({ label, value, shaded }) {
  return (
    <Box
      padding="300"
      background={shaded ? "bg-surface-secondary" : undefined}
      borderRadius="200"
    >
      <InlineStack gap="200" align="space-between">
        <Text as="h3" variant="bodyMd" fontWeight="medium">{label}</Text>
        <InlineStack gap="100" blockAlign="center">
          <Text as="h3" variant="bodyMd" fontWeight="medium">{value ?? "—"}</Text>
          <LineIcon />
        </InlineStack>
      </InlineStack>
    </Box>
  );
}


const METRIC_CHOICES = [
  { label: "Impressions", value: "impressions" },
  { label: "Views", value: "videoViews" },
  { label: "Add to cart", value: "addToCart" },
  { label: "Orders", value: "orders" },
  { label: "Revenue", value: "revenue" },
  { label: "ATC rate", value: "atcRate" },
  { label: "Product Clicks", value: "productClicks" },
];

export default function AnalyticsPage() {
  const { data } = useLoaderData();
  const { analytics = {}, dateRange, chartData = [], orders = [], ordersNextCursor = null, feedsData, videosData } = data ?? {};

  const [feeds, setFeeds] = useState(feedsData.feedsWithAnalytics);
  const [feedsHasMore, setFeedsHasMore] = useState(feedsData?.nextCursor ?? false);
  const [feedsPreviousCursor, setFeedsPreviousCursor] = useState(feedsData?.previousCursor ?? null);
  const [videos, setVideos] = useState(videosData?.videosWithAnalytics ?? []);
  const [videosHasMore, setVideosHasMore] = useState(videosData?.nextCursor ?? false);
  const [videosPreviousCursor, setVideosPreviousCursor] = useState(videosData?.previousCursor ?? null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMetrics, setSelectedMetrics] = useState(["orders", "revenue"]);
  const [popoverActive, setPopoverActive] = useState(false);
  const [tableView, setTableView] = useState("feeds");

  const togglePopover = useCallback(() => setPopoverActive((v) => !v), []);

  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((active) => !active), []);

  const feedsTableHeadings = [
    { title: "Feed name" },
    { title: "Revenue" },
    { title: "Orders" },
  ];

  const videosTableHeadings = [
    { title: "Video title" },
    { title: "Revenue" },
    { title: "Orders" },
  ];

  // After your existing useState declarations for feeds/videos

  useEffect(() => {
    const nextFeeds = feedsData?.feedsWithAnalytics ?? [];
    setFeeds(nextFeeds);
    setFeedsHasMore(feedsData?.nextCursor ?? false);
    setFeedsPreviousCursor(feedsData?.previousCursor ?? null);
  }, [feedsData, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    const nextVideos = videosData?.videosWithAnalytics ?? [];
    setVideos(nextVideos);
    setVideosHasMore(videosData?.nextCursor ?? false);
    setVideosPreviousCursor(videosData?.previousCursor ?? null);
  }, [videosData, dateRange?.start, dateRange?.end]);

  // Parsed date objects for the DateRangePicker (memoised to avoid churn)
  const date = useMemo(() => ({
    start: dateRange?.start ? new Date(dateRange.start) : null,
    end: dateRange?.end ? new Date(dateRange.end) : null,
  }), [dateRange?.start, dateRange?.end]);

  function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const handleFeedsNext = useCallback(async () => {
    const response = await fetch("/api/v1/analytics/feeds/getListofFeeds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursor: feedsHasMore,
        direction: "next",
        take: 5,
        startDate: date.start,
        endDate: date.end,
      }),

    });

    const data = await response.json();
    if (data.success) {
      setFeeds(data.data.feedsWithAnalytics);
      setFeedsHasMore(data.data.nextCursor);
      setFeedsPreviousCursor(data.data.previousCursor);
    }

  }, [feedsHasMore, date.start, date.end]);

  const handleFeedsPrevious = useCallback(async () => {
    const response = await fetch("/api/v1/analytics/feeds/getListofFeeds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursor: feedsPreviousCursor,
        direction: "previous",
        take: 5,
        startDate: date.start,
        endDate: date.end,
      }),
    });
    const data = await response.json();
    if (data.success) {
      setFeeds(data.data.feedsWithAnalytics);
      setFeedsHasMore(data.data.nextCursor);
      setFeedsPreviousCursor(data.data.previousCursor);
    }

  }, [feedsPreviousCursor, date.start, date.end]);

  const handleVideosNext = useCallback(async () => {
    const response = await fetch("/api/v1/analytics/videos/getListofVideos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursor: videosHasMore,
        direction: "next",
        take: 5,
      }),
    });
    const data = await response.json();
    if (data.success) {
      setVideos(data.data.videosWithAnalytics);
      setVideosHasMore(data.data.nextCursor);
      setVideosPreviousCursor(data.data.previousCursor);
    }
  }, [videosHasMore]);

  const handleVideosPrevious = useCallback(async () => {
    const response = await fetch("/api/v1/analytics/videos/getListofVideos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cursor: videosPreviousCursor,
        direction: "previous",
        take: 5,
      }),
    });
    const data = await response.json();
    if (data.success) {
      setVideos(data.data.videosWithAnalytics);
      setVideosHasMore(data.data.nextCursor);
      setVideosPreviousCursor(data.data.previousCursor);
    }
  }, [videosPreviousCursor]);

  const handleDateRangeSelect = useCallback(({ start, end }) => {
    const params = new URLSearchParams(searchParams);
    params.set("start", toLocalDateString(start));
    params.set("end", toLocalDateString(end));
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const handleOrdersNext = useCallback(() => {
    if (!ordersNextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("ordersCursor", ordersNextCursor);
    setSearchParams(params);
  }, [ordersNextCursor, searchParams, setSearchParams]);

  const atcPercent =
    analytics.atcRate != null ? (analytics.atcRate * 100).toFixed(1) : "0";


  const metricCards = [
    {
      title: "Total Orders",
      value: analytics.totalOrderCount ?? 0,
      change: analytics.percentChange?.orders,
      sparkline: chartData.map((d) => d.orders ?? 0),
    },
    {
      title: "Revenue",
      value: formatRevenue(analytics.totalRevenue),
      change: analytics.percentChange?.revenue,
      sparkline: chartData.map((d) => d.revenue ?? 0),
    },
    {
      title: "Add to cart",
      value: analytics.totalAddToCart ?? 0,
      change: analytics.percentChange?.addToCart,
      sparkline: chartData.map((d) => d.addToCart ?? 0),
    },
    {
      title: "Total Views",
      value: analytics.muxMetrics?.aggregate?.views ?? 0,
      change: analytics.percentChange?.views,
      sparkline: chartData.map((d) => d.videoViews ?? 0),
      isLast: true,
    },
  ];

  const activator = (
    <Button onClick={toggleActive} disclosure variant="tertiary">
      {tableView === "feeds" ? "Feeds" : "Videos"}
    </Button>
  );

  const feedRowMarkup = feeds?.length > 0 ? feeds.map((feed, index) => (
    <IndexTable.Row id={feed.id} key={feed.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {feed?.feed?.feedName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {feed?.widgetRevenue ? `$${Number(feed?.widgetRevenue).toFixed(2)}` : "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {feed?.widgetOrders}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  )) : [];

  const videoRowMarkup = videos?.length > 0 ? videos.map((video, index) => (
    <IndexTable.Row id={video.id} key={video.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {video?.video?.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {video?.videoRevenue ? `$${Number(video?.videoRevenue).toFixed(2)}` : "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {video?.videoOrders}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  )) : [];

  const FeedsEmptyState = (
    <EmptyState heading="No feeds found "
      image="/empty-feeds-analatyics-table.svg">
      <p>No feeds found for the selected date range.</p>
    </EmptyState>
  );

  const VideosEmptyState = (
    <EmptyState heading="No videos found" image="/empty-video-analtyics-table.svg">
      <p>No videos found for the selected date range.</p>
    </EmptyState>
  );



  const overviewRows = [
    { label: "Impressions", value: analytics.widgetImpressions },
    { label: "Views", value: analytics.videoImpressions },
    { label: "Add to cart", value: analytics.videoAddToCart },
    { label: "ATC rate", value: `${atcPercent}%` },
    { label: "Product Clicks", value: analytics.productClicks },
  ];


  const orderRowMarkup = orders.map((order, index) => (
    <IndexTable.Row id={order.id} key={order.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {order.orderNumber ?? order.orderId ?? "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {typeof order.totalRevenue === "number"
            ? `$${Number(order.totalRevenue).toFixed(2)}`
            : "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {Array.isArray(order.items) ? order.items.length : 0}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));


  return (
    <Page
      title="Analytics"
      subtitle="Track your video cart performance and conversion rates"
      titleMetadata={<Icon source={ChartVerticalIcon} />}
      primaryAction={
        <DateRangePicker value={date} onDateRangeSelect={handleDateRangeSelect} />
      }
    >
      <BlockStack gap={600}>

        {/* ── Top summary strip ── */}
        <Card>
          <InlineGrid columns={4} gap={300}>
            {metricCards.map((card) => (
              <MetricCard key={card.title} {...card} />
            ))}
          </InlineGrid>
        </Card>

        {/* ── Chart + overview ── */}
        <InlineGrid columns={["twoThirds", "oneThird"]} gap={300}>
          <Card>
            <BlockStack gap="600">
              <InlineStack align="space-between">
                <Text as="h2" variant="bodyMd" fontWeight="semibold">
                  <DashedLabel>Performance Metrics</DashedLabel>
                </Text>
                <Popover
                  active={popoverActive}
                  activator={
                    <Button onClick={togglePopover} disclosure variant="tertiary">
                      Select metrics
                    </Button>
                  }
                  onClose={togglePopover}
                >
                  <Card>
                    <ChoiceList
                      allowMultiple
                      choices={METRIC_CHOICES}
                      selected={selectedMetrics}
                      onChange={setSelectedMetrics}
                    />
                  </Card>
                </Popover>
              </InlineStack>

              <Chart chartData={chartData} title="" series="views" metrics={selectedMetrics} />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="bodyMd" fontWeight="semibold">
                <DashedLabel>Total Overview</DashedLabel>
              </Text>
              {overviewRows.map((row, i) => (
                <OverviewRow key={row.label} {...row} shaded={i % 2 !== 0} />
              ))}
            </BlockStack>
          </Card>
        </InlineGrid>


        {/* ── Performance table ── */}

        <BlockStack gap="300">
          <InlineStack align="space-between">
            <InlineStack gap="100" blockAlign="center">
              <Icon source={RewardIcon} />
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Top Performance {tableView === "feeds" ? "Feeds" : "Videos"}
              </Text>
            </InlineStack>
            <Popover
              active={active}
              activator={activator}
              autofocusTarget="first-node"
              onClose={toggleActive}
            >
              <ActionList
                actionRole="menuitem"
                items={[
                  {
                    content: tableView === "feeds" ? "Videos" : "Feeds",
                    onAction: () => {
                      setTableView(tableView === "feeds" ? "videos" : "feeds");
                      toggleActive();
                    },
                  },
                ]}
              />
            </Popover>
          </InlineStack>

          <Card padding="0">
            <IndexTable
              resourceName={{ singular: tableView === "feeds" ? "feed" : "video", plural: tableView === "feeds" ? "feeds" : "videos" }}
              itemCount={tableView === "feeds" ? feeds.length : videos?.length ?? 0}
              headings={tableView === "feeds" ? feedsTableHeadings : videosTableHeadings}
              selectable={false}
              emptyState={tableView === "feeds" ? FeedsEmptyState : VideosEmptyState}
              {...(tableView === "feeds" && (feedsHasMore || feedsPreviousCursor)
                ? {
                  pagination: {
                    hasNext: feedsHasMore,
                    onNext: handleFeedsNext,
                    hasPrevious: !!feedsPreviousCursor,
                    onPrevious: handleFeedsPrevious,
                  },
                }
                : tableView === "videos" && (videosHasMore || videosPreviousCursor)
                  ? {
                    pagination: {
                      hasNext: videosHasMore,
                      onNext: handleVideosNext,
                      hasPrevious: !!videosPreviousCursor,
                      onPrevious: handleVideosPrevious,
                    },
                  }
                  : {})}
            >
              {tableView === "feeds" ? feedRowMarkup : videoRowMarkup}
            </IndexTable>
          </Card>
        </BlockStack>

        {/* ── Orders table ── */}

        <BlockStack gap="300">
          <InlineStack>
            <InlineStack gap="100" blockAlign="start">
              <Icon source={OrderIcon} />
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Orders Generated
              </Text>
            </InlineStack>
          </InlineStack>

          <Card padding="0">
            <IndexTable
              resourceName={{ singular: "order", plural: "orders" }}
              itemCount={orders.length}
              emptyState={
                <EmptyState heading="No orders found" image="/order-table.svg">
                  <p>Orders attributed to video cart will appear here for the selected date range.</p>
                </EmptyState>
              }
              headings={[
                { title: "Order" },
                { title: "Date" },
                { title: "Revenue" },
                { title: "Items" },
              ]}
              selectable={false}
              pagination={
                ordersNextCursor
                  ? { hasNext: true, onNext: handleOrdersNext }
                  : undefined
              }
            >
              {orderRowMarkup}
            </IndexTable>
          </Card>
        </BlockStack>

      </BlockStack>
    </Page>
  );
}