// ─── Remix / React ───────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from "react";
import { useLoaderData, useSearchParams } from "react-router";

// ─── Polaris ─────────────────────────────────────────────────────────────────
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


// ─── Internal ────────────────────────────────────────────────────────────────
import DateRangePicker from "../../components/DatePicker/DatePicker.jsx";
import { authenticate } from "../../config/shopify.server.js";
import * as FeedAnalyticsModel from "../../models/feedAnalytics.server.js";
import * as VideoAnalyticsModel from "../../models/videoAnalytics.server.js";
import * as VideoCartOrderModel from "../../models/videoCartOrder.server.js";
import * as VideoModel from "../../models/video.server.js";
import Chart from "../../components/Chart/Chart.jsx";
import SparkLine from "../../components/Chart/SparkLine.jsx";
import { getOverallDataMetricsForVideoIds } from "../../services/mux/mux-metrics.service.server.js";

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultDateRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function parseDateRange(request) {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  if (startParam && endParam) {
    const start = new Date(startParam);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endParam);
    end.setHours(23, 59, 59, 999);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end };
    }
  }
  return getDefaultDateRange();
}


function formatRevenue(value) {
  if (value == null || Number.isNaN(value)) return "0";
  const num = Number(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toFixed(2);
}

function mergeDailyChartData(dailyFeed, dailyVideo) {
  const byDate = new Map();

  for (const row of dailyFeed ?? []) {
    byDate.set(row.date, {
      date: row.date,
      videoViews: 0,
      orders: row.widgetOrders ?? 0,
      impressions: row.widgetImpressions ?? 0,
      addToCart: row.widgetAddToCart ?? 0,
    });
  }

  for (const row of dailyVideo ?? []) {
    const cur = byDate.get(row.date) ?? {
      date: row.date,
      videoViews: 0,
      orders: 0,
      impressions: 0,
      addToCart: 0,
    };
    cur.videoViews += row.videoViews ?? 0;
    cur.orders += row.videoOrders ?? 0;
    cur.impressions += row.videoImpressions ?? 0;
    cur.addToCart += row.videoAddToCart ?? 0;
    byDate.set(row.date, cur);
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function getChartTrend(chartData, key, asPercent = false) {
  if (!chartData?.length || chartData.length < 2) return null;
  const prev = chartData[chartData.length - 2][key] ?? 0;
  const curr = chartData[chartData.length - 1][key] ?? 0;
  const diff = curr - prev;
  if (diff === 0 && !asPercent) return null;
  if (asPercent) {
    const pct = prev === 0 ? 100 : ((curr - prev) / prev) * 100;
    return { direction: diff > 0 ? "up" : "down", diff: `${Math.abs(pct).toFixed(1)}%` };
  }
  return { direction: diff > 0 ? "up" : "down", diff: Math.abs(diff) };
}


export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

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
  ]);

  const muxMetrics = await getOverallDataMetricsForVideoIds(shopVideos, 30);

  const totalImpressions = (widgetAgg.widgetImpressions ?? 0) + (videoAgg.videoImpressions ?? 0);
  const totalVideoViews = videoAgg.videoViews ?? 0;
  const totalAddToCart = (widgetAgg.widgetAddToCart ?? 0) + (videoAgg.videoAddToCart ?? 0);
  const totalOrders = orderStats.orderCount ?? 0;
  const totalRevenue = orderStats.totalRevenue ?? 0;
  const atcRate =
    totalVideoViews > 0 ? totalAddToCart / totalVideoViews
      : totalImpressions > 0 ? totalAddToCart / totalImpressions
        : 0;

  return {
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
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    chartData: mergeDailyChartData(dailyFeed, dailyVideo),
    orders: ordersPage.orders,
    ordersNextCursor: ordersPage.nextCursor ?? null,
  };
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


// ─────────────────────────────────────────────────────────────────────────────
// MetricCard  — top summary strip
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// OverviewRow — right-hand summary list
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

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
  const { analytics = {}, dateRange, chartData = [], orders = [], ordersNextCursor = null } =
    useLoaderData() ?? {};


  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMetrics, setSelectedMetrics] = useState(["orders", "revenue"]);
  const [popoverActive, setPopoverActive] = useState(false);
  const [tableView, setTableView] = useState("feeds");

  const togglePopover = useCallback(() => setPopoverActive((v) => !v), []);

  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((active) => !active), []);

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

  // ── Top metric cards config ────────────────────────────────────────────────
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

  console.log("metricCards ---------->", metricCards);

  const activator = (
    <Button onClick={toggleActive} disclosure>
      {tableView === "feeds" ? "Feeds" : "Videos"}
    </Button>
  );



  // ── Overview rows config ───────────────────────────────────────────────────
  const overviewRows = [
    { label: "Impressions", value: analytics.widgetImpressions },
    { label: "Views", value: analytics.videoImpressions },
    { label: "Add to cart", value: analytics.videoAddToCart },
    { label: "ATC rate", value: `${atcPercent}%` },
    { label: "Product Clicks", value: analytics.productClicks },
  ];

  // ── Orders table ───────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
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
                Top Performance
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