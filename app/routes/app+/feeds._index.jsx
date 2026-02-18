/**
 * GET /app/feeds
 * 
 * Lists all video feeds for the shop.
 */

import { useEffect, useState } from "react";
import {
  BlockStack,
  Card,
  Page,
  Text,
  IndexTable,
  EmptyState,
  Button,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import {onCLS, onINP, onLCP}  from 'web-vitals'
import { getFeedsByShop, getFeedById, updateFeed, deleteFeed } from "../../services/feed/feed.service.server";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../../config/shopify.server";
import { EditIcon, PlusIcon, DeleteIcon } from '@shopify/polaris-icons';

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

export const action = async ({ request }) => {
  if (request.method !== "POST") return null;
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "toggleFeed") {
      const feedId = formData.get("feedId");
      const isEnabled = formData.get("isEnabled") === "true";
      if (!feedId) {
        return Response.json(
          { error: "Feed ID is required" },
          { status: 400 }
        );
      }
      await getFeedById(feedId, session.shop);
      await updateFeed(feedId, { isEnabled });
      return Response.json({ ok: true });
    }

    if (intent === "deleteFeed") {
      const feedId = formData.get("feedId");
      if (!feedId) {
        return Response.json(
          { error: "Feed ID is required" },
          { status: 400 }
        );
      }
      await deleteFeed(feedId, session.shop);
      return Response.json({ ok: true });
    }

    return null;
  } catch (error) {
    console.error("Feeds action error:", error);
    return Response.json(
      { error: error.message || "Action failed" },
      { status: 500 }
    );
  }
};

export default function FeedsPage() {
  const { feeds } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [pendingDeleteFeed, setPendingDeleteFeed] = useState(null);

  useEffect(() => {
    onCLS(console.log);
    onINP(console.log);
    onLCP(console.log);
  }, []);

  const handleCreateFeed = () => {
    navigate('/app/feeds/new');
  };

  const handleRowClick = (feedId) => {
    navigate(`/app/feeds/${feedId}`);
  };

  const handleToggleFeed = (feedId, isEnabled, e) => {
    console.log('handleToggleFeed ----->', feedId, isEnabled, e);
    e?.stopPropagation?.();
    fetcher.submit(
      { intent: "toggleFeed", feedId, isEnabled: String(isEnabled) },
      { method: "POST" }
    );
  };

  const handleEditFeed = (feedId, e) => {
    e?.stopPropagation?.();
    navigate(`/app/feeds/${feedId}`);
  };

  const handleDeleteClick = (feed, e) => {
    e?.stopPropagation?.();
    setPendingDeleteFeed({ id: feed.id, feedName: feed.feedName });
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteFeed) return;
    fetcher.submit(
      { intent: "deleteFeed", feedId: pendingDeleteFeed.id },
      { method: "POST" }
    );
    setPendingDeleteFeed(null);
  };

  const handleCancelDelete = () => {
    setPendingDeleteFeed(null);
  };

  const rowMarkup = feeds.map((feed, index) => {
    const isToggling = fetcher.formData?.get("feedId") === feed.id;
    const checked = isToggling
      ? fetcher.formData?.get("isEnabled") === "true"
      : feed.isEnabled;

    return (
      <IndexTable.Row
        id={feed.id}
        key={feed.id}
        position={index}

      >
        <IndexTable.Cell onClick={(e) => e.stopPropagation()}>
          <s-switch
            checked={checked}
            disabled={isToggling && fetcher.state !== "idle"}
            onChange={(e) => handleToggleFeed(feed.id, e.target.checked, e)}
          />
        </IndexTable.Cell>

        <IndexTable.Cell >
          <Text variant="bodyMd" fontWeight="semibold" >
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
          <Text variant="bodyMd" tone="subdued">
            {new Date(feed.createdAt).toLocaleDateString()}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell onClick={(e) => e.stopPropagation()}>
          <InlineStack gap="200">
            <Button
              icon={EditIcon}
              onClick={(e) => handleEditFeed(feed.id, e)}
              accessibilityLabel="Edit feed"
            />
            <Button
              icon={DeleteIcon}
              variant="plain"
              tone="critical"
              onClick={(e) => handleDeleteClick(feed, e)}
              disabled={fetcher.state !== "idle" && fetcher.formData?.get("feedId") === feed.id}
              accessibilityLabel="Delete feed"
            />
          </InlineStack>
        </IndexTable.Cell>

      </IndexTable.Row>
    );
  });

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
        {pendingDeleteFeed && (
          <Banner
            title="Delete feed?"
            tone="critical"
            onDismiss={handleCancelDelete}
            action={{
              content: "Delete",
              destructive: true,
              onAction: handleConfirmDelete,
            }}
            secondaryAction={{
              content: "Cancel",
              onAction: handleCancelDelete,
            }}
          >
            <p>
              Delete &quot;{pendingDeleteFeed.feedName}&quot;? This cannot be undone.
            </p>
          </Banner>
        )}
        <Card padding="none">
          <IndexTable
            resourceName={{ singular: "feed", plural: "feeds" }}
            itemCount={feeds.length}
            emptyState={emptyStateMarkup}
            headings={[
              { title: "Status" },
              { title: "Feed name" },
              { title: "Type" },
              { title: "Videos" },
              { title: "Created" },
              { title: "Actions" }
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