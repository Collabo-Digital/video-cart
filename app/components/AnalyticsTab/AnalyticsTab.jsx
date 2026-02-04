/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  BlockStack,
  Text,
  InlineStack,
  InlineGrid,
  Button,
  DataTable,
  SkeletonBodyText,
  Banner,
} from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";
import { useFetcher, useNavigate } from "react-router";
import DateRangePicker from "../DatePicker/DatePicker";

function formatSales(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
    fetcher.load(`/api/v1/analytics/feeds/${feedId}?${params}`);
    console.log("fetcher.data", fetcher.data);
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
  const feedStats = data?.feed ?? null;
  const videos = data?.videos ?? [];

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
          Feed overview
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
                  {feedStats ? feedStats.impressions : "—"}
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
                  {feedStats ? feedStats.views : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Clicks
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {feedStats ? feedStats.clicks : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Purchases
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {feedStats ? feedStats.purchases : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
          <Card sectioned padding="500">
            <BlockStack gap="200">
              <Text as="h2" variant="bodyLg">
                Sales
              </Text>
              {loading ? (
                <SkeletonBodyText lines={1} />
              ) : (
                <Text as="h3" variant="headingMd">
                  {feedStats ? formatSales(feedStats.sales) : "—"}
                </Text>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* <Text as="h2" variant="headingMd">
          Per video
        </Text>
        {videos.length > 0 ? (
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "numeral", "numeral", "numeral", "numeral", "numeral", "text", "text"]}
              headings={[
                "Video",
                "Impressions",
                "Views",
                "Clicks",
                "Purchases",
                "Sales",
                "Total watch time",
                "Avg watch time",
              ]}
              rows={videos.map((v) => [
                v.title || "Untitled",
                v.impressions ?? 0,
                v.views ?? 0,
                v.clicks ?? 0,
                v.purchases ?? 0,
                formatSales(v.sales),
                formatDuration(v.totalWatchTime),
                formatDuration(v.avgWatchTime),
              ])}
            />
          </Card>
        ) : (
          !loading && (
            <Card>
              <Text as="p" tone="subdued">
                No video analytics in this date range. Data appears when the storefront widget records events.
              </Text>
            </Card>
          )
        )} */}

        <Button icon={ExternalIcon} onClick={() => {
          navigate(`/app/analytics/fdid_${feedId}`);
        }}>
          Detailed Analytics
        </Button>
      </BlockStack>
    </>
  );
}

export default AnalyticsTab;
