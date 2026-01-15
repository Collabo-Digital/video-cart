import { useEffect, useState } from "react";
import { LineChart } from "@shopify/polaris-viz";

export default function Chart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const data = [
    {
      name: "Video Views",
      data: [
        { key: new Date("2024-01-01").getTime(), value: 120 },
        { key: new Date("2024-01-02").getTime(), value: 200 },
        { key: new Date("2024-01-03").getTime(), value: 150 },
        { key: new Date("2024-01-04").getTime(), value: 300 },
        { key: new Date("2024-01-05").getTime(), value: 250 },
      ],
    },
    {
      name: "Conversions",
      data: [
        { key: new Date("2024-01-01").getTime(), value: 20 },
        { key: new Date("2024-01-02").getTime(), value: 35 },
        { key: new Date("2024-01-03").getTime(), value: 28 },
        { key: new Date("2024-01-04").getTime(), value: 55 },
        { key: new Date("2024-01-05").getTime(), value: 40 },
      ],
    },
  ];

  return (
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
  );
}
