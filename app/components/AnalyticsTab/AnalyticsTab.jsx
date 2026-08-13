/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  BlockStack,
  Text,
  InlineStack,
  InlineGrid,
  Button,
  SkeletonBodyText,
  Banner,
} from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";
import { useFetcher, useNavigate } from "react-router";
import DateRangePicker from "../DatePicker/DatePicker";
import { toLocalDateString } from "../../lib/utils/common.js";

function formatSales(n, currencyCode) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
  }).format(n);
}


const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { start, end };
};

function AnalyticsTab({ feedId }) {
  const [isClient, setIsClient] = useState(false);
  const [date, setDate] = useState(() => defaultRange());
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchAnalytics = useCallback(() => {
    if (!feedId) return;
    const start = date.start || new Date(new Date().setDate(1));
    const end = date.end || new Date();
    const params = new URLSearchParams({
      // Local calendar day — toISOString shifts the day for non-UTC users.
      startDate: toLocalDateString(start),
      endDate: toLocalDateString(end),
    });
    fetcher.load(`/api/v1/analytics/feeds/${feedId}?${params}`);
  }, [feedId, date.start, date.end, fetcher]);

  useEffect(() => {
    if (isClient && feedId) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when feedId or date range changes
  }, [isClient, feedId, date.start, date.end]);

  if (!isClient) return null;

  if (!feedId) {
    return (
      <Card>
        <Banner tone="info">
          Save your feed to view analytics for impressions, views, clicks, purchases, and sales.
        </Banner>
      </Card>
    );
  }

  const loading = fetcher.state === "loading" && !fetcher.data;
  const data = fetcher.data?.success ? fetcher.data.data : null;
  const widgetStats = data?.widget ?? null;
  const currencyCode = data?.currencyCode ?? null;

  return (
    <>
      <BlockStack gap="300">
        <InlineStack align="end" blockAlign="end">
          <DateRangePicker
            value={date}
            onDateRangeSelect={({ start, end }) => setDate({ start, end })}
          />
        </InlineStack>

        <Text as="h2" variant="headingMd">
          Widget overview
        </Text>
        <InlineGrid columns={2} gap="300">
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Impressions
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {widgetStats ? widgetStats.impressions : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Views
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {widgetStats ? widgetStats.videoPlays : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          {/* <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Widget clicks
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {widgetStats ? widgetStats.clicks : "—"}
                </Text>
              )}
            </BlockStack>
          </Card> */}
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Orders
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {widgetStats ? widgetStats.orders : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Add to cart
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {widgetStats ? widgetStats.addToCart : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          
        </InlineGrid>
        <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Revenue
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {widgetStats ? formatSales(widgetStats.revenue, currencyCode) : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>

        <Button variant="secondary" icon={ExternalIcon} onClick={() => {
          navigate(`/app/analytics`);
        }}>
          Detailed Analytics
        </Button>
      </BlockStack>
    </>
  );
}

export default AnalyticsTab;
