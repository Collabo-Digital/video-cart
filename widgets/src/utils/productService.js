/**
 * Live product data from the storefront's own Ajax API.
 *
 * Tagged products are snapshotted into `productsTagged` when the merchant tags
 * them, so the stored price/availability goes stale the moment the merchant
 * edits the product. Prices shown to shoppers must come from Shopify, not from
 * that snapshot.
 *
 * /products/{handle}.js is same-origin and CDN-cached, so this costs no app
 * proxy round-trip.
 */

/** handle -> Promise<product|null>. One request per product per page load. */
const cache = new Map();

/**
 * Fetch live product data. Never throws — the widget must keep working if the
 * request fails (falls back to the stored snapshot at the call site).
 * @param {string} handle - Product handle
 * @returns {Promise<Object|null>}
 */
export function fetchProduct(handle) {
  if (!handle) return Promise.resolve(null);
  if (cache.has(handle)) return cache.get(handle);

  const root = window.Shopify?.routes?.root || '/';
  const request = fetch(`${root}products/${encodeURIComponent(handle)}.js`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  cache.set(handle, request);
  return request;
}

/**
 * Ajax API prices are integer MINOR units (4999 === 49.99). The stored snapshot
 * uses decimal strings, so the two must never be formatted the same way.
 * @param {number|null|undefined} cents
 * @returns {number|null} Major units, or null
 */
export function centsToAmount(cents) {
  if (cents == null) return null;
  const n = Number(cents);
  return Number.isFinite(n) ? n / 100 : null;
}

/**
 * Pick the variant a shopper would get. Prefers the first available one so a
 * sold-out first variant doesn't make the whole product look unavailable.
 * @param {Object|null} liveProduct - Product from the Ajax API
 * @returns {Object|null}
 */
export function preferredVariant(liveProduct) {
  const variants = liveProduct?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  return variants.find((v) => v?.available) ?? variants[0];
}
