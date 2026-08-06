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

const MAX_NAME_LEN = 255;

/**
 * Display name: what the merchant actually sees. Trimmed and capped, nothing else.
 * @param {string} name - Raw file name
 * @returns {string} Display name
 */
function displayFileName(name) {
  if (typeof name !== 'string' || !name.trim()) return 'Untitled Video';
  return name.trim().slice(0, MAX_NAME_LEN);
}

/**
 * Uniqueness key for duplicate detection. The shop suffix is an implementation
 * detail of the KEY and must never reach the UI — appending it to the display
 * name is what made every upload show as "clip.mp4-acme.myshopify.com".
 * The base is capped first so truncation can never eat the discriminator.
 * @param {string} name - Raw file name
 * @param {string} shopDomain - Owning shop
 * @returns {string} Shop-scoped uniqueness key
 */
function uploadNameKey(name, shopDomain) {
  const suffix = `-${shopDomain}`;
  const base = displayFileName(name).slice(0, Math.max(1, MAX_NAME_LEN - suffix.length));
  return `${base}${suffix}`;
}

/**
 * Read the shop/name metadata we stored on the Mux upload at creation time.
 * @param {Object} upload - Mux direct upload
 * @returns {{shopDomain: (string|null), fileName: (string|null), fileUploadName: (string|null)}}
 */
function parsePassthrough(upload) {
  try {
    const parsed = JSON.parse(upload?.new_asset_settings?.passthrough ?? '{}');
    return {
      shopDomain: parsed?.shopDomain ?? null,
      fileName: parsed?.fileName ?? null,
      fileUploadName: parsed?.fileUploadName ?? null,
    };
  } catch {
    return { shopDomain: null, fileName: null, fileUploadName: null };
  }
}

/**
 * Upsert the Video row for a direct upload and return its id.
 * videoAssetId is @unique and the Mux webhook may be creating the same row
 * concurrently — a P2002 just means the webhook won the race, so re-read
 * rather than failing the poll.
 * @returns {Promise<string|null>} Video.id
 */
async function ensureVideoRow({
  uploadId, assetId, playbackId, assetStatus, shopDomain, fileName, fileUploadName,
}) {
  const displayName = fileName || fileUploadName || 'Untitled Video';
  const status =
    assetStatus === 'ready' ? 'READY' : assetStatus === 'errored' ? 'ERRORED' : 'PROCESSING';

  // Never CREATE a row for an asset Mux has already failed. It would occupy the
  // shop-scoped fileUploadName and make the merchant's retry 409 with "already
  // in your library" — an unrecoverable dead end. An existing row is still
  // updated, so a later failure is recorded normally.
  if (assetStatus === 'errored') {
    const existing = await VideoModel.findByUploadId(uploadId);
    if (!existing) return null;
    const updated = await VideoModel.updateById(existing.id, { status: 'ERRORED' });
    return updated?.id ?? null;
  }

  try {
    const row = await VideoModel.upsertByUploadId({
      uploadId,
      create: {
        videoAssetId: assetId,
        videoPlaybackId: playbackId,
        title: displayName,
        fileName: displayName,
        fileUploadName: fileUploadName || displayName,
        serviceProvider: 'mux',
        status,
        shop: { connect: { shopDomain } },
      },
      // Deliberately NOT title/fileName — the merchant may have renamed the
      // video between polls.
      update: { videoAssetId: assetId, videoPlaybackId: playbackId, status },
    });
    return row?.id ?? null;
  } catch (err) {
    if (err?.code === 'P2002') {
      const existing = await VideoModel.findByUploadId(uploadId);
      return existing?.id ?? null;
    }
    throw err;
  }
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
  const fileName = displayFileName(rawName);
  const fileUploadName = uploadNameKey(rawName, shopDomain);

  const existing = await VideoModel.findByFileUploadName(fileUploadName, shopDomain);
  if (existing) {
    const err = new Error('This video is already in your library. A video with the same name has already been uploaded.');
    err.code = 'DUPLICATE_VIDEO';
    err.statusCode = 409;
    throw err;
  }

  // fileName is for display, fileUploadName is the dedupe key. The webhook reads both.
  const passthrough = JSON.stringify({ shopDomain, fileName, fileUploadName });
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

  const meta = parsePassthrough(upload);
  if (meta.shopDomain !== shopDomain) {
    // Same response as "doesn't exist" so we don't leak which uploads are real.
    const err = new Error('Upload not found');
    err.statusCode = 404;
    throw err;
  }

  // asset_id only exists once Mux has created the asset; fetching before then
  // makes Mux 404 and turns every early poll into a 500.
  let playbackId = null;
  let assetStatus = null;
  let videoId = null;

  if (upload.asset_id) {
    const asset = await mux.video.assets.retrieve(upload.asset_id);
    playbackId = asset.playback_ids ?? null;
    assetStatus = asset.status ?? null;

    // Create our Video row HERE rather than waiting for video.asset.ready.
    // The client legitimately reaches this point long before the webhook lands
    // (Mux attaches playback ids at asset creation), and in local dev the
    // webhook may never land at all — either way the feed save was left unable
    // to resolve the video. Keyed on videoUploadId, so the webhook still
    // updates this same row later with duration/aspectRatio and final status.
    videoId = await ensureVideoRow({
      uploadId: upload.id,
      assetId: upload.asset_id,
      playbackId: playbackId?.[0]?.id ?? null,
      assetStatus,
      shopDomain,
      fileName: meta.fileName,
      fileUploadName: meta.fileUploadName,
    });
  }

  return {
    id: upload.id,
    videoId,                // OUR Video.id — null until the asset exists
    status: upload.status,  // Mux DIRECT UPLOAD status
    assetStatus,            // Mux ASSET status: 'preparing' | 'ready' | 'errored'
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
  const uploadName = uploadNameKey(fileUploadName || fileName || title || 'Imported Video', shopDomain);
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
