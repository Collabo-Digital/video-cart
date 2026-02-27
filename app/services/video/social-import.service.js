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
 * Derive a stable fileUploadName from an Instagram or TikTok URL for duplicate detection.
 * e.g. https://www.instagram.com/reel/DTkm8GrkjPD/ -> Insta-reel-DTkm8GrkjPD
 * e.g. https://www.tiktok.com/@user/video/1234567890 -> Tiktok-1234567890
 * @param {'instagram'|'tiktok'} source
 * @param {string} url - Full post URL
 * @returns {string} Name like Insta-reel-XXX or Tiktok-XXX
 */
export function deriveFileUploadNameFromUrl(source, url, shopDomain) {
  if (!url || typeof url !== 'string') return 'Untitled Video';
  const u = url.trim();
  try {
    const parsed = new URL(u);
    const path = parsed.pathname.replace(/\/+/g, '/').replace(/^\//, '').split('/');
    if (source === SOCIAL_SOURCE.INSTAGRAM) {
      const reelMatch = u.match(/\/reel\/([A-Za-z0-9_-]+)/i);
      if (reelMatch) return `Insta-reel-${reelMatch[1]}`;
      const pMatch = u.match(/\/p\/([A-Za-z0-9_-]+)/i);
      if (pMatch) return `Insta-p-${pMatch[1]}`;
      const last = path.filter(Boolean).pop();
      return last ? `Insta-${last}-${shopDomain}` : `Insta-import-${shopDomain}`;
    }
    if (source === SOCIAL_SOURCE.TIKTOK) {
      const videoMatch = u.match(/\/video\/(\d+)/);
      if (videoMatch) return `Tiktok-${videoMatch[1]}`;
      const last = path.filter(Boolean).pop();
      return last ? `Tiktok-${last}-${shopDomain}` : `Tiktok-import-${shopDomain}`;
    }
  } catch (_) { }
  return source === SOCIAL_SOURCE.TIKTOK ? 'Tiktok-import' : 'Insta-import';
}

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
 * Uses URL-derived fileUploadName for duplicate check and initial fileName.
 * @param {Object} params
 * @param {'instagram'|'tiktok'} params.source
 * @param {string} params.url
 * @param {string} params.shopDomain - Shop domain (required for Video–Shop relation)
 * @returns {Promise<Object>} Normalized video payload for UI
 */
export async function importSocialVideo({ source, url, shopDomain }) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required');
  }
  const fileUploadName = deriveFileUploadNameFromUrl(source, url, shopDomain);
  const resolved = await resolveSocialUrl({ source, url });
  const asset = await createAssetFromUrl(resolved.directUrl, { shopDomain });
  const displayName = resolved.title?.trim() || fileUploadName;
  const video = await createVideoForImportedAsset({
    assetId: asset.assetId,
    playbackId: asset.playbackId,
    title: displayName,
    fileName: displayName,
    fileUploadName,
    shopDomain,
  });

  return {
    id: video.id,
    assetId: video.videoAssetId,
    playbackId: video.videoPlaybackId,
    title: video.title,
    fileName: video.fileName,
    fileUploadName: video.fileUploadName,
    status: video.status,
    thumbnail: resolved.thumbnail,
  };
}

