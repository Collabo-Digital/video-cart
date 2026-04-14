/* eslint-disable react/prop-types */
import {
  Text,
  TextField,
  BlockStack,
  InlineStack,
  Box,
  Spinner,
  EmptyState,
  Pagination,
  Checkbox,
  Button,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useRef, useState } from "react";

const PER_PAGE = 12;
const MODAL_ID = "upload-from-library-modal";

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

function VideoCard({ video, isSelected, onToggle }) {
  const thumbUrl = video.videoPlaybackId
    ? `https://image.mux.com/${video.videoPlaybackId}/thumbnail.webp?width=400&fit_mode=smartcrop`
    : "";

  return (
    <div
      onClick={() => onToggle(video.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(video.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${video.videoName || "Video"}${isSelected ? ", selected" : ""}`}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        outline: "none",
      }}
    >
      {/* Thumbnail container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "9 / 16",
          borderRadius: "8px",
          overflow: "hidden",
          border: isSelected ? "2px solid #2c6ecb" : "2px solid transparent",
          transition: "border-color 0.15s ease",
          backgroundColor: "#1a1a1a",
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={video.videoName || "Video"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#2a2a2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text as="span" tone="subdued" variant="bodySm">
              No preview
            </Text>
          </div>
        )}

        {/* Checkbox overlay — top-left */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "white",
            borderRadius: "4px",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            // Prevent the card's onClick from double-firing via the checkbox's own onChange
            pointerEvents: "none",
          }}
        >
          <Checkbox
            label=""
            labelHidden
            checked={isSelected}
            onChange={() => {}} // handled by card click
          />
        </div>
      </div>

      {/* Title */}
      <Text as="span" variant="bodySm" truncate>
        {video.videoName || "Untitled"}
      </Text>
    </div>
  );
}

export default function UploadFromLibraryModal({ open, onClose, onSelected }) {
  const modalRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const fetchVideos = useCallback(async (searchTerm = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/videos/filter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filters: { search: searchTerm.trim() } }),
      });
      const payload = await res.json();
      console.log("data for library videos ----->", payload.data?.videosData);
      if (payload.success) {
        setVideos(payload.data?.videosData?.videos ?? []);
        setTotal(payload.data?.total ?? 0);
        setLoading(false);
      }
    } catch (err) {
      console.error("Library fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    if (open) {
      el.showOverlay?.();
      setPage(1);
      setSearch("");
      setSearchInput("");
      setSelectedIds(new Set());
      fetchVideos("");
    } else {
      el.hideOverlay?.();
    }
  }, [open, fetchVideos]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handleAfterHide = () => {
      setSelectedIds(new Set());
      onClose?.();
    };
    el.addEventListener("afterhide", handleAfterHide);
    return () => el.removeEventListener("afterhide", handleAfterHide);
  }, [onClose]);

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
    fetchVideos(searchInput);
  }, [searchInput, fetchVideos]);

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
      fetchVideos(search);
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

  // "Select all remaining" = select all videos on the current page
  // that are not yet selected. If all are selected, deselect all.
  const allCurrentSelected =
    videos.length > 0 && videos.every((v) => selectedIds.has(v.id));

  const handleSelectAll = useCallback(() => {
    if (allCurrentSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        videos.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        videos.forEach((v) => next.add(v.id));
        return next;
      });
    }
  }, [allCurrentSelected, videos]);

  const handleAddSelected = useCallback(() => {
    const selected = videos.filter((v) => selectedIds.has(v.id));
    const feedVideos = selected.map((v) => libraryVideoToFeedVideo(v));
    if (feedVideos.length > 0) {
      onSelected?.(feedVideos);
    }
    setSelectedIds(new Set());
    modalRef.current?.hideOverlay?.();
    onClose?.();
  }, [videos, selectedIds, onSelected, onClose]);

  const isImportDisabled = selectedIds.size === 0;

  return (
    <s-modal
      ref={modalRef}
      id={MODAL_ID}
      heading="Select videos to import"
      size="large"
    >
      <BlockStack gap="400">
        {/* Search bar */}
          <InlineStack gap="300" align="center" blockAlign="center">
            <TextField
            label="Search"
            labelHidden
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search videos"
            autoComplete="off"
            clearButton
            onClearButtonClick={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
              fetchVideos("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchSubmit();
            }}
          />
          <Button variant="primary" icon={SearchIcon} onClick={handleSearchSubmit} />
          </InlineStack>

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
              heading={
                search ? "No videos match your search" : "No videos in library"
              }
              image="/search-not-found.svg"
            >
              <Text as="p" variant="bodyMd" tone="subdued">
                {search
                  ? "Try a different search term."
                  : "Upload or import videos first, then they'll appear here."}
              </Text>
            </EmptyState>
          ) : (
            <>
              {/* Select all remaining */}
              <Box>
                <Checkbox
                  label="Select all remaining videos"
                  checked={allCurrentSelected}
                  onChange={handleSelectAll}
                />
              </Box>

              {/* Video grid — 4-across layout matching the screenshot */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "16px",
                  minHeight: "320px",
                  overflowY: "auto",
                }}
              >
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isSelected={selectedIds.has(video.id)}
                    onToggle={toggleSelect}
                  />
                ))}
              </div>

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

      <s-button
        slot="primary-action"
        variant="primary"
        disabled={isImportDisabled}
        onClick={handleAddSelected}
      >
        Import
      </s-button>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        commandFor={MODAL_ID}
        command="--hide"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}