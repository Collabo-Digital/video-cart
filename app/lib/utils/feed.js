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
  return uploadedVideos.map((video) => ({
    id: video.id,
    videoId: video.videoId ?? video.id,
    playbackId: video.playbackId,
    uploadId: video.uploadId,
    assetId: video.assetId,
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
