/**
 * Feed Utilities
 *
 * Pure helpers for feed/video payload shaping. No server imports — safe for client.
 */

/**
 * Normalize a string for duplicate comparison (trim, lowercase).
 * @param {string} s
 * @returns {string}
 */
function normalizeKey(s) {
  return (s && typeof s === 'string' ? s.trim().toLowerCase() : '') || '';
}

/**
 * Check if a video is a duplicate of any video in the existing list (same file/upload identity).
 * Uses fileUploadName first, then fileName, then id/videoId, then uploadId.
 * @param {Object} video - Video to check (may have fileUploadName, fileName, id, videoId, uploadId)
 * @param {Array<Object>} existingList - Current videos in the widget
 * @returns {boolean} true if video is already in the widget
 */
export function isDuplicateVideoInWidget(video, existingList) {
  if (!video || !Array.isArray(existingList) || existingList.length === 0) return false;

  const fileKey = normalizeKey(video.fileUploadName ?? video.fileName ?? '');
  const idKey = video.id ?? video.videoId ?? '';
  const uploadKey = video.uploadId ?? '';

  return existingList.some((existing) => {
    const existingFileKey = normalizeKey(existing.fileUploadName ?? existing.fileName ?? '');
    if (fileKey && existingFileKey && fileKey === existingFileKey) return true;
    if (idKey && (existing.id === idKey || existing.videoId === idKey)) return true;
    if (uploadKey && existing.uploadId === uploadKey) return true;
    return false;
  });
}

/**
 * Filter out videos that are already in the widget (by fileUploadName / id / uploadId).
 * @param {Array<Object>} newVideos - Videos to add
 * @param {Array<Object>} existingList - Current videos in the widget
 * @returns {{ toAdd: Array<Object>, duplicateCount: number }}
 */
export function filterDuplicateVideos(newVideos, existingList) {
  if (!Array.isArray(newVideos)) return { toAdd: [], duplicateCount: 0 };
  const toAdd = [];
  let duplicateCount = 0;
  const currentList = [...existingList];
  for (const v of newVideos) {
    if (isDuplicateVideoInWidget(v, currentList)) {
      duplicateCount += 1;
    } else {
      toAdd.push(v);
      currentList.push(v);
    }
  }
  return { toAdd, duplicateCount };
}

/**
 * Prepare uploaded videos + tagged products for feed create/update payload.
 * Normalizes tagged products to productsTagged shape (id, title, handle, image, images, variants).
 * Includes id, videoId, playbackId, uploadId, assetId so the server can resolve Video record.
 * @param {Array<Object>} uploadedVideos - Videos with taggedProducts
 * @returns {Array<{ id, videoId, playbackId, uploadId, assetId, position, productsTagged }>} Payload for API
 */
export function prepareVideosPayload(uploadedVideos) {
  if (!Array.isArray(uploadedVideos)) return [];
  return uploadedVideos.map((video) => ({
    id: video.id,
    videoId: video.videoId ?? video.id,
    playbackId: video.playbackId,
    uploadId: video.uploadId,
    assetId: video.assetId,
    fileName: video.fileName,
    position: video.position ?? 0,
    productsTagged: (video.taggedProducts || []).map((product) =>
      typeof product === 'object' && product !== null
        ? {
          id: product.id != null ? String(product.id) : '',
          title: product.title ?? '',
          handle: product.handle ?? '',
          image: product.image ?? null,
          images: product.images ?? [],
          productType: product.productType,
          status: product.status,
          vendor: product.vendor,
          variants: Array.isArray(product.variants) ? product.variants : [],
        }
        : { id: String(product), title: '', handle: '', image: null, images: [], variants: [] }
    ),
  }));
}
