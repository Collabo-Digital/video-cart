/**
 * Feed Utilities
 *
 * Pure helpers for feed/video payload shaping. No server imports — safe for client.
 */

/**
 * Prepare uploaded videos + tagged products for feed create/update payload.
 * Normalizes tagged products to productsTagged shape (id, title, handle, image, images, variants).
 * Includes id, videoId, playbackId, uploadId, assetId so the server can resolve Video record.
 * @param {Array<Object>} uploadedVideos - Videos with taggedProducts
 * @returns {Array<{ id, videoId, playbackId, uploadId, assetId, position, productsTagged }>} Payload for API
 */
export function prepareVideosPayload(uploadedVideos) {
  if (!Array.isArray(uploadedVideos)) return [];
  return uploadedVideos.map((v) => ({
    id: v.id,
    videoId: v.videoId ?? v.id,
    playbackId: v.playbackId,
    uploadId: v.uploadId,
    assetId: v.assetId,
    position: v.position ?? 0,
    productsTagged: (v.taggedProducts || []).map((p) =>
      typeof p === 'object' && p !== null
        ? {
          id: p.id != null ? String(p.id) : '',
          title: p.title ?? '',
          handle: p.handle ?? '',
          image: p.image ?? null,
          images: p.images ?? [],
          productType: p.productType,
          status: p.status,
          vendor: p.vendor,
          variants: Array.isArray(p.variants) ? p.variants : [],
        }
        : { id: String(p), title: '', handle: '', image: null, images: [], variants: [] }
    ),
  }));
}
