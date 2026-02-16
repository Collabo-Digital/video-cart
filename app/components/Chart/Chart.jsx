import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { LineChart } from "@shopify/polaris-viz";
import { BlockStack, Card, Text } from "@shopify/polaris";

export default function Chart({ chartData = [], title = "Video Views & Conversions", series = "views" }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const data = useMemo(() => {
    const seriesData = chartData && chartData.length > 0 ? chartData : [];
    
    if (series === "impressions") {
      return [
        {
          name: "Impressions",
          data: seriesData.map((d) => ({
            key: new Date(d.date).getTime(),
            value: d.impressions ?? 0,
          })),
        },
        {
          name: "Add to Cart",
          data: seriesData.map((d) => ({
            key: new Date(d.date).getTime(),
            value: d.addToCart ?? 0,
          })),
        },
      ];
    }
    
    // Default: "views" series
    return [
      {
        name: "Video Views",
        data: seriesData.map((d) => ({
          key: new Date(d.date).getTime(),
          value: d.videoViews ?? 0,
        })),
      },
      {
        name: "Conversions",
        data: seriesData.map((d) => ({
          key: new Date(d.date).getTime(),
          value: d.orders ?? 0,
        })),
      },
    ];
  }, [chartData, series]);

  if (!isClient) return null;

  return (
    <Card>
      <BlockStack gap='600'>
        <Text as="h2" variant="headingMd" fontWeight="semibold">
        {title}
      </Text>
      <LineChart
        data={data}
        showLegend
        isAnimated
        emptyStateText="No data available"
        xAxisOptions={{
          labelFormatter: (value) =>
            new Date(value).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            }),
        }}
        yAxisOptions={{
          labelFormatter: (value) => value.toString(),
        }}
      />
      </BlockStack>
    </Card>
  );
}

Chart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      videoViews: PropTypes.number,
      orders: PropTypes.number,
      impressions: PropTypes.number,
      addToCart: PropTypes.number,
    })
  ),
  title: PropTypes.string,
  series: PropTypes.oneOf(["views", "impressions"]),
};
