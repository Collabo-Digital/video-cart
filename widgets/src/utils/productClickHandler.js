import { addToCart } from './shopifyService';
import { trackDbEvent } from './analytics';
import { EVENT_TYPES } from '../api/services/analyticsService';
import {
    getVariantId,
    getProductHandle,
    // isAddToCartSuccess,
} from './widgetHelpers';
import { TOAST_ADDED, TOAST_ADD_FAILED } from '../constants/strings';
import { WIDGET_SOURCES } from '../core/constant';
import { setStorageItem, getStorageItem } from './storage';

const BUTTON_BEHAVIOR_ADD_TO_CART = 'addToCart';

/**
 * Factory for handleProductClick used by all widgets.
 * Centralizes add-to-cart, analytics, and navigation logic.
 * @param {Object} opts
 * @param {Object} opts.feed
 * @param {Object} opts.settings
 * @param {Function} opts.onEvent
 * @param {Function} opts.showToast
 * @param {'carousel'|'grid'|'floating'|'stories'} opts.source
 */
export function createProductClickHandler({ feed, settings, onEvent, showToast, source, isPreview }) {
    if (isPreview) return;
    const cartSource = WIDGET_SOURCES[source] || WIDGET_SOURCES.carousel;

    return async function handleProductClick(product, video) {
        if (isPreview) return;
        const productHandle = typeof product === 'object' ? getProductHandle(product) : product;
        onEvent?.('product_click', {
            feedId: feed?.id,
            videoId: video?.id,
            productId: productHandle,
            source,
        });

        const behavior = feed?.settings?.general?.buttonBehavior;

        if (behavior === BUTTON_BEHAVIOR_ADD_TO_CART) {
            const productObj = typeof product === 'object' ? product : { id: product };
            try {
                await addToCart([{
                    id: getVariantId(productObj),
                    quantity: 1,
                }]);

                const existing = getStorageItem('atc_products', []);
                const newEntry = {
                    product_id: productObj.id,
                    video_id: video?.id,
                    widget_id: feed?.id,
                    source: cartSource,
                    timestamp: Date.now(),
                };

                const idx = existing.findIndex(
                    (item) =>
                        item.product_id === productObj.id &&
                        item.video_id === video?.id &&
                        item.widget_id === feed?.id
                );

                if (idx !== -1) {
                    existing[idx].quantity = (existing[idx].quantity || 1) + 1;
                    existing[idx].timestamp = Date.now();
                } else {
                    existing.push({ ...newEntry, quantity: 1 });
                }

                setStorageItem('atc_products', existing);
                showToast(TOAST_ADDED, 'success');

                // Fire-and-forget — don't block the UI for analytics
                if (feed?.id) {
                    trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_ATC });
                }
                if (feed?.id && video?.id) {
                    trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_ATC });
                }
            } catch {
                showToast(TOAST_ADD_FAILED, 'error');
            }
            return;
        }

        // Fire-and-forget — don't block navigation for analytics
        if (feed?.id && video?.id) {
            trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
            trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
        }

        const handle = typeof product === 'object' ? getProductHandle(product) : product;
        if (handle) window.location.href = `/products/${handle}`;
    };
}