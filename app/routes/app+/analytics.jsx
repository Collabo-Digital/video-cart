import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  Icon,
  IndexTable,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import {
  OrderIcon,
  CashDollarIcon,
  ViewIcon,
  MegaphoneIcon,
  CartSaleIcon,
  CartDownIcon,
  ChatIcon,
  EmailIcon,
} from "@shopify/polaris-icons";
import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import {onCLS, onINP, onLCP}  from 'web-vitals'
import DateRangePicker from "../../components/DatePicker/DatePicker.jsx";
import { OnboardingSetup } from "../../components/OnboardingSetup/OnboardingSetup.jsx";
import { authenticate } from "../../config/shopify.server.js";
import * as FeedAnalyticsModel from "../../models/feedAnalytics.server.js";
import * as VideoAnalyticsModel from "../../models/videoAnalytics.server.js";
import * as VideoCartOrderModel from "../../models/videoCartOrder.server.js";
import Chart from "../../components/Chart/Chart.jsx";

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  // start.setHours(0, 0, 0, 0);
  return { start, end };
}

function parseDateRange(request) {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  if (startParam && endParam) {
    const start = new Date(startParam);
    const end = new Date(endParam);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end };
    }
  }
  return getDefaultDateRange();
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    const { start, end } = parseDateRange(request);
    const url = new URL(request.url);
    const ordersCursor = url.searchParams.get("ordersCursor") ?? undefined;

    const [widgetAgg, videoAgg, orderStats, dailyFeed, dailyVideo, ordersPage] =
      await Promise.all([
        FeedAnalyticsModel.getAggregatedByShop(session.shop, {
          startDate: start,
          endDate: end,
        }),
        VideoAnalyticsModel.getAggregatedByShop(session.shop, {
          startDate: start,
          endDate: end,
        }),
        VideoCartOrderModel.getOrderStatsByShop(session.shop, {
          startDate: start,
          endDate: end,
        }),
        FeedAnalyticsModel.getDailyByShop(session.shop, {
          startDate: start,
          endDate: end,
        }),
        VideoAnalyticsModel.getDailyByShop(session.shop, {
          startDate: start,
          endDate: end,
        }),
        VideoCartOrderModel.findByShopPaginated(session.shop, {
          startDate: start,
          endDate: end,
          limit: 5,
          cursor: ordersCursor,
        }),
      ]);

    const totalImpressions =
      (widgetAgg.widgetImpressions ?? 0) + (videoAgg.videoImpressions ?? 0);
    const totalVideoViews = videoAgg.videoViews ?? 0;
    const totalAddToCart =
      (widgetAgg.widgetAddToCart ?? 0) + (videoAgg.videoAddToCart ?? 0);
    const totalOrders = orderStats.orderCount ?? 0;
    const totalRevenue = orderStats.totalRevenue ?? 0;
    const atcRate =
      totalVideoViews > 0
        ? totalAddToCart / totalVideoViews
        : totalImpressions > 0
          ? totalAddToCart / totalImpressions
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
        widgetOrders: widgetAgg.widgetOrders ?? 0,
        widgetRevenue: widgetAgg.widgetRevenue ?? 0,
        videoImpressions: videoAgg.videoImpressions ?? 0,
        videoViews: videoAgg.videoViews ?? 0,
        videoAddToCart: videoAgg.videoAddToCart ?? 0,
        videoOrders: videoAgg.videoOrders ?? 0,
        videoRevenue: videoAgg.videoRevenue ?? 0,
      },
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      chartData: mergeDailyChartData(dailyFeed, dailyVideo),
      orders: ordersPage.orders,
      ordersNextCursor: ordersPage.nextCursor,
    };
  } catch (error) {
    console.error("Error in loader:", error);
    throw new Error("Failed to load analytics data");
  }
};

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
    cur.orders = (cur.orders ?? 0) + (row.videoOrders ?? 0);
    cur.impressions += row.videoImpressions ?? 0;
    cur.addToCart += row.videoAddToCart ?? 0;
    byDate.set(row.date, cur);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function formatRevenue(value) {
  if (value == null || Number.isNaN(value)) return "0";
  const num = Number(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toFixed(2);
}

const defaultOnboardingItems = [
  {
    id: "check-app-extension-status",
    title: "Check app embedded status",
    description: "Check if the app is embedded in the store.",
    complete: false,
    primaryButton: {
      content: "Check status",
      props: { onClick: () => { } },
    },
  },
  {
    id: "add-videos",
    title: "Add videos to your products",
    description:
      "Connect product videos so customers can watch before they buy.",
    complete: false,
    primaryButton: {
      content: "Add videos",
      props: { url: "/products" },
    },
  },
  {
    id: "review-analytics",
    title: "Review your analytics",
    description:
      "Check video performance and conversion stats in the dashboard.",
    complete: false,
    primaryButton: {
      content: "View analytics",
      props: { onClick: () => { } },
    },
  },
];

export default function Index() {
  const loaderData = useLoaderData?.() ?? {};
  const { analytics = {}, dateRange } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    onCLS(console.log);
    onINP(console.log);
    onLCP(console.log);
  }, []);

  const date = useMemo(() => {
    if (dateRange?.start && dateRange?.end) {
      return { start: new Date(dateRange.start), end: new Date(dateRange.end) };
    }
    return { start: null, end: null };
  }, [dateRange?.start, dateRange?.end]);

  const [onboardingItems, setOnboardingItems] = useState(
    defaultOnboardingItems,
  );
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingStepComplete = (id) => {
    setOnboardingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, complete: true } : item)),
    );
  };

  const handleDateRangeSelect = ({ start, end }) => {
    const params = new URLSearchParams(searchParams);
    params.set("start", start.toISOString().slice(0, 10));
    params.set("end", end.toISOString().slice(0, 10));
    setSearchParams(params);
  };

  const atcPercent =
    analytics.atcRate != null ? (analytics.atcRate * 100).toFixed(1) : "0";

  const conversionStats = [
    { title: "Orders", count: analytics.totalOrderCount ?? 0, icon: OrderIcon },
    {
      title: "Revenue",
      count: formatRevenue(analytics.totalRevenue),
      icon: CashDollarIcon,
    },
    { title: "ATC rate", count: `${atcPercent}%`, icon: CartSaleIcon },
    {
      title: "Impressions",
      count: analytics.totalImpressions ?? 0,
      icon: MegaphoneIcon,
    },
    {
      title: "Video views",
      count: analytics.totalVideoViews ?? 0,
      icon: ViewIcon,
    },
    {
      title: "Add to cart",
      count: analytics.totalAddToCart ?? 0,
      icon: CartDownIcon,
    },
  ];

  const orders = loaderData.orders ?? [];
  const ordersNextCursor = loaderData.ordersNextCursor ?? null;

  const handleOrdersNext = () => {
    if (!ordersNextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("ordersCursor", ordersNextCursor);
    setSearchParams(params);
  };

  const orderTableEmptyState = (
    <EmptyState heading="No orders found" image="/order-table.svg">
      <p>
        Orders attributed to video cart will appear here for the selected date
        range.
      </p>
    </EmptyState>
  );

  const orderRowMarkup = orders.map((order, index) => (
    <IndexTable.Row id={order.id} key={order.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {order.orderNumber ?? order.orderId ?? "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {order.createdAt
            ? new Date(order.createdAt).toLocaleDateString()
            : "—"}
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
      {/* <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {order.currency ?? "—"}
        </Text>
      </IndexTable.Cell> */}
    </IndexTable.Row>
  ));

  return (
    <Page>
      <BlockStack gap={400}>
        {/* {showOnboarding && (
          <OnboardingSetup
            items={onboardingItems}
            onDismiss={() => setShowOnboarding(false)}
            onStepComplete={handleOnboardingStepComplete}
          />
        )} */}
        <InlineStack align="end" blockAlign="center" gap="200">
          <DateRangePicker
            value={date}
            onDateRangeSelect={handleDateRangeSelect}
          />
        </InlineStack>
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap={300}>
          {conversionStats.map((stat, index) => (
            <Card key={index}>
              <InlineStack gap="300">
                <BlockStack gap="200">
                  <InlineStack align="space-between" gap="200">
                    <Text as="h2" variant="bodyLg">
                      {stat.title}
                    </Text>
                    <BlockStack align="end" blockAlign="center" gap="200">
                      {stat.icon && <Icon source={stat.icon} />}
                    </BlockStack>
                  </InlineStack>
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    {stat.count}
                  </Text>
                </BlockStack>
              </InlineStack>
            </Card>
          ))}
        </InlineGrid>
        <InlineGrid columns={2} gap={300}>
          <Chart
            chartData={loaderData.chartData}
            title="Video Views & Conversions"
            series="views"
          />
          <Chart
            chartData={loaderData.chartData}
            title="Impressions & Add to Cart"
            series="impressions"
          />
        </InlineGrid>

        <BlockStack gap="300">
          <InlineStack gap="200">
            <Badge>
          <Text as="h2" variant="headingMd" fontWeight="semibold">
            Orders Generated
          </Text>
        </Badge>
          </InlineStack>

          <Card padding="0">
            <IndexTable
              resourceName={{ singular: "order", plural: "orders" }}
              itemCount={orders.length}
              emptyState={orderTableEmptyState}
              headings={[
                { title: "Order" },
                { title: "Date" },
                { title: "Revenue" },
                { title: "Items" },
                // { title: "Currency" },
              ]}
              selectable={false}
              pagination={
                ordersNextCursor
                  ? {
                    hasNext: true,
                    onNext: handleOrdersNext,
                  }
                  : undefined
              }
            >
              {orderRowMarkup}
            </IndexTable>
          </Card>
        </BlockStack>

        {/* <BlockStack gap="300">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Get Help{" "}
              </Text>
              <InlineGrid gap="300" columns={2}>
                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Live chat
                    </Text>
                    <InlineStack
                      gap="200"
                      align="space-between"
                      blockAlign="top"
                    >
                      <Text as="p" variant="bodyMd">
                        Need help? Contact us at
                      </Text>
                      <Button icon={ChatIcon} size="slim">
                        <Text as="p" variant="bodyMd">
                          Chat with us
                        </Text>
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Box>
                <Box
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Email Support
                    </Text>
                    <InlineStack
                      gap="200"
                      align="space-between"
                      blockAlign="top"
                    >
                      <Text as="p" variant="bodyMd">
                        Need help? Contact us at
                      </Text>
                      <Button icon={EmailIcon} size="slim">
                        <Text as="p" variant="bodyMd">
                          Email us
                        </Text>
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </InlineGrid>
            </BlockStack>
          </Card>
        </BlockStack> */}
      </BlockStack>
    </Page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
