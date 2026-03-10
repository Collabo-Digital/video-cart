import {
  Page,
  IndexTable,
  Text,
  Badge,
  EmptyState,
  useIndexResourceState,
  IndexFilters,
  Card,
  useSetIndexFiltersMode,
  Button,
  InlineStack,
  Avatar,
  Banner,
  BlockStack,
  Icon,
  Tooltip,
} from "@shopify/polaris";
import { onCLS, onINP, onLCP } from 'web-vitals';
import { useLoaderData, useNavigate, useActionData, useFetcher } from "react-router";
import { authenticate } from "../../config/shopify.server";
import * as VideoModel from "../../models/video.server";
import { useState, useCallback, useEffect, useRef } from "react";
import { DeleteIcon, ChartVerticalFilledIcon } from '@shopify/polaris-icons';
import { useAppBridge } from "@shopify/app-bridge-react";
import { VideoLibraryIcon } from "../../components/Icons/VideoLibrary/VideoLibrary";
import { useDebouncedCallback } from "use-debounce";

const PER_PAGE = 5;
const BADGE_LIMIT = 2;
const DEBOUNCE_MS = 500;


function getWidgetsFromVideo(video) {
  return (video?.feedVideos ?? [])
    .map((fv) => ({ id: fv.feed?.id, name: fv.feed?.feedName ?? '' }))
    .filter((w) => w.id);
}

const truncateName = (name, maxLen = 14) =>
  name.length > maxLen ? `${name.slice(0, maxLen)}…` : name;

function buildFiltersPayload({ queryValue, cursor, direction, sortSelected }) {
  const payload = {};
  const search = queryValue?.trim() || undefined;
  if (search) payload.search = search;
  if (cursor) {
    payload.cursor = cursor;
    payload.direction = direction ?? "next";
  }
  if (sortSelected?.length) payload.sortSelected = sortSelected;
  return payload;
}

async function fetchVideosApi(filtersPayload = {}) {
  const response = await fetch("/api/v1/videos/filter", {
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
    if (!session) return { videosData: { videos: [], total: 0 } };
    const videosData = await VideoModel.findAllPaginatedWithWidgets(session.shop, { take: PER_PAGE });
    const totalVideos = await VideoModel.count(session.shop);
    return { videosData, totalVideos };
  } catch (error) {
    console.error("Error fetching videos:", error);
    return { videosData: { videos: [], total: 0 } };
  }
};

export const action = async ({ request }) => {
  if (request.method !== "POST") return null;
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const videoId = formData.get("videoId");

  if (intent !== "delete" || !videoId) return { error: "Invalid request" };

  try {
    await VideoModel.deleteVideoAndMuxAsset(videoId);
    return { ok: true };
  } catch (err) {
    console.error("Delete video error:", err);
    return { error: err.message || "Failed to delete video" };
  }
};



export default function VideosPage() {
  const { videosData, totalVideos } = useLoaderData();
  const appBridge = useAppBridge();
  const actionData = useActionData();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState(videosData?.videos ?? []);
  const [nextCursor, setNextCursor] = useState(videosData?.nextCursor ?? null);
  const [previousCursor, setPreviousCursor] = useState(videosData?.previousCursor ?? null);

  const [queryValue, setQueryValue] = useState("");
  const [sortSelected, setSortSelected] = useState(["createdAt desc"]);
  const [pendingDeleteVideo, setPendingDeleteVideo] = useState(null);
  const { mode, setMode } = useSetIndexFiltersMode('FILTERING');

  const isFirstRender = useRef(true);

  useEffect(() => {
    onCLS(console.log);
    onINP(console.log);
    onLCP(console.log);
  }, []);


  useEffect(() => {
    setVideos(videosData?.videos ?? []);
    setNextCursor(videosData?.nextCursor ?? null);
    setPreviousCursor(videosData?.previousCursor ?? null);
  }, [videosData]);

 

  const applyFilters = useDebouncedCallback((filters) => {
    setLoading(true);
    const payload = buildFiltersPayload(filters);
    fetchVideosApi(payload).then((data) => {
      if (data) {
        setVideos(data.videos ?? []);
        setNextCursor(data.nextCursor ?? null);
        setPreviousCursor(data.previousCursor ?? null);
      }
      setLoading(false);
    });
  }, DEBOUNCE_MS);


  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const sortStr = sortSelected?.[0];
    const sortPayload = sortStr
      ? (() => { const [key, dir] = sortStr.split(" "); return [{ key, direction: dir }]; })()
      : undefined;
    applyFilters({ queryValue, sortSelected: sortPayload });
  }, [queryValue, sortSelected]);


  const handlePaginate = useCallback(async (cursor, direction) => {
    console.log("handlePaginate Hitted ----->");
    setLoading(true);
    const sortStr = sortSelected?.[0];
    const sortPayload = sortStr
      ? (() => { const [key, dir] = sortStr.split(" "); return [{ key, direction: dir }]; })()
      : undefined;
    const payload = buildFiltersPayload({ queryValue, cursor, direction, sortSelected: sortPayload });
    console.log("payload ----->", payload);
    const data = await fetchVideosApi(payload);
    console.log("data from the videos api ----->", data);
    if (data) {
      setVideos(data.videos ?? []);
      setNextCursor(data.nextCursor ?? null);
      setPreviousCursor(data.previousCursor ?? null);
    }
    setLoading(false);
  }, [queryValue, sortSelected]);


  const handleVideosSorting = useCallback((value) => {
    setSortSelected(value);
    const sortStr = value?.[0];
    const sortPayload = sortStr
      ? (() => { const [key, dir] = sortStr.split(" "); return [{ key, direction: dir }]; })()
      : undefined;
    applyFilters({ queryValue, sortSelected: sortPayload });
  }, [queryValue]);


  const handleDeleteClick = useCallback((video) => {
    setPendingDeleteVideo({ id: video.id, videoName: video.fileName });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteVideo) return;
    fetcher.submit(
      { intent: "delete", videoId: pendingDeleteVideo.id },
      { method: "POST" }
    );
    setPendingDeleteVideo(null);
    appBridge.toast.show("Video deleted successfully");
  }, [pendingDeleteVideo, fetcher, appBridge]);

  const handleCancelDelete = useCallback(() => setPendingDeleteVideo(null), []);


  const handleViewAnalytics = useCallback((id) => {
    navigate(`/app/analytics/vdid_${id}`);
  }, [navigate]);


  const resourceName = { singular: "video", plural: "videos" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(videos);

  const sortOptions = [
    { label: "Date", value: "createdAt desc", directionLabel: "Newest first" },
    { label: "Date", value: "createdAt asc", directionLabel: "Oldest first" },
  ];

  const rowMarkup = videos.map((video, index) => {
    const allWidgets = getWidgetsFromVideo(video);
    const visibleWidgets = allWidgets.slice(0, BADGE_LIMIT);
    const hiddenCount = allWidgets.length - BADGE_LIMIT;
    const hiddenWidgetNames = allWidgets.slice(BADGE_LIMIT).map((w) => w.name).join(", ");

    return (
      <IndexTable.Row
        id={video.id}
        key={video.id}
        selected={selectedResources.includes(video.id)}
        position={index}
      >
        {/* Thumbnail */}
        <IndexTable.Cell>
          <Avatar
            source={`https://image.mux.com/${video.videoPlaybackId}/thumbnail.webp`}
            initials={video.title?.slice(0, 2) ?? "??"}
          />
        </IndexTable.Cell>

        {/* Video name */}
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {video.fileName}
          </Text>
        </IndexTable.Cell>

        {/* Feed count */}
        <IndexTable.Cell>
          <Text as="span" numeric>{allWidgets.length}</Text>
        </IndexTable.Cell>

        {/* Feed badges */}
        <IndexTable.Cell>
          {allWidgets.length > 0 ? (
            <InlineStack gap="100" blockAlign="center" wrap={false}>
              {visibleWidgets.map((w) => (
                <Tooltip key={w.id} content={w.name}>
                  <Badge tone="info">{truncateName(w.name)}</Badge>
                </Tooltip>
              ))}
              {hiddenCount > 0 && (
                <Tooltip content={hiddenWidgetNames}>
                  <Badge tone="info">+{hiddenCount} more</Badge>
                </Tooltip>
              )}
            </InlineStack>
          ) : (
            <Text as="span" tone="subdued" variant="bodySm">—</Text>
          )}
        </IndexTable.Cell>

        {/* Created date */}
        <IndexTable.Cell>
          <Text as="span" variant="bodySm" tone="subdued">
            {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : "—"}
          </Text>
        </IndexTable.Cell>

        {/* Actions */}
        <IndexTable.Cell>
          <InlineStack gap="200">
            <Tooltip content="View analytics">
              <Button
                tone="info"
                icon={ChartVerticalFilledIcon}
                onClick={() => handleViewAnalytics(video.id)}
                accessibilityLabel="View analytics"
              />
            </Tooltip>
            <Tooltip content="Delete video">
              <Button
                tone="critical"
                icon={DeleteIcon}
                onClick={() => handleDeleteClick(video)}
                accessibilityLabel="Delete video"
              />
            </Tooltip>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });


  return (
    <Page
      title="Videos Library"
      subtitle="Check out the uploaded videos"
      titleMetadata={<Icon source={VideoLibraryIcon} />}
    >
      <BlockStack gap="400">
        {actionData?.error && (
          <Banner tone="critical" onDismiss={() => {}}>
            {actionData.error}
          </Banner>
        )}

        {pendingDeleteVideo && (
          <Banner
            title="Delete video?"
            tone="critical"
            onDismiss={handleCancelDelete}
            action={{ content: "Delete", destructive: true, onAction: handleConfirmDelete }}
            secondaryAction={{ content: "Cancel", onAction: handleCancelDelete }}
          >
            <p>
              Delete &quot;{pendingDeleteVideo.videoName}&quot;? This will remove it from the
              library, from Mux, and from any feeds that use it. This cannot be undone.
            </p>
          </Banner>
        )}

        <Card padding="0">
          {totalVideos > 0 && <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            onSort={handleVideosSorting}
            queryValue={queryValue}
            queryPlaceholder="Search videos by name"
            onQueryChange={setQueryValue}
            onQueryClear={() => setQueryValue("")}
            tabs={[]}
            selected={0}
            onSelect={() => {}}
            filters={[]}
            appliedFilters={[]}
            onClearAll={() => setQueryValue("")}
            mode={mode}
            setMode={setMode}
          />}

          {videos.length === 0 && !loading ? (
            <EmptyState
              heading="No videos yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Upload videos to get started, or try a different search term.</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={resourceName}
              itemCount={videos.length}
              loading={loading}
              selectable={false}
              selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "" },
                { title: "Video name" },
                { title: "Feeds" },
                { title: "Feed names" },
                { title: "Created" },
                { title: "Actions" },
              ]}
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
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}