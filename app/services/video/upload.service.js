/**
 * Video Upload Service
 *
 * Handles video upload workflow and server-side import (Mux asset from URL).
 * Uses Config (mux) and Models only; no HTTP, no Prisma direct.
 *
 * @see ARCHITECTURE.md Services layer
 */
/* global process */

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
  const asset = await mux.video.assets.retrieve(upload.asset_id);

  return {
    id: upload.id,
    status: upload.status,
    assetId: upload.asset_id,
    error: upload.error,
    playbackId: asset.playback_ids,
  };
}

/**
 * Create Mux asset from a public video URL (server-side import).
 * @param {string} videoUrl - Publicly accessible URL to a video file
 * @returns {Promise<{assetId: string, status: string, playbackId: (string|null)}>}
 */
export async function createAssetFromUrl(videoUrl) {
  const asset = await mux.video.assets.create({
    inputs: [{ url: videoUrl }],
    playback_policies: ['public'],
  });

  return {
    assetId: asset.id,
    status: asset.status || 'preparing',
    playbackId: asset.playback_ids?.[0]?.id ?? null,
  };
}

/**
 * Create a Video record for a server-side imported asset.
 * @param {Object} params
 * @param {string} params.assetId
 * @param {string|null} params.playbackId
 * @param {string} params.title
 * @returns {Promise<Object>} Created video record
 */
export async function createVideoForImportedAsset({ assetId, playbackId, title }) {
  // videoUploadId is required and unique; for imports we derive a stable id from the asset id
  const videoUploadId = `import-${assetId}`;

  return VideoModel.create({
    title: title || 'Imported Video',
    serviceProvider: 'mux',
    videoUploadId,
    videoAssetId: assetId,
    videoPlaybackId: playbackId,
    status: 'PROCESSING',
  });
}
