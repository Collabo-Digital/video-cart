/* eslint-disable react/prop-types */
import {
  Modal,
  Text,
  TextField,
  BlockStack,
  InlineStack,
  Box,
  Spinner,
  EmptyState,
  Pagination,
  Checkbox,
  Grid,
  Thumbnail,
  Card,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";

const PER_PAGE = 12;

/**
 * Converts a library video (from API list) to the shape expected by the feed editor.
 */
function libraryVideoToFeedVideo(video) {
  return {
    id: video.id,
    videoId: video.id,
    playbackId: video.videoPlaybackId,
    uploadId: video.videoUploadId,
    fileName: video.videoName,
    fileUploadName: video.fileUploadName ?? video.videoName ?? undefined,
    title: video.videoName,
    taggedProducts: [],
  };
}

export default function UploadFromLibraryModal({ open, onClose, onSelected }) {
  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const fetchVideos = useCallback(async (pageNum = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        perPage: String(PER_PAGE),
      });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const res = await fetch(`/api/v1/videos/list?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load library");
      }
      const { videos: list, pagination } = json.data;
      setVideos(list || []);
      setTotal(pagination?.total ?? 0);
      setPage(pagination?.page ?? 1);
    } catch (err) {
      console.error("Library fetch error:", err);
      setVideos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setSearch("");
    setSearchInput("");
    setSelectedIds(new Set());
    fetchVideos(1, "");
  }, [open, fetchVideos]);

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
    fetchVideos(1, searchInput);
  }, [searchInput, fetchVideos]);

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
      fetchVideos(newPage, search);
    },
    [search, fetchVideos]
  );

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    const selected = videos.filter((v) => selectedIds.has(v.id));
    const feedVideos = selected.map((v) => libraryVideoToFeedVideo(v));
    if (feedVideos.length > 0) {
      onSelected?.(feedVideos);
    }
    setSelectedIds(new Set());
    onClose();
  }, [videos, selectedIds, onSelected, onClose]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    onClose();
  }, [onClose]);

  const handleCardKeyDown = useCallback((e, videoId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSelect(videoId);
    }
  }, [toggleSelect]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Select videos to import"
      size="large"
      primaryAction={{
        content: "Import",
        onAction: handleAddSelected,
        disabled: selectedIds.size === 0,
      }}
      secondaryActions={[{ content: "Cancel", onAction: handleClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <TextField
            label="Search"
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search videos"
            autoComplete="off"
            clearButton
            onClearButtonClick={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
              fetchVideos(1, "");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchSubmit();
            }}
          />

          {loading ? (
            <Box padding="800">
              <InlineStack gap="300" blockAlign="center">
                <Spinner size="small" />
                <Text as="span" tone="subdued">
                  Loading…
                </Text>
              </InlineStack>
            </Box>
          ) : videos.length === 0 ? (
            <EmptyState
              heading={search ? "No videos match your search" : "No videos in library"}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text as="p" variant="bodyMd" tone="subdued">
                {search
                  ? "Try a different search term."
                  : "Upload or import videos first, then they'll appear here."}
              </Text>
            </EmptyState>
          ) : (
            <>
              <Box
                minHeight="320px"
                style={{ overflowY: "auto" }}
              >
                <Grid>
                  {videos.map((video) => {
                    const thumbUrl = video.videoPlaybackId
                      ? `https://image.mux.com/${video.videoPlaybackId}/thumbnail.webp?width=400&fit_mode=smartcrop`
                      : "";
                    const isSelected = selectedIds.has(video.id);
                    return (
                      <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 3 }} key={video.id}>
                        <Card padding="0">
                          <Box
                            as="button"
                            type="button"
                            padding="0"
                            background="transparent"
                            borderWidth="0"
                            onClick={() => toggleSelect(video.id)}
                            onKeyDown={(e) => handleCardKeyDown(e, video.id)}
                            width="100%"
                            minWidth="0"
                            style={{ cursor: "pointer", textAlign: "left" }}
                            aria-pressed={isSelected}
                            aria-label={`${video.videoName || "Video"}${isSelected ? ", selected" : ""}`}
                          >
                            {/* <BlockStack gap="200"> */}
                              {/* <Box style={{ position: "relative" }}> */}
                                <Thumbnail
                                  source={thumbUrl || ""}
                                  alt={video.videoName || "Video"}
                                  size="large"
                                />
                                <Box
                                  padding="100"
                                  background="bg-surface"
                                  borderRadius="100"
                                  borderWidth="025"
                                  borderColor="border"
                                  style={{
                                    position: "absolute",
                                    top: 8,
                                    left: 8,
                                    minWidth: 24,
                                    minHeight: 24,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Checkbox
                                    label=""
                                    labelHidden
                                    checked={isSelected}
                                    onChange={() => toggleSelect(video.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Box>
                              </Box>
                              {/* <Box paddingInline="300" paddingBlockEnd="300"> */}
                                <Text as="span" variant="bodySm" truncate>
                                  {video.videoName || "Untitled"}
                                </Text>
                              {/* </Box> */}
                            {/* </BlockStack> */}
                          {/* </Box> */}
                        </Card>
                      </Grid.Cell>
                    );
                  })}
                </Grid>
              </Box>

              {totalPages > 1 && (
                <InlineStack align="center" blockAlign="center" gap="300">
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => handlePageChange(page - 1)}
                    hasNext={page < totalPages}
                    onNext={() => handlePageChange(page + 1)}
                    label={`Page ${page} of ${totalPages}`}
                  />
                  <Text as="span" variant="bodySm" tone="subdued">
                    {total} video{total !== 1 ? "s" : ""}
                  </Text>
                </InlineStack>
              )}
            </>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
