import { DEFAULT_ADD_TO_CART } from '../constants/strings';
import { HTTP_OK } from '../core/constant';

/** Get products tagged to a video */
export function productsForVideo(video) {
    return video?.productsTagged ?? [];
}

/** Format price from first variant. Returns { raw, formatted } or null. */
export function productPrice(product) {
    const priceVal = product?.variants?.[0]?.price;
    if (priceVal == null || priceVal === '') return null;
    const num = typeof priceVal === 'string' ? parseFloat(priceVal, 10) : Number(priceVal);
    if (Number.isNaN(num)) return null;
    return { raw: priceVal, formatted: `$ ${num.toFixed(num % 1 === 0 ? 0 : 2)}` };
}

/** Variant id for cart: first variant or product id. */
export function getVariantId(product) {
    return product?.variants?.[0]?.id ?? product?.id;
}

/** Get product handle from product object or string (handle/id). */
export function getProductHandle(productOrHandle) {
    if (!productOrHandle) return null;
    if (typeof productOrHandle === 'object') {
        return productOrHandle.handle ?? productOrHandle.id ?? null;
    }
    return productOrHandle;
}

/** Add-to-cart button label from feed settings */
export function getAddToCartLabel(feed) {
    return feed?.settings?.translation?.addToCartText || DEFAULT_ADD_TO_CART;
}

/** Button background style from feed/settings design */
export function getButtonStyle(feed, settings) {
    const raw = settings?.design?.buttonBackgroundColor ?? feed?.settings?.design?.buttonBackgroundColor;
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed ? { 'background-color': trimmed } : undefined;
}

/** Check if addToCart response indicates success (Shopify cart/add.js) */
export function isAddToCartSuccess(response) {
    return response?.status === HTTP_OK;
}