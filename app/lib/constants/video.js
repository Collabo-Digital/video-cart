/**
 * Video Constants
 */

export const VIDEO_CONFIG = {
  MAX_SIZE_BYTES: 500 * 1024 * 1024, // 500MB
  MAX_POLL_ATTEMPTS: 20,
  POLL_DELAY_MS: 2000, // 2 seconds
  CHUNK_SIZE: 512000, // 512KB
  RESET_DELAY_MS: 3000, // 3 seconds
};

export const VIDEO_STATUS = {
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  ERRORED: 'ERRORED',
  ASSET_CREATED: 'asset_created',
  PREPARING: 'preparing',
};

export const SOCIAL_SOURCE = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
};


export const PER_PAGE = 5;
export const BADGE_LIMIT = 2;
export const DEBOUNCE_MS = 500;

export const TABLE_HEADINGS = [
  { title: "" },
  { title: "Video name" },
  { title: "Feeds" },
  { title: "Feed names" },
  { title: "Created" },
  { title: "Actions" },
];

export const SORT_OPTIONS = [
  { label: "Date", value: "createdAt desc", directionLabel: "Newest first" },
  { label: "Date", value: "createdAt asc", directionLabel: "Oldest first" },
];

export const EMPTY_STATE_IMAGE =
  "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png";

