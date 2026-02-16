import { boundary } from "@shopify/shopify-app-react-router/server";
import { BlockStack, Card, Icon, InlineGrid, InlineStack, Page, Text } from '@shopify/polaris';
import { ArchiveIcon } from '@shopify/polaris-icons';
import { useState } from "react";
import DateRangePicker from "../../components/DatePicker/DatePicker.jsx";
import { OnboardingSetup } from "../../components/OnboardingSetup/OnboardingSetup.jsx";

// import { authenticate } from "../../config/shopify.server.js";
// import { checkWebpixelStatus } from "../../lib/utils/webPixel.js";
// import Chart from "../../components/Chart/Chart.jsx";

// export const loader = async ({ request }) => {
//     const { admin, session } = await authenticate.admin(request);
//     const existingPixel = await checkWebpixelStatus( {admin} );
//     return { existingPixel };
// };

const defaultOnboardingItems = [
  {
    id: 'check-app-extension-status',
    title: 'Check app embedded status',
    description: 'Check if the app is embedded in the store.',
    complete: false,
    primaryButton: {
      content: 'Check status',
      props: { onClick: () => {} }
    }
  },
  {
    id: 'add-videos',
    title: 'Add videos to your products',
    description: 'Connect product videos so customers can watch before they buy.',
    complete: false,
    primaryButton: {
      content: 'Add videos',
      props: { url: '/products' }
    }
  },
  {
    id: 'review-analytics',
    title: 'Review your analytics',
    description: 'Check video performance and conversion stats in the dashboard.',
    complete: false,
    primaryButton: {
      content: 'View analytics',
      props: { onClick: () => {} }
    }
  }
];

export default function Index() {
  const [date, setDate] = useState({ start: null, end: null });
  const [onboardingItems, setOnboardingItems] = useState(defaultOnboardingItems);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingStepComplete = (id) => {
    setOnboardingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, complete: true } : item))
    );
  };

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
        {showOnboarding && (
          <OnboardingSetup
            items={onboardingItems}
            onDismiss={() => setShowOnboarding(false)}
            onStepComplete={handleOnboardingStepComplete}
          />
        )}
          <DateRangePicker
            value={date}
            onDateRangeSelect={({ start, end }) => setDate({ start, end })}
          />
      <InlineGrid columns={2} gap={300}>
        

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
