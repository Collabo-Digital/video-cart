/**
 * Social Import Service
 *
 * Business logic for importing videos from Instagram/TikTok by URL.
 * Resolves post URLs via btch-downloader, then delegates Mux asset + Video record
 * creation to upload.service. No HTTP handling; no direct Prisma.
 *
 * @see ARCHITECTURE.md Services layer
 */

import { SOCIAL_SOURCE } from '../../lib/constants/video';
import { createAssetFromUrl, createVideoForImportedAsset } from './upload.service';

/**
 * Resolve an Instagram/TikTok post URL to a direct downloadable video URL + preview.
 * @param {Object} params
 * @param {'instagram'|'tiktok'} params.source
 * @param {string} params.url
 * @returns {Promise<{source: string, postUrl: string, directUrl: string, thumbnail: string|null, title: string|null}>}
 */
export async function resolveSocialUrl({ source, url }) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }
  const postUrl = url.trim();
  if (!postUrl) {
    throw new Error('URL is required');
  }

  const { igdl, ttdl } = await import('btch-downloader');

  if (source === SOCIAL_SOURCE.INSTAGRAM) {
    const data = await igdl(postUrl);
    if (!data?.status) {
      throw new Error(data?.message || 'Failed to fetch Instagram video');
    }
    const first = Array.isArray(data.result) ? data.result[0] : null;
    const directUrl = first?.url;
    if (!directUrl) {
      throw new Error('No downloadable video URL found for this Instagram link');
    }
    return {
      source,
      postUrl,
      directUrl,
      thumbnail: first?.thumbnail || null,
      title: null,
    };
  }

  if (source === SOCIAL_SOURCE.TIKTOK) {
    const data = await ttdl(postUrl);
    if (!data?.status) {
      throw new Error(data?.message || 'Failed to fetch TikTok video');
    }
    const videoField = data.video;
    const directUrl = typeof videoField === 'string' ? videoField : Array.isArray(videoField) ? videoField[0] : null;
    if (!directUrl) {
      throw new Error('No downloadable video URL found for this TikTok link');
    }
    return {
      source,
      postUrl,
      directUrl,
      thumbnail: data.thumbnail || null,
      title: data.title || null,
    };
  }

  throw new Error('Unsupported source');
}

/**
 * Import a social video into Mux (server-side): resolve → create asset → create Video record.
 * @param {Object} params
 * @param {'instagram'|'tiktok'} params.source
 * @param {string} params.url
 * @returns {Promise<Object>} Normalized video payload for UI
 */
export async function importSocialVideo({ source, url }) {
  const resolved = await resolveSocialUrl({ source, url });
  const asset = await createAssetFromUrl(resolved.directUrl);
  const video = await createVideoForImportedAsset({
    assetId: asset.assetId,
    playbackId: asset.playbackId,
    title: resolved.title || `Imported from ${source}`,
  });

  return {
    id: video.id,
    assetId: video.videoAssetId,
    playbackId: video.videoPlaybackId,
    title: video.title,
    status: video.status,
    thumbnail: resolved.thumbnail,
  };
}

