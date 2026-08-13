import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  ChoiceList,
  EmptyState,
  Icon,
  IndexFilters,
  IndexTable,
  InlineStack,
  Page,
  Text,
  Tooltip,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, PlusIcon } from "@shopify/polaris-icons";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useDebouncedCallback } from "use-debounce";

import { authenticate } from "../../config/shopify.server";
import { VideoFeedsIcon } from "../../components/Icons/VideoFeeds/VideoFeedsIcon";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import * as FeedModel from "../../models/feed.server";
import {
  deleteFeed,
  updateFeed,
} from "../../services/feed/feed.service.server";
import { DEBOUNCE_MS, WIDGET_TYPE_OPTIONS, SORT_OPTIONS, TABLE_HEADINGS, STATUS_CHOICES } from "../../lib/constants/feedsPage";
import { parseSortSelected, buildFiltersPayload } from "../../lib/utils/common";
import { fetchFeeds } from "../../lib/utils/api/feedsApi";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  try {
    const [feedsData, totalFeeds] = await Promise.all([
      FeedModel.getFeedsWithPaginationAndFilters(session.shop, {}),
      FeedModel.count(session.shop),
    ]);

    return apiSuccess({ feedsData: feedsData ?? {}, totalFeeds });
  } catch (error) {
    console.error("Error fetching feeds:", error);

    captureRouteError(error, {
      route: "feeds",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
      extras: {
        requestId: request.id,
      },
    });

    return apiError(error, {
      route: "feeds",
      layer: "route",
      code: "FETCH_FEEDS_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};


export const action = async ({ request }) => {
  if (request.method !== "POST") return null;

  const { session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "toggleFeed") {
      const feedId = formData.get("feedId");
      if (!feedId) return apiError({ error: "Feed ID is required" }, { status: 400 });

      await updateFeed(feedId, { isEnabled: formData.get("isEnabled") === "true" }, session.shop);
      return apiSuccess({ ok: true });
    }

    if (intent === "deleteFeed") {
      const feedId = formData.get("feedId");
      if (!feedId) return apiError({ error: "Feed ID is required" }, { status: 400 });

      await deleteFeed(feedId, session.shop);
      return apiSuccess({ ok: true });
    }

    return null;
  } catch (error) {
    console.error("Feeds action error:", error);

    captureRouteError(error, {
      route: "feeds-index",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
      extras: { requestId: request.id },
    });

    return apiError(error, {
      route: "feeds-index",
      code: "FEEDS_ACTION_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};


function DeleteConfirmationBanner({ feed, onConfirm, onDismiss }) {
  if (!feed) return null;

  return (
    <Banner
      title="Delete feed?"
      tone="critical"
      onDismiss={onDismiss}
      action={{ content: "Delete", destructive: true, onAction: onConfirm }}
      secondaryAction={{ content: "Cancel", onAction: onDismiss }}
    >
      <p>
        Delete &quot;{feed.feedName}&quot;? This cannot be undone.
      </p>
    </Banner>
  );
}


function FeedRow({ feed, index, fetcher, onToggle, onEdit, onDeleteClick }) {
  const isPendingThisRow = fetcher.formData?.get("feedId") === feed.id;
  const isChecked = isPendingThisRow
    ? fetcher.formData?.get("isEnabled") === "true"
    : feed.isEnabled;

  const isBusy = isPendingThisRow && fetcher.state !== "idle";

  return (
    <IndexTable.Row id={feed.id} key={feed.id} position={index}>
      <IndexTable.Cell onClick={(e) => e.stopPropagation()}>
        <s-switch
          checked={isChecked}
          disabled={isBusy}
          onChange={(e) => onToggle(feed.id, e.target.checked, e)}
        />
      </IndexTable.Cell>

      <IndexTable.Cell>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => onEdit(feed.id, e)}
          onKeyDown={(e) => e.key === "Enter" && onEdit(feed.id, e)}
        >
          <Text variant="bodyMd" fontWeight="semibold">
            {feed.feedName}
          </Text>
        </div>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {feed.widgetType}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd">{feed._count?.videos ?? 0}</Text>
      </IndexTable.Cell>

      <IndexTable.Cell>
        <Text variant="bodyMd" tone="subdued">
          {new Date(feed.createdAt).toLocaleDateString()}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell onClick={(e) => e.stopPropagation()}>
        <InlineStack gap="200">
          <Tooltip content="Edit feed">
            <Button
              icon={EditIcon}
              accessibilityLabel="Edit feed"
              onClick={(e) => onEdit(feed.id, e)}
            />
          </Tooltip>
          <Tooltip content="Delete feed">
            <Button
              icon={DeleteIcon}
              tone="critical"
              accessibilityLabel="Delete feed"
              disabled={isBusy}
              onClick={(e) => onDeleteClick(feed, e)}
            />
          </Tooltip>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}

export default function FeedsPage() {
  const { data } = useLoaderData();
  const { feedsData, totalFeeds } = data;

  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [feeds, setFeeds] = useState(feedsData?.feeds ?? []);
  const [nextCursor, setNextCursor] = useState(feedsData?.nextCursor ?? null);
  const [previousCursor, setPreviousCursor] = useState(feedsData?.previousCursor ?? null);
  const [loading, setLoading] = useState(false);

  const [queryValue, setQueryValue] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [widgetTypeFilter, setWidgetTypeFilter] = useState([]);
  const [sortSelected, setSortSelected] = useState(["createdAt asc"]);
  const { mode, setMode } = useSetIndexFiltersMode("FILTERING");

  const [pendingDeleteFeed, setPendingDeleteFeed] = useState(null);

  const isFirstRender = useRef(true);

  useEffect(() => {
    setFeeds(feedsData?.feeds ?? []);
    setNextCursor(feedsData?.nextCursor ?? null);
    setPreviousCursor(feedsData?.previousCursor ?? null);
    setLoading(false);
  }, [feedsData]);


  const updateFeedState = (data) => {
    if (!data) return;
    setFeeds(data.feeds ?? []);
    setNextCursor(data.nextCursor ?? null);
    setPreviousCursor(data.previousCursor ?? null);
    setLoading(false);
  };

  const applyFilters = useDebouncedCallback((filters) => {
    setLoading(true);
    const payload = buildFiltersPayload(filters);
    fetchFeeds(payload).then(updateFeedState);
  }, DEBOUNCE_MS);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    applyFilters({
      statusFilter,
      widgetTypeFilter,
      queryValue,
      sortSelected: parseSortSelected(sortSelected),
    });
  }, [statusFilter, widgetTypeFilter, queryValue, sortSelected]); // eslint-disable-line react-hooks/exhaustive-deps


  const handlePaginate = useCallback(
    async (cursor, direction) => {
      setLoading(true);
      const payload = buildFiltersPayload({
        statusFilter,
        widgetTypeFilter,
        queryValue,
        cursor,
        direction,
        sortSelected: parseSortSelected(sortSelected),
      });
      const data = await fetchFeeds(payload);
      updateFeedState(data);
    },
    [statusFilter, widgetTypeFilter, queryValue, sortSelected]
  );

  const handleSort = useCallback(
    (value) => {
      setSortSelected(value);
      applyFilters({
        statusFilter,
        widgetTypeFilter,
        queryValue,
        sortSelected: parseSortSelected(value),
      });
    },
    [statusFilter, widgetTypeFilter, queryValue] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleClearAllFilters = useCallback(() => {
    setStatusFilter([]);
    setWidgetTypeFilter([]);
    setQueryValue("");
  }, []);

  const handleToggleFeed = useCallback(
    (feedId, isEnabled, e) => {
      e?.stopPropagation?.();
      fetcher.submit(
        { intent: "toggleFeed", feedId, isEnabled: String(isEnabled) },
        { method: "POST" }
      );
    },
    [fetcher]
  );

  const handleEditFeed = useCallback(
    (feedId, e) => {
      e?.stopPropagation?.();
      navigate(`/app/feeds/${feedId}`);
    },
    [navigate]
  );

  const handleDeleteClick = useCallback((feed, e) => {
    e?.stopPropagation?.();
    setPendingDeleteFeed({ id: feed.id, feedName: feed.feedName });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteFeed) return;
    fetcher.submit(
      { intent: "deleteFeed", feedId: pendingDeleteFeed.id },
      { method: "POST" }
    );
    setPendingDeleteFeed(null);
  }, [fetcher, pendingDeleteFeed]);


  const feedsFilters = [
    {
      key: "status",
      label: "Status",
      shortcut: true,
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={STATUS_CHOICES}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      ),
    },
    {
      key: "widgetType",
      label: "Widget type",
      shortcut: true,
      filter: (
        <ChoiceList
          title="Widget type"
          titleHidden
          choices={WIDGET_TYPE_OPTIONS}
          selected={widgetTypeFilter}
          onChange={setWidgetTypeFilter}
          allowMultiple
        />
      ),
    },
  ];

  const appliedFeedFilters = [
    ...(statusFilter?.length
      ? [
        {
          key: "status",
          label: statusFilter
            .map((v) => (v === "active" ? "Active" : "Inactive"))
            .join(", "),
          onRemove: () => setStatusFilter([]),
        },
      ]
      : []),
    ...(widgetTypeFilter?.length
      ? [
        {
          key: "widgetType",
          label: widgetTypeFilter
            .map((v) => WIDGET_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v)
            .join(", "),
          onRemove: () => setWidgetTypeFilter([]),
        },
      ]
      : []),
  ];

  const paginationProps =
    nextCursor || previousCursor
      ? {
        pagination: {
          hasNext: !!nextCursor,
          onNext: () => handlePaginate(nextCursor, "next"),
          hasPrevious: !!previousCursor,
          onPrevious: () => handlePaginate(previousCursor, "prev"),
        },
      }
      : {};


  return (
    <Page
      title="Video Feeds"
      subtitle="Check out the video feeds and their analytics"
      titleMetadata={<Icon source={VideoFeedsIcon} />}
      primaryAction={{
        content: "Create Feed",
        icon: PlusIcon,
        onAction: () => navigate("/app/feeds/new"),
      }}
    >
      <BlockStack gap="400">
        <DeleteConfirmationBanner
          feed={pendingDeleteFeed}
          onConfirm={handleConfirmDelete}
          onDismiss={() => setPendingDeleteFeed(null)}
        />

        <Card padding="none">
          {totalFeeds > 0 && (
            <IndexFilters
              sortOptions={SORT_OPTIONS}
              sortSelected={sortSelected}
              onSort={handleSort}
              queryValue={queryValue}
              queryPlaceholder="Search feeds"
              onQueryChange={setQueryValue}
              onQueryClear={() => setQueryValue("")}
              tabs={[]}
              filters={feedsFilters}
              appliedFilters={appliedFeedFilters}
              onClearAll={handleClearAllFilters}
              mode={mode}
              setMode={setMode}
              autoFocusSearchField={false}
            />
          )}

          <IndexTable
            resourceName={{ singular: "feed", plural: "feeds" }}
            itemCount={feeds?.length ?? 0}
            loading={loading}
            headings={TABLE_HEADINGS}
            selectable={false}
            emptyState={
              <EmptyState
                heading="Create your first video feed"
                action={{
                  content: "Create feed",
                  onAction: () => navigate("/app/feeds/new"),
                }}
                image="/feeds.svg"
              >
                <p>
                  Video feeds let you showcase shoppable videos on your
                  storefront. Upload videos, tag products, and start driving
                  engagement.
                </p>
              </EmptyState>
            }
            {...paginationProps}
          >
            {feeds.map((feed, index) => (
              <FeedRow
                key={feed.id}
                feed={feed}
                index={index}
                fetcher={fetcher}
                onToggle={handleToggleFeed}
                onEdit={handleEditFeed}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}