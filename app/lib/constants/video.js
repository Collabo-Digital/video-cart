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
