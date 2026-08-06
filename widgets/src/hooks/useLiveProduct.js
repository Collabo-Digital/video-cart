import { createSignal, onCleanup } from 'solid-js';
import { fetchProduct, centsToAmount, preferredVariant } from '../utils/productService';
import { formatMoney, getProductHandle, productPrice } from '../utils/widgetHelpers';

/**
 * Live price + availability for a tagged product.
 *
 * `productsTagged` stores a snapshot taken when the merchant tagged the product,
 * so its price and availability go stale as soon as the product is edited. This
 * fetches the current values from the storefront Ajax API instead.
 *
 * Degrades safely: until the request resolves (or if it fails) the stored price
 * is shown and the product is treated as available, so the widget never renders
 * an empty price or a wrongly-disabled button.
 *
 * @param {Object} product - Tagged product from productsTagged
 * @returns {{ live: () => Object|null, price: () => string|null, available: () => boolean }}
 */
export function useLiveProduct(product) {
  const [live, setLive] = createSignal(null);

  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });

  fetchProduct(getProductHandle(product)).then((data) => {
    if (!disposed) setLive(data);
  });

  const price = () => {
    const amount = centsToAmount(preferredVariant(live())?.price);
    if (amount != null) return formatMoney(amount);
    // Fall back to the stored snapshot rather than showing nothing.
    return productPrice(product)?.formatted ?? null;
  };

  // Only claim "sold out" once we actually have live data to say so.
  const available = () => (live() ? Boolean(preferredVariant(live())?.available) : true);

  return { live, price, available };
}
