import {
  Box,
  VideoThumbnail,
  InlineStack,
  Button,
  Text,
  BlockStack,
  TextField,
  ProgressBar,
  Spinner,
  Icon,
} from "@shopify/polaris";
import { useState, useCallback, useEffect, useRef } from "react";
import { DeleteIcon, ViewIcon } from "@shopify/polaris-icons";
// /lazy keeps the player out of the initial bundle (it is only ever needed
// inside the preview overlay) and avoids registering its custom elements
// during SSR.
import MuxPlayer from "@mux/mux-player-react/lazy";

import ResourcePicker from "../ResourcePicker/ResourcePicker";
import TaggedProductsAvatars from "../ResourcePicker/TaggedProductsAvatars";

/**
 * VideoDisplay
 *
 * Renders a single video card (thumbnail, title, remove, product tagging) and a modal player.
 * Tagged products are passed up via onTaggedProductsChange; persistence happens on feed save.
 * If onFileNameChange is provided, the display name (fileName) is editable; fileUploadName is never changed.
 *
 * @param {Object} props
 * @param {Object} props.video - Video object (playbackId, title, fileName, taggedProducts/productsTagged)
 * @param {number} props.index - Index in the feed's video list
 * @param {function(): void} [props.onRemove] - Called when user removes this video
 * @param {Object} [props.shopify] - App Bridge instance (optional)
 * @param {function(number, Array): void} [props.onTaggedProductsChange] - Callback (index, products) when tagged products change
 * @param {function(number, string): void} [props.onFileNameChange] - Callback (index, fileName) when user edits display name
 */
export default function VideoDisplay({
  video,
  index,
  onRemove,
  onRetry,
  shopify,
  onTaggedProductsChange,
  onFileNameChange,
}) {
  const [active, setActive] = useState(false);

  // Open only — the overlay reports its own dismissal via the 'afterhide'
  // listener below, so this never needs to toggle.
  const handleOpenPreview = useCallback(() => setActive(true), []);

  const taggedProducts =
    video?.taggedProducts ??
    (video?.productsTagged || []).map((item) =>
      typeof item === "object" && item !== null
        ? { ...item, id: item.id != null ? String(item.id) : "" }
        : { id: String(item), title: "", image: null },
    );

  // Extract playback ID from various possible structures
  const getPlaybackId = () => {
    // Direct string (normalized format)
    if (typeof video?.playbackId === "string") {
      return video.playbackId;
    }

    // Array format from API
    if (Array.isArray(video?.playbackId) && video.playbackId.length > 0) {
      const firstItem = video.playbackId[0];
      // Object with id property
      if (typeof firstItem === "object" && firstItem?.id) {
        return firstItem.id;
      }
      // Direct string in array
      if (typeof firstItem === "string") {
        return firstItem;
      }
    }

    // Fallback options
    return video?.videoPlaybackId || video?.assetId || "";
  };

  const handleTaggedProductsChange = useCallback(
    (products) => {
      onTaggedProductsChange?.(index, products);
    },
    [index, onTaggedProductsChange],
  );

  const playbackId = getPlaybackId();
  const videoTitle = video?.fileName || video?.title || "Untitled Video";
  const videoDuration = video?.duration ? Math.round(video.duration) : 60;
  const videoStatus = video?.status || "unknown";
  const [editingName, setEditingName] = useState(false);
  const [nameFieldValue, setNameFieldValue] = useState(videoTitle);

  useEffect(() => {
    const t = video?.fileName || video?.title || "Untitled Video";
    if (!editingName) setNameFieldValue(t);
  }, [video?.fileName, video?.title, editingName]);

  const handleNameBlur = useCallback(() => {
    setEditingName(false);
    const trimmed = nameFieldValue?.trim();
    if (trimmed && trimmed !== (video?.fileName || video?.title)) {
      onFileNameChange?.(index, trimmed);
    }
  }, [index, nameFieldValue, video?.fileName, video?.title, onFileNameChange]);

  const handleNameChange = useCallback((value) => {
    setNameFieldValue(value);
  }, []);

  // --- Preview overlay ----------------------------------------------------
  // These hooks must stay ABOVE the placeholder early returns below, or a card
  // flipping between placeholder and real states changes the hook count.
  const modalRef = useRef(null);

  // One modal per card, so the id has to be unique — a shared constant id would
  // make every card's thumbnail open the same overlay.
  const modalId = `video-preview-${video?.id ?? video?.tempId ?? index}`;

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    if (active) el.showOverlay?.();
    else el.hideOverlay?.();
  }, [active]);

  // Esc, backdrop click and the Close button dismiss the overlay without going
  // through React — mirror that back into state or `active` desyncs.
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handleAfterHide = () => setActive(false);
    el.addEventListener("afterhide", handleAfterHide);
    return () => el.removeEventListener("afterhide", handleAfterHide);
  }, []);

  // --- In-flight upload states -------------------------------------------
  // These cards are local placeholders created by VideoUploader; they have no
  // playbackId yet, so they must be handled before the "no playback id" branch.
  if (video?.uploadState === "uploading") {
    return (
      <Box background="bg-fill-info-secondary" padding="400" borderRadius="200">
        <BlockStack gap="300">
          <Text as="p" fontWeight="semibold" breakWord>
            {videoTitle}
          </Text>
          <BlockStack gap="150">
            <ProgressBar
              progress={video?.progress ?? 0}
              size="small"
              tone="primary"
            />
            <Text as="p" variant="bodySm" tone="subdued">
              Uploading… {video?.progress ?? 0}%
            </Text>
          </BlockStack>
          {onRemove && (
            <Button onClick={onRemove} size="slim">
              Cancel
            </Button>
          )}
        </BlockStack>
      </Box>
    );
  }

  if (video?.uploadState === "processing" || video?.uploadState === "slow") {
    return (
      <Box background="bg-fill-info-secondary" padding="400" borderRadius="200">
        <BlockStack gap="300">
          <Text as="p" fontWeight="semibold" breakWord>
            {videoTitle}
          </Text>
          <InlineStack gap="200" blockAlign="center">
            <Spinner size="small" accessibilityLabel="Processing video" />
            <Text as="p" variant="bodySm" tone="subdued">
              {video.uploadState !== "slow"
                ? "Processing video…"
                : video?.videoId
                  ? "Still encoding. It can be saved now, or check again for the preview."
                  : // No videoId means the save would skip this card — do not
                    // promise saveability the save path will refuse.
                    "Still encoding. Check again before saving."}
            </Text>
          </InlineStack>
          <InlineStack gap="200">
            {/* Nothing re-polls on its own, so a 'slow' card needs a way out. */}
            {video.uploadState === "slow" && onRetry && (
              <Button onClick={onRetry} size="slim">
                Check again
              </Button>
            )}
            {onRemove && (
              <Button onClick={onRemove} size="slim">
                Remove
              </Button>
            )}
          </InlineStack>
        </BlockStack>
      </Box>
    );
  }

  if (video?.uploadState === "failed") {
    return (
      <Box
        background="bg-fill-critical-secondary"
        padding="400"
        borderRadius="200"
      >
        <BlockStack gap="300">
          <Text as="p" fontWeight="semibold" breakWord>
            {videoTitle}
          </Text>
          <Text as="p" variant="bodySm" tone="critical">
            {video?.uploadError || "Upload failed."}
          </Text>
          <InlineStack gap="200">
            {onRetry && (
              <Button onClick={onRetry} size="slim">
                Retry
              </Button>
            )}
            {onRemove && (
              <Button onClick={onRemove} tone="critical" size="slim">
                Remove
              </Button>
            )}
          </InlineStack>
        </BlockStack>
      </Box>
    );
  }

  // Error state
  if (!playbackId) {
    return (
      <Box
        background="bg-fill-critical-secondary"
        padding="400"
        borderRadius="200"
      >
        <BlockStack gap="200">
          <Text as="p" tone="critical" fontWeight="semibold">
            Error: No playback ID found
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Status: {videoStatus}
          </Text>
          {onRemove && (
            <Button onClick={onRemove} tone="critical" size="slim">
              Remove
            </Button>
          )}
        </BlockStack>
      </Box>
    );
  }

  // Processing state — Mux vocabulary only. Deliberately NOT the app's own
  // 'PROCESSING': that is the DB default and social imports carry it alongside a
  // real playbackId, so matching it here would strip the thumbnail, rename field
  // and product tagging from every imported video. In-flight device uploads are
  // covered by the uploadState branches above.
  if (videoStatus === "preparing" || videoStatus === "asset_created") {
    return (
      <Box background="bg-fill-info-secondary" padding="400" borderRadius="200">
        <BlockStack gap="200">
          <Text as="p" fontWeight="semibold">
            {videoTitle}
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Processing video...
          </Text>
          {onRemove && (
            <Button onClick={onRemove} size="slim">
              Remove
            </Button>
          )}
        </BlockStack>
      </Box>
    );
  }

  return (
    <BlockStack gap="200" >
      <InlineStack align="end" blockAlign="center" gap="400">
         <TaggedProductsAvatars selectedProducts={taggedProducts} />
        {onRemove && (
          <Button
            icon={DeleteIcon}
            onClick={onRemove}
            variant="tertiary"
            tone="critical"
            size="slim"
            accessibilityLabel="Remove video"
          />
        )}
      </InlineStack>
      <Box
        background="bg-surface-secondary"
        style={{
          width: "100%",
          height: "200px",
          border: "1px solid var(--p-color-border)",
          overflow: "hidden",
          borderRadius: "8px",
          cursor: "pointer",
          position: "relative",
        }}
        onClick={handleOpenPreview}
      >
        <VideoThumbnail
          // videoLength={videoDuration}
          thumbnailUrl={`https://image.mux.com/${playbackId}/thumbnail.png?width=400&height=500&fit_mode=smartcrop&time=1`}
        />
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <Icon source={ViewIcon}/>
        </div>
      </Box>

      <BlockStack gap="100">
        <InlineStack
          align="space-between"
          blockAlign="center"
          gap="200"
          wrap={false}
        >
          {onFileNameChange ? (
            <Box minWidth="0" flex={1}>
              <TextField
                label=""
                labelHidden
                value={editingName ? nameFieldValue : videoTitle}
                onChange={handleNameChange}
                onFocus={() => setEditingName(true)}
                onBlur={handleNameBlur}
                autoComplete="off"
                placeholder="Video name"
              />
            </Box>
          ) : (
            <Text as="p" variant="bodySm" fontWeight="semibold">
              {videoTitle}
            </Text>
          )}
        </InlineStack>
        <ResourcePicker
          selectedProducts={taggedProducts}
          onProductsSelected={handleTaggedProductsChange}
        />
      </BlockStack>

      <s-modal ref={modalRef} id={modalId} heading={videoTitle} size="large">
        <div
          style={{
            width: "100%",
            height: "min(65vh, 560px)",
            background: "#000",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* Only mount the player while open. Unlike Polaris' Modal, s-modal
              keeps its children in the DOM when hidden, so a persistent player
              would carry on playing audio after the overlay closes. */}
          {active && (
            <MuxPlayer
              style={{
                width: "100%",
                height: "100%",
                // mux-player sets its own aspect-ratio from the asset metadata,
                // which fights a fixed-height container and pushes the modal
                // into a scroll. Let the box define the size instead and
                // letterbox the video inside it, whatever its shape.
                aspectRatio: "auto",
                "--media-object-fit": "contain",
              }}
              playbackId={playbackId}
              streamType="on-demand"
              autoPlay
              metadata={{ video_id: video?.id, video_title: videoTitle }}
            />
          )}
        </div>

        {/* <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor={modalId}
          command="--hide"
        >
          Close
        </s-button> */}
      </s-modal>
    </BlockStack>
  );
}
