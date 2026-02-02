import { useEffect, useState } from "react";
import { Card, BlockStack, Text, InlineStack, InlineGrid, Button } from "@shopify/polaris";
import {
  ExternalIcon
} from '@shopify/polaris-icons';
import DateRangePicker from "../DatePicker/DatePicker";

export default function AnalyticsTab() {
  const [isClient, setIsClient] = useState(false);
  const [date, setDate] = useState({ start: null, end: null });

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  

  return (
    <>
    {/* <Card > */}
        <BlockStack gap="300">
           <InlineStack align="end" inlineAlign="end">
             <DateRangePicker
                value={date}
                onDateRangeSelect={({ start, end }) => {
                    console.log('Selected Start Date:', start);
                    console.log('Selected End Date:', end);
                    setDate({ start, end });
                }}
            />  
           </InlineStack>
            <InlineGrid
                columns={2}
                gap="300"
            >
                <Card sectioned padding="500">
                    <BlockStack gap="200">
                        <Text as="h2" variant="bodyLg">Impression</Text>
                        <Text as="h3" variant="headingMd">100</Text>
                    </BlockStack>
                </Card>
                <Card sectioned padding="500">
                    <BlockStack gap="200">
                        <Text as="h2" variant="bodyLg">Views</Text>
                        <Text as="h3" variant="headingMd">100</Text>
                    </BlockStack>
                </Card>
            </InlineGrid>
            <InlineGrid
                columns={2}
                gap="300"
            >
                <Card sectioned padding="500">
                    <BlockStack gap="200">
                        <Text as="h2" variant="bodyLg">Click</Text>
                        <Text as="h3" variant="headingMd">100</Text>
                    </BlockStack>
                </Card>
                <Card sectioned>
                    <BlockStack gap="200">
                        <Text as="h2" variant="bodyLg">Conversion</Text>
                        <Text as="h3" variant="headingMd">100</Text>
                    </BlockStack>
                </Card>
            </InlineGrid>
            <Button
                icon={ExternalIcon}
                onClick={() => {
                    console.log("Download");
                }}
            >
                Detailed Analytics
            </Button>
        </BlockStack>
    {/* </Card> */}
    </>
  );
}
