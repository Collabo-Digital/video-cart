import { boundary } from "@shopify/shopify-app-react-router/server";
import { BlockStack, Card, Icon, InlineGrid, InlineStack, Page, Text } from '@shopify/polaris';
import { ArchiveIcon } from '@shopify/polaris-icons';
import { useState } from "react";
import DateRangePicker from "../../components/DatePicker/DatePicker.jsx";
// import { authenticate } from "../../config/shopify.server.js";
// import { checkWebpixelStatus } from "../../lib/utils/webPixel.js";
// import Chart from "../../components/Chart/Chart.jsx";

// export const loader = async ({ request }) => {
//     const { admin, session } = await authenticate.admin(request);
//     const existingPixel = await checkWebpixelStatus( {admin} );
//     return { existingPixel };
// };

export default function Index() {

  const [date, setDate] = useState({ start: null, end: null });

  const conversionStats = [{
    title: "Video viewers",
    count: 10,
    icon: ArchiveIcon
  }, {
    title: "Video views",
    count: 20,
    icon: ArchiveIcon
  }, {
    title: "Video conversions",
    count: 30,
    icon: ArchiveIcon
  }, {
    title: "Video ATC",
    count: 30,
    icon: ArchiveIcon
  }];


  return (
  
    <Page>
      <BlockStack gap={400}>
          <DateRangePicker
            value={date}
            onDateRangeSelect={({ start, end }) => setDate({ start, end })}
          />
      <InlineGrid columns={4} gap={400}>

        {conversionStats.map((stat, index) => (
          <Card key={index} >
            <InlineStack>
              {stat.icon && <Icon source={stat.icon} />}
              <BlockStack>
                <Text as="h2" variant="bodyMd">
                  {stat.title}
                </Text>
                <Text as="h3" variant="bodySm">
                  {stat.count}
                </Text>
              </BlockStack>
            </InlineStack>
          </Card>
        ))}

      </InlineGrid>
      {/* <Chart /> */}
      </BlockStack>
    </Page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
