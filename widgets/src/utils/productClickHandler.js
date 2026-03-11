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
            await addToCart([{
                id: getVariantId(productObj),
                quantity: 1,
                properties: {
                    _video_id: video?.id,
                    _widget_id: feed?.id,
                    timestamp: Date.now(),
                    source: cartSource,
                },
            }])
                .then(async () => {
                    // if (isAddToCartSuccess(response)) {
                    showToast(TOAST_ADDED, 'success');
                    if (feed?.id) {
                        await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_ATC });
                    }
                    if (feed?.id && video?.id) {
                        await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_ATC });
                    }
                    // }
                })
                .catch(() => {
                    showToast(TOAST_ADD_FAILED, 'error');
                });
            return;
        }

        if (feed?.id && video?.id) {
            await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
        }

        const handle = typeof product === 'object' ? getProductHandle(product) : product;
        if (handle) window.location.href = `/products/${handle}`;
    };
}