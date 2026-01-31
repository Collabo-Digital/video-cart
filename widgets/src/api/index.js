/**
 * Single API singleton for all storefront API calls (ARCHITECTURE-RULES §13).
 * Structure: client.js (base fetch) → endpoints.js (URLs) → services/* (per resource).
 * Use api.feeds.* for feed endpoints; add api.analytics.*, api.products.*, etc. as needed.
 */

import { feedsService } from './services/feedsService';

export const api = {
  feeds: feedsService,
  // Future: analytics: analyticsService,
  // Future: products: productsService,
};
