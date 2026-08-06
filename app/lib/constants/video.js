/**
 * Video Constants
 */

export const VIDEO_CONFIG = {
  // Single source of truth for the upload cap — the UI strings interpolate
  // MAX_SIZE_MB so the displayed limit can never drift from the enforced one.
  MAX_SIZE_MB: 200,
  MAX_SIZE_BYTES: 200 * 1024 * 1024, // 200MB
  MAX_POLL_ATTEMPTS: 20,
  POLL_DELAY_MS: 2000, // 2 seconds
  // UpChunk's chunkSize is in KILOBYTES, not bytes. The previous value (512000)
  // was ~500MB — UpChunk's maximum — so every upload was a single chunk with no
  // real resumability. 30720 KB = 30MB is UpChunk's default.
  CHUNK_SIZE: 30720, // 30MB per chunk
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

