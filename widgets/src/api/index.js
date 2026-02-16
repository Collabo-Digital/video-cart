/**
 * Single API singleton for all storefront API calls (ARCHITECTURE-RULES §13).
 * Structure: client.js (base fetch) → endpoints.js (URLs) → services/* (per resource).
 */

import { feedsService } from './services/feedsService';
import { analyticsService } from './services/analyticsService';

export const api = {
  feeds: feedsService,
  analytics: analyticsService,
};
