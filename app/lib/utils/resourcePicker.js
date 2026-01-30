/**
 * Resource Picker Utilities
 *
 * Pure helpers for normalizing Shopify Resource Picker product/variant data
 * for storage (productsTagged JSON). No side effects.
 */

/**
 * Normalize product GID to numeric id for storage (e.g. gid://shopify/Product/123 -> 123)
 * @param {string} gid - Shopify product GID
 * @returns {string} Numeric id or original value
 */
export function toStoredId(gid) {
  if (!gid) return gid;
  const match = String(gid).match(/gid:\/\/shopify\/Product\/(\d+)/);
  return match ? match[1] : gid;
}

/**
 * Normalize variant GID to numeric id (e.g. gid://shopify/ProductVariant/123 -> 123)
 * @param {string} gid - Shopify variant GID
 * @returns {string} Numeric id or original value
 */
export function toStoredVariantId(gid) {
  if (!gid) return gid;
  const match = String(gid).match(/gid:\/\/shopify\/ProductVariant\/(\d+)/);
  return match ? match[1] : gid;
}

/**
 * Convert stored id to Shopify product GID for resource picker selectionIds
 * @param {string} id - Stored id (numeric or GID)
 * @returns {string} GID string
 */
export function toSelectionGid(id) {
  if (!id) return '';
  const s = String(id).trim();
  if (s.startsWith('gid://')) return s;
  return `gid://shopify/Product/${s}`;
}

/**
 * Normalize a single variant from picker (ProductVariant shape) for storage
 * @param {Object} variant - Picker variant object
 * @returns {Object|null} Normalized variant or null
 */
export function normalizeVariant(variant) {
  if (!variant) return null;
  const id = variant?.id ?? '';
  const storedId = toStoredVariantId(id);
  const image = variant?.image?.originalSrc ?? null;
  return {
    id: storedId,
    title: variant?.title ?? '',
    displayName: variant?.displayName ?? '',
    price: variant?.price ?? null,
    compareAtPrice: variant?.compareAtPrice ?? null,
    image,
    position: variant?.position ?? 0,
    availableForSale: variant?.availableForSale ?? true,
    selectedOptions: variant?.selectedOptions ?? [],
  };
}

/**
 * Normalize Resource Picker product to main fields + variants for productsTagged JSON
 * @param {Object} rawProduct - Picker product object (id, title, handle, images, variants)
 * @returns {Object} Normalized product for storage
 */
export function normalizeProduct(rawProduct) {
  const gid = rawProduct?.id ?? '';
  const id = toStoredId(gid);
  const title = rawProduct?.title ?? '';
  const handle = rawProduct?.handle ?? '';
  const firstImage = rawProduct?.images?.[0] ?? rawProduct?.image;
  const image = firstImage?.originalSrc ?? null;
  const images = rawProduct?.images?.length
    ? rawProduct.images.map((img) => ({
      id: img?.id,
      originalSrc: img?.originalSrc,
      altText: img?.altText ?? undefined,
    }))
    : firstImage
      ? [{ id: firstImage?.id, originalSrc: firstImage?.originalSrc, altText: firstImage?.altText }]
      : [];
  const variants = (rawProduct?.variants ?? []).map(normalizeVariant).filter(Boolean);
  return {
    id,
    title,
    handle,
    image,
    images,
    productType: rawProduct?.productType ?? undefined,
    status: rawProduct?.status ?? undefined,
    vendor: rawProduct?.vendor ?? undefined,
    variants,
  };
}
