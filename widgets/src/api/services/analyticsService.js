/**
 * Analytics API service. Records events via app proxy (stored in DB).
 * Uses GET + query params because Shopify app proxy only forwards GET requests.
 * Fire-and-forget; does not throw to avoid breaking playback.
 */

import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';

export const EVENT_TYPES = {
  IMPRESSION: 'impression',
  VIEW: 'view',
  CLICK: 'click',
  PURCHASE: 'purchase',
};

/**
 * Record an analytics event (impression, view, click, purchase).
 * Sends GET so the request is proxied by Shopify to the app.
 * @param {Object} params
 * @param {string} params.feedId
 * @param {string} [params.videoId]
 * @param {string} params.eventType
 * @param {number} [params.watchTimeSeconds]
 * @param {number} [params.salesAmount]
 */
export async function recordEvent({ feedId, videoId, eventType, watchTimeSeconds, salesAmount }) {
  const params = new URLSearchParams({ feedId, eventType });
  if (videoId) params.set('videoId', videoId);
  if (watchTimeSeconds != null) params.set('watchTimeSeconds', String(watchTimeSeconds));
  if (salesAmount != null) params.set('salesAmount', String(salesAmount));

  const url = `${ENDPOINTS.ANALYTICS_EVENT}?${params.toString()}`;
  const res = await apiClient.get(url);
  return res;
}

export const analyticsService = {
  recordEvent,
  EVENT_TYPES,
};
