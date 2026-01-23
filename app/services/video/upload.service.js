/**
 * Video Upload Service
 * 
 * Handles video upload workflow and business logic.
 */

import mux from '../../config/mux.server';
import * as VideoModel from '../../models/video.server';

/**
 * Create upload URL for client
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload URL and ID
 */
export async function createUploadUrl(options = {}) {
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: options.quality || 'basic',
    },
    cors_origin: options.corsOrigin || '*',
    test: process.env.NODE_ENV !== 'production',
  });

  return {
    uploadId: upload.id,
    url: upload.url,
  };
}

/**
 * Get upload status from Mux
 * @param {string} uploadId - Mux upload ID
 * @returns {Promise<Object>} Upload status
 */
export async function getUploadStatus(uploadId) {
  const upload = await mux.video.uploads.retrieve(uploadId);

  return {
    id: upload.id,
    status: upload.status,
    assetId: upload.asset_id,
    error: upload.error,
  };
}
