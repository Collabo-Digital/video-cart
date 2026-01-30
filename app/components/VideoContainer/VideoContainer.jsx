import { Box, VideoThumbnail, Modal, InlineStack, Button, Text, BlockStack } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { DeleteIcon } from '@shopify/polaris-icons';
import ResourcePicker from "../ResourcePicker/ResourcePicker";

/**
 * VideoDisplay
 *
 * Renders a single video card (thumbnail, title, remove, product tagging) and a modal player.
 * Tagged products are passed up via onTaggedProductsChange; persistence happens on feed save.
 *
 * @param {Object} props
 * @param {Object} props.video - Video object (playbackId, title, taggedProducts/productsTagged)
 * @param {number} props.index - Index in the feed's video list
 * @param {function(): void} [props.onRemove] - Called when user removes this video
 * @param {Object} [props.shopify] - App Bridge instance (optional)
 * @param {function(number, Array): void} [props.onTaggedProductsChange] - Callback (index, products) when tagged products change
 */
export default function VideoDisplay({ video, index, onRemove, shopify, onTaggedProductsChange }) {
  const [active, setActive] = useState(false);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const taggedProducts =
    video?.taggedProducts ??
    (video?.productsTagged || []).map((item) =>
      typeof item === "object" && item !== null
        ? { ...item, id: item.id != null ? String(item.id) : "" }
        : { id: String(item), title: "", image: null }
    );

  // Extract playback ID from various possible structures
  const getPlaybackId = () => {
    // Direct string (normalized format)
    if (typeof video?.playbackId === 'string') {
      return video.playbackId;
    }

    // Array format from API
    if (Array.isArray(video?.playbackId) && video.playbackId.length > 0) {
      const firstItem = video.playbackId[0];
      // Object with id property
      if (typeof firstItem === 'object' && firstItem?.id) {
        return firstItem.id;
      }
      // Direct string in array
      if (typeof firstItem === 'string') {
        return firstItem;
      }
    }

    // Fallback options
    return video?.videoPlaybackId || video?.assetId || '';
  };

  const handleTaggedProductsChange = useCallback(
    (products) => {
      onTaggedProductsChange?.(index, products);
    },
    [index, onTaggedProductsChange]
  );

  const playbackId = getPlaybackId();
  const videoTitle = video?.title || video?.fileName || 'Untitled Video';
  const videoDuration = video?.duration ? Math.round(video.duration) : 60;
  const videoStatus = video?.status || 'unknown';

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

  // Processing state
  if (videoStatus === 'asset_created' || videoStatus === 'preparing') {
    return (
      <Box
        background="bg-fill-info-secondary"
        padding="400"
        borderRadius="200"
      >
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
    <BlockStack gap="200">


      <Box
        background="bg-surface-secondary"
        style={{
          width: "100%",
          height: "200px",
          border: "1px solid var(--p-color-border)",
          overflow: 'hidden',
          borderRadius: '8px',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={handleChange}
      >
        <VideoThumbnail
          // videoLength={videoDuration}
          thumbnailUrl={`https://image.mux.com/${playbackId}/thumbnail.png?width=400&height=500&fit_mode=smartcrop&time=1`}
        />
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          Click to preview
        </div>

      </Box>


      <BlockStack gap="100">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodySm" fontWeight="semibold">
          {videoTitle}
        </Text>
        {onRemove && (
            <Button
              icon={DeleteIcon}
              onClick={onRemove}
              variant="plain"
              tone="critical"
              size="slim"
              accessibilityLabel="Remove video"
            />
          )}
        </InlineStack>
        <ResourcePicker
          selectedProducts={taggedProducts}
          onProductsSelected={handleTaggedProductsChange}
        />
      </BlockStack>


      <Modal
        open={active}
        onClose={handleChange}
        title={videoTitle}
        size="large"
      >
        <Modal.Section>
          <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
            <video
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              controls
              autoPlay
              src={`https://stream.mux.com/${playbackId}.m3u8`}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <BlockStack gap="200" inlineAlign="start">
            <Text as="p" variant="bodySm" tone="subdued">
              Playback ID: {playbackId}
            </Text>
            {video?.assetId && (
              <Text as="p" variant="bodySm" tone="subdued">
                Asset ID: {video.assetId}
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}