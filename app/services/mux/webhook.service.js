/**
 * Mux Webhook Service
 * 
 * Handles Mux webhook events and processing.
 */

import mux from '../../config/mux.server';
import * as VideoModel from '../../models/video.server';

/**
 * Handle Mux webhook event
 * @param {Request} request - HTTP request
 * @returns {Promise<Object>} Processing result
 */
export async function handleMuxWebhook(request) {
  const body = await request.text();
  
  const event = mux.webhooks.unwrap(
    body,
    request.headers,
    process.env.MUX_WEBHOOK_SIGNING_SECRET
  );

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
 * Handle video ready event
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Created/updated video
 */
async function handleVideoReady(data) {
  const {
    upload_id,
    id: assetId,
    playback_ids,
    duration,
    aspect_ratio,
  } = data;

  if (!upload_id || !assetId) {
    console.error('Missing upload_id or assetId');
    return null;
  }

  const playbackId = playback_ids?.[0]?.id;

  const video = await VideoModel.upsertByUploadId({
    uploadId: upload_id,
    title: 'Untitled Video',
    serviceProvider: 'mux',
    videoAssetId: assetId,
    videoPlaybackId: playbackId,
    duration,
    aspectRatio: aspect_ratio,
    status: 'READY',
  });

  console.log('Video upserted for upload:', upload_id);
  return video;
}

/**
 * Handle video error event
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Updated video
 */
async function handleVideoError(data) {
  const { upload_id } = data;

  if (!upload_id) {
    return null;
  }

  const video = await VideoModel.upsertByUploadId({
    uploadId: upload_id,
    title: 'Untitled Video',
    serviceProvider: 'mux',
    status: 'ERRORED',
  });

  console.log('Video marked as ERRORED:', upload_id);
  return video;
}
