/**
 * Mux Webhook Service
 * 
 * Handles Mux webhook events and processing.
 */
/* global process */

import mux from '../../config/mux.server';
import * as VideoModel from '../../models/video.server';

/**
 * Handle Mux webhook event
 * @param {Request} request - HTTP request
 * @returns {Promise<Object>} Processing result
 */
export async function handleMuxWebhook(request) {
  const body = await request.text();

  const webhookSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET || process.env.MUX_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Mux webhook: MUX_WEBHOOK_SIGNING_SECRET or MUX_WEBHOOK_SECRET must be set');
    throw new Error('Webhook secret not configured');
  }
  const event = mux.webhooks.unwrap(body, request.headers, webhookSecret);

  console.log('Mux webhook event:', event.type);

  switch (event.type) {
    case 'video.asset.ready':
      return handleVideoReady(event.data);
    case 'video.asset.errored':
      return handleVideoError(event.data);
    default:
      console.log('Unhandled Mux event:', event.type);
      return null;
  }
}

/**
 * Handle video ready event.
 * If the video is already present in DB (by upload_id or assetId), update it; otherwise create a new entry.
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Created/updated video
 */
async function handleVideoReady(data) {
  console.log('Mux video ready event --->:', data);
  if (!data || typeof data !== 'object') {
    console.error('No webhook data present');
    return null;
  }

  // Mux sends asset at event.data; support both top-level and nested data
  const asset = data.data && typeof data.data === 'object' ? data.data : data;
  const {
    upload_id,
    id: assetId,
    playback_ids,
    duration,
    aspect_ratio,
    passthrough,
  } = asset;

  let shopDomain = null;
  let displayName = 'Untitled Video';
  let fileUploadName = null;
  if (passthrough && typeof passthrough === 'string') {
    try {
      const parsed = JSON.parse(passthrough);
      shopDomain = parsed?.shopDomain;
      displayName = parsed?.fileName || parsed?.fileUploadName || displayName;
      fileUploadName = parsed?.fileUploadName || displayName;
    } catch (_) {}
  }

  if (!assetId) {
    console.error('Missing asset id in webhook data. Keys:', Object.keys(asset || {}));
    return null;
  }

  const playbackId = playback_ids?.[0]?.id ?? null;
  const durationNum = duration != null ? Number(duration) : null;
  const payload = {
    serviceProvider: 'mux',
    videoPlaybackId: playbackId,
    duration: Number.isFinite(durationNum) ? durationNum : null,
    aspectRatio: aspect_ratio ?? null,
    status: 'READY',
  };

  const createPayload = {
    ...payload,
    title: displayName,
    fileName: displayName,
    fileUploadName: fileUploadName || displayName,
  };

  try {
    let video;
    if (upload_id) {
      const existing = await VideoModel.findByUploadId(upload_id);
      if (existing) {
        video = await VideoModel.updateById(existing.id, { ...payload, videoAssetId: assetId });
        console.log('Video updated for upload:', upload_id);
      } else if (shopDomain) {
        video = await VideoModel.create({
          videoUploadId: upload_id,
          videoAssetId: assetId,
          ...createPayload,
          shop: { connect: { shopDomain } },
        });
        console.log('Video created for upload:', upload_id);
      } else {
        console.warn('Mux webhook: skipping Video create for upload', upload_id, '- no shopDomain in passthrough');
      }
    } else {
      const existing = await VideoModel.findByAssetId(assetId);
      if (existing) {
        video = await VideoModel.updateById(existing.id, payload);
        console.log('Video updated for asset:', assetId);
      } else if (shopDomain) {
        video = await VideoModel.create({
          videoUploadId: `import-${assetId}`,
          videoAssetId: assetId,
          ...createPayload,
          shop: { connect: { shopDomain } },
        });
        console.log('Video created for asset:', assetId);
      } else {
        console.warn('Mux webhook: skipping Video create for asset', assetId, '- no shopDomain in passthrough');
      }
    }
    if (video) console.log('Video saved to MongoDB id:', video.id);
    return video ?? null;
  } catch (err) {
    console.error('Mux webhook handleVideoReady DB error:', err.message, err.stack);
    throw err;
  }
}

/**
 * Handle video error event.
 * If the video is already present, update status; otherwise create a new entry with ERRORED.
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Updated or created video
 */
async function handleVideoError(data) {
  if (!data || typeof data !== 'object') return null;

  const { upload_id, id: assetId } = data;

  const asset = data?.data && typeof data.data === 'object' ? data.data : data;
  const passthrough = asset?.passthrough;
  let shopDomain = null;
  if (passthrough && typeof passthrough === 'string') {
    try {
      const parsed = JSON.parse(passthrough);
      shopDomain = parsed?.shopDomain;
    } catch (_) {}
  }

  if (upload_id) {
    const existing = await VideoModel.findByUploadId(upload_id);
    if (existing) {
      const video = await VideoModel.updateById(existing.id, { status: 'ERRORED' });
      console.log('Video marked as ERRORED (upload):', upload_id);
      return video;
    }
    if (shopDomain) {
      const video = await VideoModel.create({
        videoUploadId: upload_id,
        videoAssetId: assetId ?? `unknown-${upload_id}`,
        title: 'Untitled Video',
        serviceProvider: 'mux',
        status: 'ERRORED',
        shop: { connect: { shopDomain } },
      });
      console.log('Video created with ERRORED (upload):', upload_id);
      return video;
    }
    console.warn('Mux webhook: skipping Video create for ERRORED upload', upload_id, '- no shopDomain');
  }

  if (assetId) {
    const existing = await VideoModel.findByAssetId(assetId);
    if (existing) {
      const video = await VideoModel.updateById(existing.id, { status: 'ERRORED' });
      console.log('Video marked as ERRORED (asset):', assetId);
      return video;
    }
    if (shopDomain) {
      const video = await VideoModel.create({
        videoUploadId: `import-${assetId}`,
        videoAssetId: assetId,
        title: 'Untitled Video',
        serviceProvider: 'mux',
        status: 'ERRORED',
        shop: { connect: { shopDomain } },
      });
      console.log('Video created with ERRORED (asset):', assetId);
      return video;
    }
    console.warn('Mux webhook: skipping Video create for ERRORED asset', assetId, '- no shopDomain');
  }

  return null;
}
