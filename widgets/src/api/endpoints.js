/**
 * API endpoint constants. Never hardcode URLs in components or services (ARCHITECTURE-RULES §13).
 */

import { FEED_API_PATH, ANALYTICS_EVENT_PATH } from '../core/config';

export const ENDPOINTS = {
  FEED_BY_ID: (feedId, shop) => {
    const path = `${FEED_API_PATH}/${feedId}`;
    if (!shop) return path;
    return `${path}?shop=${encodeURIComponent(shop)}`;
  },
  ANALYTICS_EVENT: ANALYTICS_EVENT_PATH,
};
