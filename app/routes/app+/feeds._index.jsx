import { useCallback, useEffect, useRef, useState } from "react";
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
  Icon,
  IndexFilters,
  useSetIndexFiltersMode,
  ChoiceList,
  Tooltip,
} from "@shopify/polaris";
import {
  getFeedsWithPaginationAndFilters,
  getFeedById,
  updateFeed,
  deleteFeed,
} from "../../services/feed/feed.service.server";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../../config/shopify.server";
import { EditIcon, PlusIcon, DeleteIcon } from "@shopify/polaris-icons";
import { VideoFeedsIcon } from "../../components/Icons/VideoFeeds/VideoFeedsIcon";
import { useDebouncedCallback } from "use-debounce";


const WIDGET_TYPE_OPTIONS = [
  { label: "Carousel", value: "carousel" },
  { label: "Grid", value: "grid" },
  { label: "Stories", value: "stories" },
  { label: "Floating", value: "floating" },
];

const SORT_OPTIONS = [
  { label: "Created at", key: "createdAt", direction: "asc", value: "createdAt asc", directionLabel: "Ascending" },
  { label: "Created at", key: "createdAt", direction: "desc", value: "createdAt desc", directionLabel: "Descending" },
];

const TABS = [
  { content: "Active", id: "active" },
  { content: "Inactive", id: "inactive" },
];

const DEBOUNCE_MS = 500;


function buildFiltersPayload({ statusFilter, widgetTypeFilter, queryValue, cursor, direction, sortSelected }) {
  const payload = {};
  if (statusFilter?.length) payload.status = statusFilter;
  if (widgetTypeFilter?.length) payload.widgetType = widgetTypeFilter;
  const search = queryValue?.trim() || undefined;
  if (search) payload.search = search;
  if (cursor) {
    payload.cursor = cursor;
    payload.direction = direction ?? "next";
  }

  if (sortSelected?.length) {
    payload.sortSelected = sortSelected;
  }
  return payload;
}

async function fetchFeedsApi(filtersPayload = {}) {
  const response = await fetch("/api/v1/feeds/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filters: filtersPayload }),
  });
  const data = await response.json();
  return data.success ? data.data : null;
}


export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const feedsData = await getFeedsWithPaginationAndFilters(session.shop, {});
    return { feedsData: feedsData ?? {} };
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return { feedsData: { feeds: [] } };
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
      if (!feedId) return Response.json({ error: "Feed ID is required" }, { status: 400 });
      await getFeedById(feedId, session.shop);
      await updateFeed(feedId, { isEnabled: formData.get("isEnabled") === "true" });
      return Response.json({ ok: true });
    }

    if (intent === "deleteFeed") {
      const feedId = formData.get("feedId");
      if (!feedId) return Response.json({ error: "Feed ID is required" }, { status: 400 });
      await deleteFeed(feedId, session.shop);
      return Response.json({ ok: true });
    }

    return null;
  } catch (error) {
    console.error("Feeds action error:", error);
    return Response.json({ error: error.message || "Action failed" }, { status: 500 });
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function FeedsPage() {
  const { feedsData } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [feeds, setFeeds] = useState(feedsData?.feeds ?? []);
  const [nextCursor, setNextCursor] = useState(feedsData?.nextCursor ?? null);
  const [previousCursor, setPreviousCursor] = useState(feedsData?.previousCursor ?? null);
  const [loading, setLoading] = useState(true);

  const [queryValue, setQueryValue] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [widgetTypeFilter, setWidgetTypeFilter] = useState([]);
  const [sortSelected, setSortSelected] = useState(["createdAt asc"]);
  const [selectedTab, setSelectedTab] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode("FILTERING");


  const [pendingDeleteFeed, setPendingDeleteFeed] = useState(null);

  const isFirstRender = useRef(true);



  useEffect(() => {
    setFeeds(feedsData?.feeds ?? []);
    setNextCursor(feedsData?.nextCursor ?? null);
    setPreviousCursor(feedsData?.previousCursor ?? null);
    setLoading(false);
  }, [feedsData]);


  const applyFilters = useDebouncedCallback((filters) => {
    setLoading(true);
    const payload = buildFiltersPayload(filters);
    fetchFeedsApi(payload).then((data) => {
      if (data) {
        setFeeds(data.feeds ?? []);
        setNextCursor(data.nextCursor ?? null);
        setPreviousCursor(data.previousCursor ?? null);
        setLoading(false);
      }
    });
  }, DEBOUNCE_MS);


  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
     const sortStr = sortSelected?.[0];
     const sortPayload = sortStr
    ? (() => {
        const [key, direction] = sortStr.split(" ");
        return [{ key, direction }];
      })()
    : undefined;
    applyFilters({ statusFilter, widgetTypeFilter, queryValue, sortSelected: sortPayload });
  }, [statusFilter, widgetTypeFilter, queryValue, sortSelected]);


  const handlePaginate = useCallback(async (cursor, direction) => {
    setLoading(true);
    const payload = buildFiltersPayload({
      statusFilter, widgetTypeFilter, queryValue, cursor, direction, sortSelected: sortSelected?.length
        ? (() => {
          const [key, direction] = sortSelected[0].split(" ");
          return [{ key, direction }];
        })()
        : undefined,
    });
    const data = await fetchFeedsApi(payload);
    if (data) {
      setFeeds(data.feeds ?? []);
      setNextCursor(data.nextCursor ?? null);
      setPreviousCursor(data.previousCursor ?? null);
      setLoading(false);
    }
  }, [statusFilter, widgetTypeFilter, queryValue, sortSelected]);


  const handleToggleFeed = useCallback((feedId, isEnabled, e) => {
    e?.stopPropagation?.();
    fetcher.submit(
      { intent: "toggleFeed", feedId, isEnabled: String(isEnabled) },
      { method: "POST" }
    );
  }, [fetcher]);

  const handleEditFeed = useCallback((feedId, e) => {
    e?.stopPropagation?.();
    navigate(`/app/feeds/${feedId}`);
  }, [navigate]);

  const handleDeleteClick = useCallback((feed, e) => {
    e?.stopPropagation?.();
    setPendingDeleteFeed({ id: feed.id, feedName: feed.feedName });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteFeed) return;
    fetcher.submit({ intent: "deleteFeed", feedId: pendingDeleteFeed.id }, { method: "POST" });
    setPendingDeleteFeed(null);
  }, [fetcher, pendingDeleteFeed]);

  const handleFeedsSorting = useCallback((value) => {
    setSortSelected(value);
    const sortStr = value?.[0];
    const sortPayload = sortStr
      ? (() => {
        const [key, direction] = sortStr.split(" ");
        return [{ key, direction }];
      })()
      : undefined;
    applyFilters({
      statusFilter,
      widgetTypeFilter,
      queryValue,
      sortSelected: sortPayload,
    });
  }, [statusFilter, widgetTypeFilter, queryValue]);


  const feedsFilters = [
    {
      key: "status",
      label: "Status",
      shortcut: true,
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ]}
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
      ? [{
        key: "status",
        label: statusFilter.map((v) => (v === "active" ? "Active" : "Inactive")).join(", "),
        onRemove: () => setStatusFilter([]),
      }]
      : []),
    ...(widgetTypeFilter?.length
      ? [{
        key: "widgetType",
        label: widgetTypeFilter
          .map((v) => WIDGET_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v)
          .join(", "),
        onRemove: () => setWidgetTypeFilter([]),
      }]
      : []),
  ];


  const rowMarkup = feeds?.map((feed, index) => {
    const isThisFeed = fetcher.formData?.get("feedId") === feed.id;
    const checked = isThisFeed
      ? fetcher.formData?.get("isEnabled") === "true"
      : feed.isEnabled;

    return (
      <IndexTable.Row id={feed.id} key={feed.id} position={index}>
        <IndexTable.Cell onClick={(e) => e.stopPropagation()}>
          <s-switch
            checked={checked}
            disabled={isThisFeed && fetcher.state !== "idle"}
            onChange={(e) => handleToggleFeed(feed.id, e.target.checked, e)}
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div role="button" tabIndex={0} onClick={(e) => handleEditFeed(feed.id, e)} onKeyDown={(e) => e.key === "Enter" && handleEditFeed(feed.id, e)}>
            <Text variant="bodyMd" fontWeight="semibold">{feed.feedName}</Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" tone="subdued">{feed.widgetType}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd">{feed.videos?.length ?? 0}</Text>
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
                onClick={(e) => handleEditFeed(feed.id, e)}
                accessibilityLabel="Edit feed"
              />
            </Tooltip>
            <Tooltip content="Delete feed">
              <Button
                icon={DeleteIcon}
                // variant="plain"
                tone="critical"
                onClick={(e) => handleDeleteClick(feed, e)}
                disabled={isThisFeed && fetcher.state !== "idle"}
                accessibilityLabel="Delete feed"
              />
            </Tooltip>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });



  return (
    <Page
      title="Video Feeds"
      subtitle="Check out the video feeds and their analytics"
      titleMetadata={<Icon source={VideoFeedsIcon} />}
      primaryAction={{ content: "Create Feed", icon: PlusIcon, onAction: () => navigate("/app/feeds/new") }}
    >
      <BlockStack gap="400">
        {pendingDeleteFeed && (
          <Banner
            title="Delete feed?"
            tone="critical"
            onDismiss={() => setPendingDeleteFeed(null)}
            action={{ content: "Delete", destructive: true, onAction: handleConfirmDelete }}
            secondaryAction={{ content: "Cancel", onAction: () => setPendingDeleteFeed(null) }}
          >
            <p>Delete &quot;{pendingDeleteFeed.feedName}&quot;? This cannot be undone.</p>
          </Banner>
        )}

        <Card padding="none">
          <IndexFilters
            sortOptions={SORT_OPTIONS}
            sortSelected={sortSelected}
            onSort={handleFeedsSorting}
            queryValue={queryValue}
            queryPlaceholder="Search feeds"
            onQueryChange={setQueryValue}
            onQueryClear={() => setQueryValue("")}
            tabs={TABS}
            selected={selectedTab}
            onSelect={setSelectedTab}
            filters={feedsFilters}
            appliedFilters={appliedFeedFilters}
            onClearAll={() => {
              setStatusFilter([]);
              setWidgetTypeFilter([]);
              setQueryValue("");
            }}
            mode={mode}
            setMode={setMode}
          />
          <IndexTable
            resourceName={{ singular: "feed", plural: "feeds" }}
            itemCount={feeds?.length ?? 0}
            loading={loading}
            emptyState={
              <EmptyState
                heading="Create your first video feed"
                action={{ content: "Create feed", onAction: () => navigate("/app/feeds/new") }}
                image="/feeds.svg"
              >
                <p>
                  Video feeds let you showcase shoppable videos on your storefront.
                  Upload videos, tag products, and start driving engagement.
                </p>
              </EmptyState>
            }
            headings={[
              { title: "Status" },
              { title: "Feed name" },
              { title: "Type" },
              { title: "Videos" },
              { title: "Created" },
              { title: "Actions" },
            ]}
            selectable={false}
            {...((nextCursor || previousCursor) && {
              pagination: {
                hasNext: !!nextCursor,
                onNext: () => handlePaginate(nextCursor, "next"),
                hasPrevious: !!previousCursor,
                onPrevious: () => handlePaginate(previousCursor, "prev"),
              },
            })}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}