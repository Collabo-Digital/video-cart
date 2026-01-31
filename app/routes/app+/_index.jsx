import { boundary } from "@shopify/shopify-app-react-router/server";
import { BlockStack, Card, Icon, InlineGrid, InlineStack, Page, Text } from '@shopify/polaris';
import { ArchiveIcon } from '@shopify/polaris-icons';
import { useState } from "react";
import DateRangePicker from "../../components/DatePicker/DatePicker.jsx";
// import Chart from "../../components/Chart/Chart.jsx";

export default function Index() {

  const [date, setDate] = useState({ start: null, end: null });

  const conversion = [{
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
            onDateRangeSelect={({ start, end }) => {
              console.log('Selected Start Date:', start);
              console.log('Selected End Date:', end);
              setDate({ start, end });
            }}
          />
      <InlineGrid columns={4} gap={400}>

        {conversion.map((element, index) => (
          <Card key={index} >
            <InlineStack>
              {element.icon && <Icon source={element.icon} />}
              <BlockStack>
                <Text as="h2" variant="bodyMd">
                  {element.title}
                </Text>
                <Text as="h3" variant="bodySm">
                  {element.count}
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
