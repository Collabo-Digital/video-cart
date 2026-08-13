/* eslint-disable react/prop-types */
import {
  Banner,
  Text,
  TextField,
  BlockStack,
  InlineStack,
  Box,
  Spinner,
  EmptyState,
  Checkbox,
  Button,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useRef, useState } from "react";

import { getVideoThumbnailUrl } from "../../lib/utils/videoThumbnail";

const PER_PAGE = 2;
const GRID_MAX_HEIGHT = "60vh";
// Card width. Lower = smaller cards and more per row. The grid packs as many
// columns as fit rather than forcing exactly four, so cards hold this size
// instead of stretching to fill a wide modal.
const CARD_MIN_WIDTH = 150;
const MODAL_ID = "upload-from-library-modal";

/**
 * The library API returns raw Video rows. The display name is fileName, with
 * title as the fallback — there is no `videoName` field on the model, which is
 * why every card used to read "Untitled".
 */
const videoDisplayName = (video) => video?.fileName || video?.title || "";

/**
 * Converts a library video (from API list) to the shape expected by the feed editor.
 */
function libraryVideoToFeedVideo(video) {
  // Deliberately not defaulting to "Untitled" — this value can reach the DB via
  // the feed save, and a placeholder must never be persisted as a real name.
  const name = videoDisplayName(video) || undefined;
  return {
    id: video.id,
    videoId: video.id,
    playbackId: video.videoPlaybackId,
    uploadId: video.videoUploadId,
    fileName: name,
    fileUploadName: video.fileUploadName ?? name,
    title: name,
    taggedProducts: [],
  };
}

function VideoCard({ video, isSelected, onToggle }) {
  const name = videoDisplayName(video) || "Untitled";
  // Status is only a hint: a library row can carry a stale PROCESSING (in dev
  // the Mux webhook never lands), so try Mux anyway and let a genuine 412 fall
  // through to the placeholder.
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumbUrl = thumbFailed
    ? null
    // 2x the card width — enough for retina without fetching four times the
    // pixels the card can actually show.
    : getVideoThumbnailUrl(video, { width: CARD_MIN_WIDTH * 2, ignoreStatus: true });

  return (
    <div
      onClick={() => onToggle(video)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(video);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${name}${isSelected ? ", selected" : ""}`}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        outline: "none",
        // Grid items default to min-width:auto (min-content), so a long
        // unbreakable filename would widen the whole column.
        minWidth: 0,
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
            alt={name}
            // Infinite scroll can accumulate hundreds of cards; without this
            // every offscreen thumbnail is fetched and decoded into memory.
            loading="lazy"
            onError={() => setThumbFailed(true)}
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

        {/* Purely decorative — the card itself is the control. aria-hidden and
            tabIndex -1 because pointer-events only blocks the mouse: without
            them every card contributes a keyboard tab stop that does nothing. */}
        <div
          aria-hidden="true"
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
            pointerEvents: "none",
          }}
        >
          <Checkbox
            label=""
            labelHidden
            checked={isSelected}
            onChange={() => {}}
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Title */}
      <Text as="span" variant="bodySm" truncate>
        {name}
      </Text>
    </div>
  );
}

export default function UploadFromLibraryModal({ open, onClose, onSelected }) {
  const modalRef = useRef(null);
  // Node state, not refs: refs attach bottom-up (child before parent), so
  // reading a parent ref inside a child's callback ref sees null. State also
  // makes the observer effect re-run when the grid remounts after a search.
  const [rootEl, setRootEl] = useState(null);
  const [sentinelEl, setSentinelEl] = useState(null);

  const inFlightRef = useRef(false);
  const abortRef = useRef(null);

  const [videos, setVideos] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  // Map, not a Set of ids: a search REPLACES `videos`, so ids alone leave us
  // unable to resolve anything selected before the search.
  const [selected, setSelected] = useState(() => new Map());

  /**
   * @param {Object} [opts]
   * @param {string} [opts.searchTerm]
   * @param {string|null} [opts.cursor] - omit to start a fresh list, pass to append
   */
  const fetchVideos = useCallback(async ({ searchTerm = "", cursor = null } = {}) => {
    const isAppend = Boolean(cursor);

    // Scroll-triggered appends must not stampede, but a user-initiated search
    // must never be swallowed — so appends bail when busy, searches supersede.
    if (isAppend && inFlightRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    if (isAppend) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/videos/filter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        // take and cursor are required: the endpoint is cursor-based and
        // defaults to 5 rows, which is why the picker stopped at 5 videos.
        body: JSON.stringify({
          filters: {
            search: searchTerm.trim(),
            take: PER_PAGE,
            ...(cursor ? { cursor, direction: "next" } : {}),
          },
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || `Could not load videos (${res.status})`);
      }

      const data = payload.data?.videosData ?? {};
      const batch = data.videos ?? [];
      setVideos((prev) => (isAppend ? [...prev, ...batch] : batch));
      setNextCursor(data.nextCursor ?? null);
      setHasNext(Boolean(data.hasNext));
    } catch (err) {
      // Superseded by a newer request, which now owns the state — say nothing.
      if (err.name === "AbortError") return;
      console.error("Library fetch error:", err);
      // Previously loading was cleared only inside `if (payload.success)`, so
      // any failure left the modal spinning on "Loading…" forever.
      setError(err.message || "Could not load your video library.");
      if (!isAppend) setVideos([]);
    } finally {
      // Only the current request may clear the flags; a superseded one would
      // otherwise release the lock belonging to the request that replaced it.
      if (abortRef.current === controller) {
        abortRef.current = null;
        inFlightRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    if (open) {
      el.showOverlay?.();
      setSearch("");
      setSearchInput("");
      setSelected(new Map());
      setNextCursor(null);
      setHasNext(false);
      fetchVideos({ searchTerm: "" });
    } else {
      el.hideOverlay?.();
      // This component is rendered unconditionally by VideoUploader and never
      // unmounts, so without this every video ever scrolled past stays resident
      // for the life of the page.
      setVideos([]);
      setNextCursor(null);
      setHasNext(false);
    }
  }, [open, fetchVideos]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    // Single source of truth for teardown: hideOverlay() dispatches 'afterhide',
    // so callers must not also clear state and call onClose themselves.
    const handleAfterHide = () => {
      setSelected(new Map());
      onClose?.();
    };
    el.addEventListener("afterhide", handleAfterHide);
    return () => el.removeEventListener("afterhide", handleAfterHide);
  }, [onClose]);

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput);
    fetchVideos({ searchTerm: searchInput });
  }, [searchInput, fetchVideos]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) return;
    fetchVideos({ searchTerm: search, cursor: nextCursor });
  }, [nextCursor, search, fetchVideos]);

  // Keeps the observer callback current without rebuilding the observer — it
  // captures its callback at registration, so a plain closure would go stale.
  const loadMoreRef = useRef(handleLoadMore);
  useEffect(() => {
    loadMoreRef.current = handleLoadMore;
  });

  // Infinite scroll. Keyed on the NODES so it re-attaches whenever the grid
  // remounts, and so `root` is guaranteed non-null (a null root silently falls
  // back to the viewport, which measures the wrong box).
  useEffect(() => {
    if (!rootEl || !sentinelEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current?.();
      },
      // Fire a little before the true bottom so the next batch is usually
      // already there by the time the merchant reaches it.
      { root: rootEl, rootMargin: "200px" },
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
    // videos.length matters: IntersectionObserver reports TRANSITIONS, not
    // state. After a batch is appended the sentinel is usually STILL visible,
    // which produces no new callback — so without re-registering here, loading
    // stalls as soon as one batch fails to fill the container, and the rest of
    // the library becomes unreachable.
  }, [rootEl, sentinelEl, videos.length]);

  // A new search replaces the list, so return to the top.
  useEffect(() => {
    rootEl?.scrollTo({ top: 0 });
  }, [search, rootEl]);

  const toggleSelect = useCallback((video) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(video.id)) next.delete(video.id);
      else next.set(video.id, video);
      return next;
    });
  }, []);

  const allCurrentSelected =
    videos.length > 0 && videos.every((v) => selected.has(v.id));

  const handleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allCurrentSelected) videos.forEach((v) => next.delete(v.id));
      else videos.forEach((v) => next.set(v.id, v));
      return next;
    });
  }, [allCurrentSelected, videos]);

  const handleAddSelected = useCallback(() => {
    // Values come from the Map, so videos selected before a search are included
    // even though they are no longer in the visible list.
    const feedVideos = [...selected.values()].map((v) => libraryVideoToFeedVideo(v));
    if (feedVideos.length > 0) {
      onSelected?.(feedVideos);
    }
    // hideOverlay fires 'afterhide', which clears selection and calls onClose —
    // doing either here as well would run both twice.
    modalRef.current?.hideOverlay?.();
  }, [selected, onSelected]);

  const isImportDisabled = selected.size === 0;

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
              fetchVideos({ searchTerm: "" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchSubmit();
            }}
          />
          <Button variant="primary" icon={SearchIcon} onClick={handleSearchSubmit} />
        </InlineStack>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {/* Selections survive a search, so they would otherwise be invisible
            once the merchant searches away from them. */}
        {selected.size > 0 && (
          <Text as="p" variant="bodySm" tone="subdued">
            {selected.size} selected
          </Text>
        )}

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
            <Box>
              <Checkbox
                label="Select all loaded videos"
                checked={allCurrentSelected}
                onChange={handleSelectAll}
              />
            </Box>

            {/* Video grid — its own scroll container */}
            <div
              ref={setRootEl}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
                gap: "12px",
                // maxHeight is what makes overflowY meaningful — without it the
                // grid grows to fit its content and never scrolls.
                maxHeight: GRID_MAX_HEIGHT,
                overflowY: "auto",
              }}
            >
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isSelected={selected.has(video.id)}
                  onToggle={toggleSelect}
                />
              ))}

              {hasNext && (
                <div
                  ref={setSentinelEl}
                  // Spans the full row so it is reliably crossed on scroll
                  // rather than sitting in one narrow column.
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px",
                  }}
                >
                  {loadingMore && (
                    <Spinner size="small" accessibilityLabel="Loading more videos" />
                  )}
                </div>
              )}
            </div>
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
