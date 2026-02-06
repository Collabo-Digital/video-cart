import {
  Page,
  Frame,
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
} from "@shopify/polaris";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { authenticate } from "../../config/shopify.server";
import * as VideoModel from "../../models/video.server";
import { useState, useCallback, useEffect } from "react";
import {
  DeleteIcon,ChartVerticalFilledIcon
} from '@shopify/polaris-icons';

const PER_PAGE = 10;

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const { videos, total } = await VideoModel.findAllPaginatedWithWidgets({
    search,
    page,
    perPage: PER_PAGE,
  });
  return { videos, total, page, perPage: PER_PAGE };
};

export default function VideosPage() {
  const { videos, total, page, perPage } = useLoaderData();
  console.log(videos);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";

  const [searchValue, setSearchValue] = useState(urlSearch);

  useEffect(() => {
    setSearchValue(urlSearch);
  }, [urlSearch]);

  const handleDelete = useCallback((id) => {
    console.log(id);
  }, []);

  const handleViewAnalytics = useCallback((id) => {
    console.log(id);
  }, []);

  const handleSearchChange = useCallback((value) => setSearchValue(value), []);
  const handleSearchClear = useCallback(() => {
    setSearchValue("");
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("page", "1");
    navigate(`?${params.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  const handleSearchSubmit = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (searchValue.trim()) params.set("search", searchValue.trim());
    else params.delete("search");
    params.set("page", "1");
    navigate(`?${params.toString()}`, { replace: true });
  }, [navigate, searchParams, searchValue]);

  const handlePageChange = useCallback(
    (newPage) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(newPage));
      navigate(`?${params.toString()}`, { replace: true });
    },
    [navigate, searchParams]
  );

  const resourceName = { singular: "video", plural: "videos" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(videos);

  const rowMarkup = videos.map((video, index) => (
    <IndexTable.Row
      id={video.id}
      key={video.id}
      selected={selectedResources.includes(video.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Avatar source={`https://image.mux.com/${video.videoPlaybackId}/thumbnail.webp`} initials={video.videoName.slice(0, 2)} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {video.videoName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {video.widgets?.length ?? 0}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {video.widgets?.length > 0 ? (
          <Badge tone="info">{video.widgets.map((w) => w.name).join(", ")}</Badge>
        ) : null}
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
          <Button
          tone="info"
          icon={ChartVerticalFilledIcon}
          onClick={() => handleViewAnalytics(video.id)}
        >
        </Button>
        <Button
          tone="critical"
          icon={DeleteIcon}
          onClick={() => handleDelete(video.id)}
        >
          
        </Button>
        
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  const sortOptions = [
    { label: "Date", value: "date desc", directionLabel: "Newest first" },
    { label: "Date", value: "date asc", directionLabel: "Oldest first" },
    { label: "Video name", value: "name asc", directionLabel: "A–Z" },
    { label: "Video name", value: "name desc", directionLabel: "Z–A" },
  ];
  const [sortSelected, setSortSelected] = useState(["date desc"]);
  const { mode, setMode } = useSetIndexFiltersMode();

  const handleClearAll = useCallback(() => {
    setSearchValue("");
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("page", "1");
    navigate(`?${params.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  const tabs = [{ content: "All", id: "all", index: 0 }];

  return (
    <Frame>
      <Page title="Videos Library">
        <Card padding="0">
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            onSort={setSortSelected}
            queryValue={searchValue}
            queryPlaceholder="Search videos by name"
            onQueryChange={handleSearchChange}
            onQueryClear={handleSearchClear}
            primaryAction={{
              content: "Search",
              onAction: handleSearchSubmit,
            }}
            cancelAction={{
              onAction: () => setMode("DEFAULT"),
              disabled: false,
              loading: false,
            }}
            tabs={tabs}
            selected={0}
            onSelect={() => {}}
            canCreateNewView={false}
            filters={[]}
            appliedFilters={[]}
            onClearAll={handleClearAll}
            mode={mode}
            setMode={setMode}
            hideQueryField={false}
          />
          {videos.length === 0 ? (
            <EmptyState
              heading="No videos yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Upload videos to get started, or try a different search term.
              </p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={resourceName}
              itemCount={videos.length}
              selectable={false}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "" },
                { title: "Video name" },
                { title: "Widgets" },
                { title: "Widget names" },
                // { title: "Status" },
                { title: "Created" },
                { title: "Actions" },
              ]}
              pagination={
                totalPages > 1
                  ? {
                      hasPrevious: hasPrevious,
                      onPrevious: () => handlePageChange(page - 1),
                      hasNext: hasNext,
                      onNext: () => handlePageChange(page + 1),
                      label: `Page ${page} of ${totalPages} (${total} videos)`,
                    }
                  : undefined
              }
            >
              {rowMarkup}
            </IndexTable>
          )}
        </Card>
      </Page>
    </Frame>
  );
}
