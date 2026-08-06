/**
 * Shared constants for the widgets runtime.
 * Keep selectors and API paths in one place (ARCHITECTURE-RULES §2, §6, §7).
 */

/** Base URL for API requests. Empty = same-origin (storefront). Set in build if needed (e.g. VITE_API_URL). */
export const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL != null
  ? import.meta.env.VITE_API_URL
  : '';

export const CONTAINER_SELECTOR = '.video-cart-container';
export const FEED_API_PATH = '/apps/video-widget/feeds';
/** App proxy path for recording analytics events (impression, view, click) in DB. */
export const ANALYTICS_EVENT_PATH = '/apps/video-widget/eventLog';
export const SETTINGS_API_PATH = '/apps/video-widget/settings';
export const DISCOVERY_API_PATH = '/apps/video-widget/discovery';
/** Which feed each theme app block renders, looked up by block id. */
export const BLOCKS_RESOLVE_PATH = '/apps/video-widget/blocks/resolve';

/** Demo/placeholder playback ID (e.g. for demo or input); do not hardcode full URLs in components. */
export const DEMO_PLAYBACK_ID = '7O7RsL2n51IHLTkYLPQ2GqrmEYez00DyevmpNUSgG024A';

/**
 * Mux Data env key for client-side playback analytics (engagement, QoE, errors).
 * Set VITE_MUX_DATA_ENV_KEY at build time or in .env. Get key from Mux dashboard > Data > Environments.
 */
export const MUX_DATA_ENV_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUX_DATA_ENV_KEY) || 'jqlne8peh4hfbhvdqrv59u9jv';
