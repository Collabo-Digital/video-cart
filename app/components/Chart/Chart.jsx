import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { BlockStack, Card, Text } from "@shopify/polaris";

export default function Chart({ chartData = [], title = "Video Views & Conversions", series = "views", metrics = ["orders", "revenue"] }) {
  const [isClient, setIsClient] = useState(false);
  const [LineChart, setLineChart] = useState(null);
  useEffect(() => {
    setIsClient(true);
    // Dynamically import LineChart only on client-side
    import("@shopify/polaris-viz").then((module) => {
      setLineChart(() => module.LineChart);
    });
  }, []);

  const data = useMemo(() => {
  const seriesData = chartData && chartData.length > 0 ? chartData : [];

  const metricConfig = {
    impressions:   { name: "Impressions",    accessor: (d) => d.impressions ?? 0 },
    videoViews:    { name: "Views",          accessor: (d) => d.videoViews ?? 0 },
    addToCart:     { name: "Add to cart",    accessor: (d) => d.addToCart ?? 0 },
    orders:        { name: "Orders",         accessor: (d) => d.orders ?? 0 },
    revenue:       { name: "Revenue",        accessor: (d) => d.revenue ?? 0 },
    atcRate:       { name: "ATC rate",       accessor: (d) => d.atcRate ?? 0 },
    productClicks: { name: "Product Clicks", accessor: (d) => d.productClicks ?? 0 },
  };

  return metrics
    .filter((key) => metricConfig[key]) // ignore unknown keys
    .map((key) => {
      const { name, accessor } = metricConfig[key];
      return {
        name,
        data: seriesData.map((d) => ({
          key: new Date(d.date).getTime(),
          value: accessor(d),
        })),
      };
    });
}, [chartData, metrics]);

  // const data = useMemo(() => {
  //   const seriesData = chartData && chartData.length > 0 ? chartData : [];
    
  //   if (series === "impressions") {
  //     return [
  //       {
  //         name: "Impressions",
  //         data: seriesData.map((d) => ({
  //           key: new Date(d.date).getTime(),
  //           value: d.impressions ?? 0,
  //         })),
  //       },
  //       {
  //         name: "Add to Cart",
  //         data: seriesData.map((d) => ({
  //           key: new Date(d.date).getTime(),
  //           value: d.addToCart ?? 0,
  //         })),
  //       },
  //     ];
  //   }
    
  //   // Default: "views" series
  //   return [
  //     {
  //       name: "Video Views",
  //       data: seriesData.map((d) => ({
  //         key: new Date(d.date).getTime(),
  //         value: d.videoViews ?? 0,
  //       })),
  //     },
  //     {
  //       name: "Conversions",
  //       data: seriesData.map((d) => ({
  //         key: new Date(d.date).getTime(),
  //         value: d.orders ?? 0,
  //       })),
  //     },
  //   ];
  // }, [chartData, series]);

  if (!isClient || !LineChart) return null;

  return (
    <>
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
    </>
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
      revenue: PropTypes.number,
      atcRate: PropTypes.number,
      atcClicks: PropTypes.number,
    })
  ),
  title: PropTypes.string,
  metrics: PropTypes.arrayOf(PropTypes.string),
};