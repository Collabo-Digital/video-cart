/**
 * Analytics API service. Records events via app proxy (stored in DB).
 * Uses GET + query params because Shopify app proxy only forwards GET requests.
 * Fire-and-forget; does not throw to avoid breaking playback.
 */

import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { getVisitorId, getSessionId } from '../../utils/session';

export const EVENT_TYPES = {
  // Widget-level
  WIDGET_IMPRESSION: 'widget_impression',
  WIDGET_CLICK: 'widget_click',
  WIDGET_VIDEO_PLAY: 'widget_video_play',
  WIDGET_PRODUCT_CLICK: 'widget_product_click',
  WIDGET_ATC: 'widget_add_to_cart',
  WIDGET_ORDER: 'widget_order',

  // Video-level
  VIDEO_IMPRESSION: 'video_impression',
  VIDEO_VIEW: 'video_view',
  VIDEO_PRODUCT_CLICK: 'video_product_click',
  VIDEO_ATC_CLICK: 'video_atc_click',
  VIDEO_ATC: 'video_add_to_cart',
  VIDEO_ORDER: 'video_order',
};

/**
 * Record an analytics event (widget/video impression, view, click, product click, ATC, order).
 * Sends GET so the request is proxied by Shopify to the app.
 * @param {Object} params
 * @param {string} params.feedId
 * @param {string} [params.videoId] - required for video-level events
 * @param {string} params.eventType - EVENT_TYPES.WIDGET_* or EVENT_TYPES.VIDEO_*
 * @param {number} [params.watchTimeSeconds] - for VIDEO_VIEW
 * @param {number} [params.revenueAmount] - for order events
 * @param {number} [params.orderCount] - for order events
 */
export async function recordEvent({
  feedId,
  videoId,
  eventType,
  watchTimeSeconds,
  // legacy
  salesAmount,
  // new
  revenueAmount,
  orderCount,
} = {}) {
  const params = new URLSearchParams({ feedId, eventType });
  if (videoId) params.set('videoId', videoId);
  if (watchTimeSeconds != null) params.set('watchTimeSeconds', String(watchTimeSeconds));
  if (salesAmount != null) params.set('salesAmount', String(salesAmount));
  if (revenueAmount != null) params.set('revenueAmount', String(revenueAmount));
  if (orderCount != null) params.set('orderCount', String(orderCount));
  // Anonymous visitor/session ids — used server-side for bot/rate-limit keying
  // and future unique-visitor metrics.
  params.set('vid', getVisitorId());
  params.set('sid', getSessionId());

  const url = `${ENDPOINTS.ANALYTICS_EVENT}?${params.toString()}`;
  const res = await apiClient.get(url);
  return res;
}

/**
 * Record an ATC attribution intent keyed by the Shopify cart token. The
 * orders/create webhook joins on the order's cart_token server-side, so no
 * properties ever touch the cart or order.
 * @param {Object} params
 * @param {string} params.cartToken
 * @param {string|number} params.productId
 * @param {string} [params.variantId]
 * @param {number} [params.quantity]
 * @param {string} params.feedId
 * @param {string} params.videoId
 */
export async function recordAtcIntent({ cartToken, productId, variantId, quantity, feedId, videoId }) {
  return apiClient.post(ENDPOINTS.ATC_INTENT, {
    cartToken,
    productId,
    variantId,
    quantity,
    feedId,
    videoId,
    visitorId: getVisitorId(),
  });
}

export const analyticsService = {
  recordEvent,
  recordAtcIntent,
  EVENT_TYPES,
};
