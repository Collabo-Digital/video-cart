/**
 * API endpoint constants. Never hardcode URLs in components or services (ARCHITECTURE-RULES §13).
 */

import { FEED_API_PATH } from '../core/config';

export const ENDPOINTS = {
  // Feed endpoints
  FEED_BY_ID: (feedId, shop) => {
    const path = `${FEED_API_PATH}/${feedId}`;
    if (!shop) return path;
    return `${path}?shop=${encodeURIComponent(shop)}`;
  },
  // Future: FEED_LIST: `${FEED_API_PATH}/list`,
  // Future: PRODUCTS: '/apps/video-widget/products',
};
