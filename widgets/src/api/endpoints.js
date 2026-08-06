/**
 * API endpoint constants. Never hardcode URLs in components or services (ARCHITECTURE-RULES §13).
 */

import { FEED_API_PATH, ANALYTICS_EVENT_PATH, SETTINGS_API_PATH, DISCOVERY_API_PATH, BLOCKS_RESOLVE_PATH } from '../core/config';

export const ENDPOINTS = {
  FEED_BY_ID: (feedId, shop) => {
    const path = `${FEED_API_PATH}/${feedId}`;
    if (!shop) return path;
    return `${path}?shop=${encodeURIComponent(shop)}`;
  },
  /** Every block id on the page in one request — not one call per block. */
  BLOCKS_RESOLVE: (blockIds) =>
    `${BLOCKS_RESOLVE_PATH}?ids=${encodeURIComponent((blockIds || []).join(','))}`,
  ANALYTICS_EVENT: ANALYTICS_EVENT_PATH,
  SETTINGS: SETTINGS_API_PATH,
  DISCOVERY: DISCOVERY_API_PATH,
};
