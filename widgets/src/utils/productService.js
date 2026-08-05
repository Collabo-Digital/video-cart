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

/* ------------------------------------------------------------------------- *
 * Detail-view model
 *
 * The overlay's product detail needs images, options, variants, description and
 * a product URL. Everything below normalises the two sources we have — the live
 * Ajax payload and the stored snapshot — into one shape, so the JSX never has
 * to branch on which one it got. That is what makes the offline/404 path work:
 * a product whose live fetch failed still renders and can still be bought.
 * ------------------------------------------------------------------------- */

const DEFAULT_OPTION_TITLE = 'Default Title';

/**
 * Image URL from any of the three shapes we receive: Ajax product images are
 * plain strings, Ajax variant.featured_image is an object, and the stored
 * snapshot uses { originalSrc }.
 */
function imageUrl(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.src ?? img.originalSrc ?? null;
}

/** Order-preserving unique; nulls and empty strings dropped. */
function unique(list) {
  return list.filter((v, i) => v != null && v !== '' && list.indexOf(v) === i);
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ajax `options` is normally [{ name, position, values }] but is sometimes a
 * bare array of names; derive the values from the variants when missing.
 */
function liveOptions(live) {
  const raw = Array.isArray(live?.options) ? live.options : [];
  return raw
    .map((opt, i) => {
      const name = typeof opt === 'string' ? opt : opt?.name ?? '';
      const values = typeof opt === 'string' ? null : opt?.values;
      return {
        name,
        values: Array.isArray(values) && values.length
          ? unique(values)
          : unique((live?.variants ?? []).map((v) => v?.[`option${i + 1}`])),
      };
    })
    .filter((o) => o.name);
}

function liveVariants(live) {
  return (live?.variants ?? [])
    .map((v) => ({
      id: v?.id != null ? String(v.id) : null,
      options: [v?.option1, v?.option2, v?.option3].filter((x) => x != null),
      available: Boolean(v?.available),
      price: centsToAmount(v?.price),
      compareAt: centsToAmount(v?.compare_at_price),
      image: imageUrl(v?.featured_image),
    }))
    .filter((v) => v.id);
}

/**
 * The snapshot stores selectedOptions on every variant, so option groups and
 * variant matching both work with no live data at all.
 */
function snapshotOptions(snapshot) {
  const names = unique(
    (snapshot?.variants ?? []).flatMap((v) => (v?.selectedOptions ?? []).map((o) => o?.name))
  );
  return names.map((name) => ({
    name,
    values: unique(
      (snapshot?.variants ?? []).map(
        (v) => (v?.selectedOptions ?? []).find((o) => o?.name === name)?.value
      )
    ),
  }));
}

function snapshotVariants(snapshot, names) {
  return (snapshot?.variants ?? [])
    .map((v) => ({
      id: v?.id != null ? String(v.id) : null,
      options: names
        .map((n) => (v?.selectedOptions ?? []).find((o) => o?.name === n)?.value)
        .filter((x) => x != null),
      available: v?.availableForSale !== false,
      price: toNumber(v?.price),
      compareAt: toNumber(v?.compareAtPrice),
      image: imageUrl(v?.image),
    }))
    .filter((v) => v.id);
}

/**
 * One shape for the detail view, from live data when we have it and the stored
 * snapshot when we don't.
 *
 * Prices are MAJOR units on both branches: the Ajax API returns cents, the
 * snapshot returns a decimal string. Mixing those up is a 100x price error.
 *
 * @param {Object} snapshot - A productsTagged entry from the feed proxy
 * @param {Object|null} live - /products/{handle}.js payload, or null
 */
export function buildProductViewModel(snapshot, live) {
  const options = live ? liveOptions(live) : snapshotOptions(snapshot);
  const names = options.map((o) => o.name);
  const variants = live ? liveVariants(live) : snapshotVariants(snapshot, names);

  // Union with every variant image, so the variant -> thumbnail sync can use
  // indexOf and always find a match.
  const images = unique([
    ...(live ? live.images ?? [] : snapshot?.images ?? []).map(imageUrl),
    snapshot?.image ?? null,
    ...variants.map((v) => v.image),
  ]);

  const root = window.Shopify?.routes?.root || '/';
  const handle = snapshot?.handle ?? live?.handle ?? '';

  return {
    images,
    eyebrow: live?.type || snapshot?.productType || live?.vendor || snapshot?.vendor || null,
    title: live?.title || snapshot?.title || '',
    options,
    variants,
    description: live?.description ?? '',
    url: live?.url || (handle ? `${root}products/${handle}` : null),
    isLive: Boolean(live),
  };
}

/** The variant whose every option matches the current selection. */
export function matchVariant(model, selected) {
  const names = model?.options?.map((o) => o.name) ?? [];
  if (!names.length) return model?.variants?.[0] ?? null;
  return (
    (model?.variants ?? []).find((v) => names.every((n, i) => v.options[i] === selected?.[n])) ?? null
  );
}

/**
 * Whether an option value is still offerable: some AVAILABLE variant carries it
 * while every *other* selected option stays fixed. Same rule Dawn uses.
 */
export function isValueAvailable(model, selected, optionIndex, value) {
  const names = model?.options?.map((o) => o.name) ?? [];
  return (model?.variants ?? []).some(
    (v) =>
      v.available &&
      v.options[optionIndex] === value &&
      names.every((n, i) => i === optionIndex || v.options[i] === selected?.[n])
  );
}

/** Nothing to choose: a single variant, or Shopify's synthetic "Default Title". */
export function hasRealOptions(model) {
  if (!model?.options?.length) return false;
  if ((model.variants?.length ?? 0) <= 1) return false;
  if (model.options.length === 1) {
    const [only] = model.options;
    if (only.values.length <= 1) return false;
    if (only.values[0] === DEFAULT_OPTION_TITLE) return false;
  }
  return true;
}

/**
 * Seed the selection from the same variant preferredVariant would pick, so the
 * detail's price doesn't jump when the Ajax response lands.
 */
export function defaultOptionValues(model) {
  const v = (model?.variants ?? []).find((x) => x.available) ?? model?.variants?.[0];
  if (!v) return {};
  return Object.fromEntries((model?.options ?? []).map((o, i) => [o.name, v.options[i]]));
}
