/**
 * Shared constants for the widgets runtime.
 * Keep selectors and API paths in one place (ARCHITECTURE-RULES §2, §6, §7).
 */

/** Base URL for API requests. Empty = same-origin (storefront). Set in build if needed (e.g. VITE_API_URL). */
export const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL != null
  ? import.meta.env.VITE_API_URL
  : '';

export const CONTAINER_SELECTOR = '.video-cart-container';
export const FEED_API_PATH = 'apps/video-widget/feeds';

/** Demo/placeholder playback ID (e.g. for demo or input); do not hardcode full URLs in components. */
export const DEMO_PLAYBACK_ID = '7O7RsL2n51IHLTkYLPQ2GqrmEYez00DyevmpNUSgG024A';
