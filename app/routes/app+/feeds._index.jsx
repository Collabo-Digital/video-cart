/**
 * GET /app/feeds
 * 
 * Lists all video feeds for the shop.
 */

import {
  BlockStack,
  Card,
  Page,
  Text,
  IndexTable,
  EmptyState,
} from "@shopify/polaris";
import { getFeedsByShop } from "../../services/feed/feed.service.server";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../../config/shopify.server";
import { PlusIcon } from '@shopify/polaris-icons';

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const feeds = await getFeedsByShop(session.shop);
    return { feeds: feeds ?? [] };
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return { feeds: [] };
  }
};

export default function FeedsPage() {
  const { feeds } = useLoaderData();
  const navigate = useNavigate();

  const handleCreateFeed = () => {
    navigate('/app/feeds/new');
  };

  const handleRowClick = (feedId) => {
    navigate(`/app/feeds/${feedId}`);
  };

  const rowMarkup = feeds.map((feed, index) => (
    <IndexTable.Row
      id={feed.id}
      key={feed.id}
      position={index}
      onClick={() => handleRowClick(feed.id)}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold">
          {feed.feedName}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {feed.widgetType}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd">
          {feed.videos?.length || 0}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd" tone={feed.isEnabled ? "success" : "subdued"}>
          {feed.isEnabled ? "Enabled" : "Disabled"}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {new Date(feed.createdAt).toLocaleDateString()}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const emptyStateMarkup = (
    <EmptyState
      heading="Create your first video feed"
      action={{
        content: "Create feed",
        onAction: handleCreateFeed,
      }}
      image='/feeds.svg'
    >
      <p>
        Video feeds let you showcase shoppable videos on your storefront.
        Upload videos, tag products, and start driving engagement.
      </p>
    </EmptyState>
  );

  return (
    <Page
      title="Video Feeds"
      primaryAction={{
        content: "Create Feed",
        icon: PlusIcon,
        onAction: handleCreateFeed,
      }}
    >
      <BlockStack gap="400">
        <Card padding="none">
          <IndexTable
            resourceName={{ singular: "feed", plural: "feeds" }}
            itemCount={feeds.length}
            emptyState={emptyStateMarkup}
            headings={[
              { title: "Feed name" },
              { title: "Type" },
              { title: "Videos" },
              { title: "Status" },
              { title: "Created" },
            ]}
            selectable={false}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}