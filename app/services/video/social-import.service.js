/**
 * Social Import Service
 *
 * Business logic for importing videos from Instagram/TikTok by URL.
 * Resolves post URLs via btch-downloader, then delegates Mux asset + Video record
 * creation to upload.service. No HTTP handling; no direct Prisma.
 *
 * @see ARCHITECTURE.md Services layer
 */

/* global process */

import { SOCIAL_SOURCE } from '../../lib/constants/video';
import { createAssetFromUrl, createVideoForImportedAsset } from './upload.service';

const RESOLVE_TIMEOUT_MS = 15_000;

/**
 * Only these hosts are ever contacted for a given source. The resolver is an
 * unaffiliated third party, so nothing but a genuine social link leaves here.
 */
const ALLOWED_HOSTS = {
  [SOCIAL_SOURCE.INSTAGRAM]: ['instagram.com', 'www.instagram.com'],
  [SOCIAL_SOURCE.TIKTOK]: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
};

/**
 * Validate a merchant-supplied social URL before it leaves this server.
 * @param {'instagram'|'tiktok'} source
 * @param {string} rawUrl
 * @returns {string} Normalized https URL
 * @throws {Error} With statusCode 400 when the URL is not a valid social link
 */
function assertSocialUrl(source, rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    const err = new Error('Invalid URL');
    err.statusCode = 400;
    throw err;
  }
  if (parsed.protocol !== 'https:') {
    const err = new Error('URL must use https');
    err.statusCode = 400;
    throw err;
  }
  const allowed = ALLOWED_HOSTS[source] ?? [];
  if (!allowed.includes(parsed.hostname.toLowerCase())) {
    const err = new Error(`URL must be a ${source} link`);
    err.statusCode = 400;
    throw err;
  }
  return parsed.toString();
}

/**
 * Reject if the third-party resolver doesn't answer in time, so a hanging host
 * can't burn the whole serverless function timeout.
 */
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`${label} timed out`);
        err.statusCode = 504;
        reject(err);
      }, ms);
    }),
  ]);
}

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
  // Kill switch: lets the feature be disabled without a deploy if the
  // third-party resolver goes down or is compromised.
  if (process.env.SOCIAL_IMPORT_ENABLED === 'false') {
    const err = new Error('Social import is temporarily unavailable');
    err.statusCode = 503;
    throw err;
  }

  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }
  // Only genuine Instagram/TikTok https links are ever sent to the resolver.
  const postUrl = assertSocialUrl(source, url);

  const { igdl, ttdl } = await import('btch-downloader');

  if (source === SOCIAL_SOURCE.INSTAGRAM) {
    const data = await withTimeout(igdl(postUrl), RESOLVE_TIMEOUT_MS, 'Instagram resolve');
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
    const data = await withTimeout(ttdl(postUrl), RESOLVE_TIMEOUT_MS, 'TikTok resolve');
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

  // The resolver is a third party — don't hand Mux whatever it returns unchecked.
  let directUrl;
  try {
    directUrl = new URL(resolved.directUrl);
  } catch {
    throw new Error('Resolver returned an invalid video URL');
  }
  if (directUrl.protocol !== 'https:') {
    throw new Error('Resolver returned an unsupported video URL');
  }

  const asset = await createAssetFromUrl(directUrl.toString(), { shopDomain });
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

