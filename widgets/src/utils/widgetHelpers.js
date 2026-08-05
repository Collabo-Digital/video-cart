import { DEFAULT_ADD_TO_CART } from '../constants/strings';
import { HTTP_OK } from '../core/constant';

/** Get products tagged to a video */
export function productsForVideo(video) {
    return video?.productsTagged ?? [];
}

/** Storefront's active currency ISO code (INR, USD, ...) with safe fallbacks. */
function activeCurrency() {
    return (
        window.Shopify?.currency?.active ||
        window.__video_cart_config__?.currency ||
        'USD'
    );
}

/** Format an amount in the storefront's currency, e.g. ₹499, $12.50, ¥1,200 */
export function formatMoney(num) {
    const currency = activeCurrency();
    // Multi-currency stores: tagged prices are in the shop's base currency;
    // Shopify.currency.rate converts to the visitor's selected currency.
    const rate = parseFloat(window.Shopify?.currency?.rate) || 1;
    const amount = num * rate;
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            trailingZeroDisplay: 'stripIfInteger',
        }).format(amount);
    } catch (_) {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

/**
 * Plain-text excerpt from Shopify's HTML product description.
 * DOMParser yields an inert document — unlike innerHTML it neither runs scripts
 * nor fetches <img> URLs, so untrusted merchant HTML is safe here.
 */
export function htmlToText(html, maxChars = 220) {
    if (typeof html !== 'string' || !html) return '';
    let text;
    try {
        const body = new DOMParser().parseFromString(html, 'text/html').body;
        // textContent runs blocks together ("…2-3 days.Each piece…"), so give
        // every block boundary an explicit separator first.
        body?.querySelectorAll('p, div, br, li, tr, h1, h2, h3, h4, h5, h6')
            .forEach((el) => el.insertAdjacentText('beforebegin', ' '));
        text = body?.textContent || '';
    } catch (_) {
        text = html.replace(/<[^>]*>/g, ' ');
    }
    text = text.replace(/\s+/g, ' ').trim();
    return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

/** Format price from first variant. Returns { raw, formatted } or null. */
export function productPrice(product) {
    const priceVal = product?.variants?.[0]?.price;
    if (priceVal == null || priceVal === '') return null;
    const num = typeof priceVal === 'string' ? parseFloat(priceVal, 10) : Number(priceVal);
    if (Number.isNaN(num)) return null;
    return { raw: priceVal, formatted: formatMoney(num) };
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