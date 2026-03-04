// app/components/Chart/SparkLine.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

function formatSparkLineData(values = []) {
  return [{ data: values.map((value, idx) => ({ key: idx, value: value ?? 0 })) }];
}

export default function SparkLine({ values = [] }) {
  const [SparkLineChart, setSparkLineChart] = useState(null);

  useEffect(() => {
    import("@shopify/polaris-viz").then((mod) => {
      setSparkLineChart(() => mod.SparkLineChart);
    });
  }, []);

  if (!SparkLineChart) return null;

  return (
    <div style={{ flex: 1, width: "50%", height: "80%", alignSelf: "end" }}>
      <SparkLineChart
        offsetLeft={4}
        offsetRight={0}
        data={formatSparkLineData(values)}
      />
    </div>
  );
}

SparkLine.propTypes = {
  values: PropTypes.arrayOf(PropTypes.number),
};