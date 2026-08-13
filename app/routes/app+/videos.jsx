import { useState, useCallback, useEffect, useRef } from "react";
import {
  Avatar,
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  Icon,
  IndexFilters,
  IndexTable,
  InlineStack,
  Page,
  Text,
  Tooltip,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { ChartVerticalFilledIcon, DeleteIcon } from "@shopify/polaris-icons";
import { useActionData, useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useDebouncedCallback } from "use-debounce";
import { onCLS, onINP, onLCP } from "web-vitals";

import { authenticate } from "../../config/shopify.server";
import { VideoLibraryIcon } from "../../components/Icons/VideoLibrary/VideoLibrary";
import useLocalStorage from "../../lib/hooks/useLocalStorage";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import * as VideoModel from "../../models/video.server";
import { getWidgetsFromVideo, truncateName, buildFiltersPayload, parseSortSelected } from "../../lib/utils/common";
import { getVideoThumbnailUrl } from "../../lib/utils/videoThumbnail";
import { PER_PAGE, BADGE_LIMIT, DEBOUNCE_MS, TABLE_HEADINGS, SORT_OPTIONS, EMPTY_STATE_IMAGE } from "../../lib/constants/video";
import { fetchVideos } from "../../lib/utils/api/videosApi";


export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session) return apiError({ error: "Unauthorized" }, { status: 401 });

  try {
    const [videosData, totalVideos] = await Promise.all([
      VideoModel.findAllPaginatedWithWidgets(session.shop, { take: PER_PAGE }),
      VideoModel.count(session.shop),
    ]);

    return apiSuccess({ videosData, totalVideos });
  } catch (error) {
    console.error("Error fetching videos:", error);

    captureRouteError(error, {
      route: "videos",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });

    return apiError(error, {
      route: "videos",
      code: "FETCH_VIDEOS_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};


export const action = async ({ request }) => {
  if (request.method !== "POST") return null;

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const videoId = formData.get("videoId");

  if (intent !== "delete" || !videoId) {
    return apiError({ error: "Invalid request" }, { status: 400, route: "videos", code: "INVALID_REQUEST" });
  }

  try {
    await VideoModel.deleteVideoAndMuxAsset(videoId, session.shop);
    return apiSuccess({ ok: true });
  } catch (error) {
    console.error("Delete video error:", error);

    captureRouteError(error, {
      route: "videos",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });

    return apiError(error, {
      route: "videos",
      code: "DELETE_VIDEO_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};


function UploadQuotaBadge({ totalVideos, uploadLimit }) {
  return (
    <Tooltip content="Total videos uploaded">
      <Badge tone="attention">
        <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">
          {totalVideos}/{uploadLimit}
        </Text>
      </Badge>
    </Tooltip>
  );
}


function DeleteConfirmationBanner({ video, onConfirm, onDismiss }) {
  if (!video) return null;

  return (
    <Banner
      title="Delete video?"
      tone="critical"
      onDismiss={onDismiss}
      action={{ content: "Delete", destructive: true, onAction: onConfirm }}
      secondaryAction={{ content: "Cancel", onAction: onDismiss }}
    >
      <p>
        Delete &quot;{video.videoName}&quot;? This will remove it from the
        library, from Mux, and from any feeds that use it. This cannot be
        undone.
      </p>
    </Banner>
  );
}

function VideoRow({ video, index, selectedResources, onDeleteClick, onViewAnalytics }) {
  const allWidgets = getWidgetsFromVideo(video);
  const visibleWidgets = allWidgets.slice(0, BADGE_LIMIT);
  const hiddenCount = allWidgets.length - BADGE_LIMIT;
  const hiddenWidgetNames = allWidgets
    .slice(BADGE_LIMIT)
    .map((w) => w.name)
    .join(", ");

  return (
    <IndexTable.Row
      id={video.id}
      key={video.id}
      position={index}
      selected={selectedResources.includes(video.id)}
    >
      <IndexTable.Cell>
        <Avatar
          // Omitted, never empty: an empty source still counts as a failed load,
          // so Avatar would flash a broken image before falling back to initials.
          source={getVideoThumbnailUrl(video, { width: 80 }) ?? undefined}
          initials={video.title?.slice(0, 2) ?? "??"}
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {video.fileName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {allWidgets.length}
        </Text>
      </IndexTable.Cell>
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
          <Text as="span" tone="subdued" variant="bodySm">
            —
          </Text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {video.createdAt
            ? new Date(video.createdAt).toLocaleDateString()
            : "—"}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200">
          <Tooltip content="View analytics">
            <Button
              tone="info"
              icon={ChartVerticalFilledIcon}
              accessibilityLabel="View analytics"
              onClick={() => onViewAnalytics(video.id)}
            />
          </Tooltip>
          <Tooltip content="Delete video">
            <Button
              tone="critical"
              icon={DeleteIcon}
              accessibilityLabel="Delete video"
              onClick={() => onDeleteClick(video)}
            />
          </Tooltip>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}


export default function VideosPage() {
  const { data } = useLoaderData();
  const { videosData, totalVideos } = data;
  const actionData = useActionData();
  const appBridge = useAppBridge();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [shopData] = useLocalStorage("shopData", null);

  const [videos, setVideos] = useState(videosData?.videos ?? []);
  const [nextCursor, setNextCursor] = useState(videosData?.nextCursor ?? null);
  const [previousCursor, setPreviousCursor] = useState(videosData?.previousCursor ?? null);
  const [loading, setLoading] = useState(false);

  const [queryValue, setQueryValue] = useState("");
  const [sortSelected, setSortSelected] = useState(["createdAt desc"]);
  const { mode, setMode } = useSetIndexFiltersMode("FILTERING");

  const [pendingDeleteVideo, setPendingDeleteVideo] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const deletingVideoIdRef = useRef(null);

  const isFirstRender = useRef(true);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(videos);

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


  const updateVideoState = (data) => {
    if (!data) return;
    setVideos(data?.videosData?.videos ?? []);
    setNextCursor(data?.videosData?.nextCursor ?? null);
    setPreviousCursor(data?.videosData?.previousCursor ?? null);
    setLoading(false);
  };


  const applyFilters = useDebouncedCallback((filters) => {
    setLoading(true);
    const payload = buildFiltersPayload(filters);
    fetchVideos(payload).then(updateVideoState);
  }, DEBOUNCE_MS);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    applyFilters({
      queryValue,
      sortSelected: parseSortSelected(sortSelected),
    });
  }, [queryValue, sortSelected]); // eslint-disable-line react-hooks/exhaustive-deps


  const handlePaginate = useCallback(
    async (cursor, direction) => {
      setLoading(true);
      const payload = buildFiltersPayload({
        queryValue,
        cursor,
        direction,
        sortSelected: parseSortSelected(sortSelected),
      });
      const data = await fetchVideos(payload);
      updateVideoState(data);
    },
    [queryValue, sortSelected]
  );

  const handleSort = useCallback(
    (value) => {
      setSortSelected(value);
      applyFilters({
        queryValue,
        sortSelected: parseSortSelected(value),
      });
    },
    [queryValue] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDeleteClick = useCallback((video) => {
    setPendingDeleteVideo({ id: video.id, videoName: video.fileName });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteVideo) return;
    deletingVideoIdRef.current = pendingDeleteVideo.id;
    setDeleteError(null);
    fetcher.submit(
      { intent: "delete", videoId: pendingDeleteVideo.id },
      { method: "POST" }
    );
    setPendingDeleteVideo(null);
  }, [pendingDeleteVideo, fetcher]);

  const handleCancelDelete = useCallback(() => setPendingDeleteVideo(null), []);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;

    if (fetcher.data.success) {
      const deletedId = deletingVideoIdRef.current;
      if (deletedId) {
        setVideos((prev) => prev.filter((v) => v.id !== deletedId));
        deletingVideoIdRef.current = null;
      }
      setDeleteError(null);
      appBridge.toast.show("Video deleted successfully");
    } else if (fetcher.data.error) {
      deletingVideoIdRef.current = null;
      setDeleteError(fetcher.data.error);
      appBridge.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.state, fetcher.data, appBridge]);

  const handleViewAnalytics = useCallback(
    () => navigate(`/app/analytics`),
    [navigate]
  );


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
      title="Videos Library"
      subtitle="Check out the uploaded videos"
      titleMetadata={<Icon source={VideoLibraryIcon} />}
      primaryAction={
        <UploadQuotaBadge
          totalVideos={totalVideos}
          uploadLimit={shopData?.planLimits?.videoUploadLimit ?? 0}
        />
      }
    >
      <BlockStack gap="400">
        {(deleteError || actionData?.error) && (
          <Banner tone="critical" onDismiss={() => setDeleteError(null)}>
            {deleteError || actionData.error}
          </Banner>
        )}

        <DeleteConfirmationBanner
          video={pendingDeleteVideo}
          onConfirm={handleConfirmDelete}
          onDismiss={handleCancelDelete}
        />

        <Card padding="0">
          {totalVideos > 0 && (
            <IndexFilters
              sortOptions={SORT_OPTIONS}
              sortSelected={sortSelected}
              onSort={handleSort}
              queryValue={queryValue}
              queryPlaceholder="Search videos by name"
              onQueryChange={setQueryValue}
              onQueryClear={() => setQueryValue("")}
              tabs={[]}
              selected={0}
              onSelect={() => { }}
              filters={[]}
              appliedFilters={[]}
              onClearAll={() => setQueryValue("")}
              mode={mode}
              setMode={setMode}
              autoFocusSearchField={false}
            />
          )}

          {videos.length === 0 && !loading ? (
            <EmptyState
              heading="No videos yet"
              image={EMPTY_STATE_IMAGE}
            >
              <p>Upload videos to get started, or try a different search term.</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={{ singular: "video", plural: "videos" }}
              itemCount={videos.length}
              loading={loading}
              selectable={false}
              headings={TABLE_HEADINGS}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              {...paginationProps}
            >
              {videos.map((video, index) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  index={index}
                  selectedResources={selectedResources}
                  onDeleteClick={handleDeleteClick}
                  onViewAnalytics={handleViewAnalytics}
                />
              ))}
            </IndexTable>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
