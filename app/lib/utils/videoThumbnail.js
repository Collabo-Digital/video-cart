/**
 * Video thumbnail resolution.
 *
 * Mux serves a thumbnail only once the asset has finished encoding — asking for
 * one earlier returns 412, which renders as a broken image. A freshly imported
 * Instagram/TikTok video sits in PROCESSING for roughly 30-60 seconds, so every
 * surface that builds a Mux URL unconditionally shows a broken tile for that
 * whole window.
 *
 * Social imports already carry the original post's thumbnail (the resolver
 * returns it and it survives all the way to the card), so prefer that while Mux
 * catches up. When there is nothing usable, return null so the caller can render
 * a real placeholder instead of a broken image.
 */

const MUX_IMAGE_BASE = 'https://image.mux.com';

// The app's own status vocabulary, plus the raw Mux strings that still reach us
// on older rows.
const ENCODING_STATUSES = new Set(['PROCESSING', 'preparing', 'asset_created']);

/**
 * Pull a playback id out of the several shapes a video object can take.
 * @param {Object} video
 * @returns {string|null}
 */
function getPlaybackId(video) {
  if (typeof video?.playbackId === 'string') return video.playbackId;
  if (Array.isArray(video?.playbackId) && video.playbackId.length) {
    const first = video.playbackId[0];
    return typeof first === 'string' ? first : (first?.id ?? null);
  }
  return video?.videoPlaybackId ?? null;
}

/**
 * True while the asset cannot yet produce a thumbnail.
 * @param {Object} video
 * @returns {boolean}
 */
export function isVideoEncoding(video) {
  return ENCODING_STATUSES.has(video?.status);
}

/**
 * @param {Object} video
 * @param {Object} [options]
 * @param {number} [options.width=400]
 * @param {number} [options.height]
 * @param {string} [options.format='webp']
 * @returns {string|null} A usable image URL, or null when the caller should
 *   render a placeholder rather than a broken image.
 */
export function getVideoThumbnailUrl(video, { width = 400, height, format = 'webp' } = {}) {
  if (!video) return null;

  const playbackId = getPlaybackId(video);

  if (playbackId && !isVideoEncoding(video)) {
    const params = new URLSearchParams({
      width: String(width),
      fit_mode: 'smartcrop',
      time: '1',
    });
    if (height) params.set('height', String(height));
    return `${MUX_IMAGE_BASE}/${playbackId}/thumbnail.${format}?${params}`;
  }

  // Social imports hand us the original post's thumbnail — a real frame the
  // merchant recognises, available the instant the import returns.
  if (video.thumbnail) return video.thumbnail;

  return null;
}
