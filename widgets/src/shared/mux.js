/**
 * Mux CDN URL helpers. Single place for playback and thumbnail URLs (ARCHITECTURE-RULES §9).
 */

const MUX_STREAM_BASE = 'https://stream.mux.com';
const MUX_IMAGE_BASE = 'https://image.mux.com';

export function getPlaybackUrl(playbackId) {
  if (!playbackId) return null;
  return `${MUX_STREAM_BASE}/${playbackId}.m3u8`;
}

export function getThumbnailUrl(playbackId, width = 240, height = 135) {
  if (!playbackId) return null;
  return `${MUX_IMAGE_BASE}/${playbackId}/thumbnail.jpg?width=${width}&height=${height}`;
}

export function getTumbnailPreviewUrl(playbackId, width = 240, height = 135) {
  if (!playbackId) return null;
  return `${MUX_IMAGE_BASE}/${playbackId}/animated.webp?width=${width}`;
}