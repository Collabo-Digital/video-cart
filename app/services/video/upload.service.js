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
 * Normalize and sanitize file name for fileName/fileUploadName (trim, reasonable length).
 * @param {string} name - Raw file name
 * @returns {string} Sanitized name
 */
function sanitizeFileName(name, shopDomain) {
  if (typeof name !== 'string' || !name.trim()) return 'Untitled Video';
  const trimmed = name.trim();
  const maxLen = 255;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : `${trimmed}-${shopDomain}`;
}

/**
 * Create upload URL for client-side upload. Video DB record is created by the Mux
 * webhook on video.asset.ready (not here), so failed/abandoned uploads leave no orphan rows.
 * fileName/fileUploadName are stored in Mux passthrough for the webhook.
 * @param {Object} options - Upload options
 * @param {string} options.shopDomain - Shop domain (required for Video->Shop relation)
 * @param {string} [options.fileName] - Original file name (used for title, fileName, fileUploadName; required for duplicate check)
 * @returns {Promise<Object>} Upload URL and ID
 * @throws {Error} If fileUploadName already exists (duplicate)
 */
export async function createUploadUrl(options = {}) {
  const { shopDomain } = options;
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required for video upload');
  }

  const rawName = options.fileName;
  const fileUploadName = sanitizeFileName(rawName || 'Untitled Video', shopDomain);

  const existing = await VideoModel.findByFileUploadName(fileUploadName, shopDomain);
  if (existing) {
    const err = new Error('This video is already in your library. A video with the same name has already been uploaded.');
    err.code = 'DUPLICATE_VIDEO';
    err.statusCode = 409;
    throw err;
  }

  const passthrough = JSON.stringify({ shopDomain, fileName: fileUploadName, fileUploadName });
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: options.quality || 'basic',
      passthrough,
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
 * Get upload status from Mux, scoped to the owning shop.
 * Ownership comes from the passthrough written at createUploadUrl time, which
 * works even before the Mux asset (and our Video row) exists.
 * @param {string} uploadId - Mux upload ID
 * @param {string} shopDomain - Authenticated shop (ownership is enforced)
 * @returns {Promise<Object>} Upload status
 */
export async function getUploadStatus(uploadId, shopDomain) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required');
  }

  const upload = await mux.video.uploads.retrieve(uploadId);

  let owner = null;
  try {
    owner = JSON.parse(upload?.new_asset_settings?.passthrough ?? '{}')?.shopDomain ?? null;
  } catch {
    owner = null;
  }
  if (owner !== shopDomain) {
    // Same response as "doesn't exist" so we don't leak which uploads are real.
    const err = new Error('Upload not found');
    err.statusCode = 404;
    throw err;
  }

  // asset_id only exists once Mux has created the asset; fetching before then
  // makes Mux 404 and turns every early poll into a 500.
  let playbackId = null;
  if (upload.asset_id) {
    const asset = await mux.video.assets.retrieve(upload.asset_id);
    playbackId = asset.playback_ids ?? null;
  }

  return {
    id: upload.id,
    status: upload.status,
    assetId: upload.asset_id ?? null,
    error: upload.error,
    playbackId,
  };
}

/**
 * Create Mux asset from a public video URL (server-side import).
 * @param {string} videoUrl - Publicly accessible URL to a video file
 * @param {Object} [opts] - Options
 * @param {string} [opts.shopDomain] - Shop domain (stored in asset passthrough for webhook)
 * @returns {Promise<{assetId: string, status: string, playbackId: (string|null)}>}
 */
export async function createAssetFromUrl(videoUrl, opts = {}) {
  const createOpts = {
    inputs: [{ url: videoUrl }],
    playback_policies: ['public'],
  };
  if (opts.shopDomain) {
    createOpts.passthrough = JSON.stringify({ shopDomain: opts.shopDomain });
  }
  const asset = await mux.video.assets.create(createOpts);

  return {
    assetId: asset.id,
    status: asset.status || 'preparing',
    playbackId: asset.playback_ids?.[0]?.id ?? null,
  };
}

/**
 * Create or update a Video record for a server-side imported asset.
 * Uses fileName and fileUploadName for display and duplicate detection; fileUploadName must be unique.
 * @param {Object} params
 * @param {string} params.assetId
 * @param {string|null} params.playbackId
 * @param {string} [params.title]
 * @param {string} [params.fileName] - Display name (same as fileUploadName at creation)
 * @param {string} [params.fileUploadName] - Immutable name for duplicate check
 * @returns {Promise<Object>} Created or updated video record
 * @throws {Error} If fileUploadName already exists (duplicate)
 */
export async function createVideoForImportedAsset({ assetId, playbackId, title, fileName, fileUploadName, shopDomain }) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required');
  }
  const name = fileUploadName || fileName || title || 'Imported Video';
  const uploadName = sanitizeFileName(fileUploadName || fileName || title || 'Imported Video', shopDomain);
  if (uploadName) {
    const duplicate = await VideoModel.findByFileUploadName(uploadName, shopDomain);
    if (duplicate) {
      const err = new Error('This video is already in your library. It has already been imported.');
      err.code = 'DUPLICATE_VIDEO';
      err.statusCode = 409;
      throw err;
    }
  }

  const displayName = fileName || title || name;
  const createPayload = {
    title: displayName,
    fileName: displayName,
    fileUploadName: uploadName || undefined,
    serviceProvider: 'mux',
    videoPlaybackId: playbackId,
    status: 'PROCESSING',
  };

  const existing = await VideoModel.findByAssetId(assetId);
  if (existing) {
    const updatePayload = {
      title: createPayload.title,
      fileName: createPayload.fileName,
      serviceProvider: createPayload.serviceProvider,
      videoPlaybackId: createPayload.videoPlaybackId,
      status: createPayload.status,
    };
    return VideoModel.updateById(existing.id, updatePayload);
  }

  const videoUploadId = `import-${assetId}`;
  return VideoModel.create({
    videoUploadId,
    videoAssetId: assetId,
    ...createPayload,
    shop: { connect: { shopDomain } },
  });
}
