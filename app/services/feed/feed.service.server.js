/**
 * Feed Service
 *
 * Handles feed business logic and workflows. Server-only (uses models).
 */

import * as FeedModel from '../../models/feed.server';
import { syncFeedVideos } from '../../models/feed.server';
import * as VideoModel from '../../models/video.server';

/** MongoDB ObjectId is 24 hex characters */
function isMongoId(str) {
  return typeof str === 'string' && /^[a-fA-F0-9]{24}$/.test(str);
}

/**
 * Resolve payload video to our Video record id (by videoId, playbackId, assetId, or upload id).
 * @param {{ videoId?: string, id?: string, playbackId?: string, assetId?: string, uploadId?: string }} videoPayload
 * @returns {Promise<string|null>} Video.id or null
 */
async function resolveVideoId(videoPayload) {
  const candidateId = videoPayload.videoId ?? videoPayload.id;
  if (candidateId && isMongoId(candidateId)) {
    const found = await VideoModel.findById(candidateId);
    if (found) return found.id;
  }
  if (videoPayload.playbackId) {
    const byPlayback = await VideoModel.findByPlaybackId(videoPayload.playbackId);
    if (byPlayback) return byPlayback.id;
  }
  if (videoPayload.assetId) {
    const byAsset = await VideoModel.findByAssetId(videoPayload.assetId);
    if (byAsset) return byAsset.id;
  }
  const uploadId = videoPayload.uploadId ?? candidateId;
  if (uploadId) {
    const byUpload = await VideoModel.findByUploadId(uploadId);
    if (byUpload) return byUpload.id;
  }
  return null;
}

/**
 * Persist a display-name edit that arrived with the feed payload.
 * Shared by createFeed and updateFeed so a rename made before a feed's first
 * save is no longer silently discarded.
 * @param {string} videoId - Resolved Video.id
 * @param {{fileName?: string}} entry - Payload video
 */
async function applyFileName(videoId, entry) {
  const name = typeof entry.fileName === 'string' ? entry.fileName.trim() : '';
  if (name) await VideoModel.updateById(videoId, { fileName: name });
}

/**
 * Get all feeds for a shop
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<Array>} Array of feeds
 */
export async function getFeedsByShop(shopDomain) {
  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }

  return FeedModel.findAll({ shopDomain });
}


/**
 * Get feed by ID with shop validation
 * @param {string} feedId - Feed ID
 * @param {string} shopDomain - Shop domain for security
 * @returns {Promise<Object>} Feed object
 * @throws {Error} If feed not found or doesn't belong to shop
 */
export async function getFeedById(feedId, shopDomain) {
  if (!feedId) {
    throw new Error('Feed ID is required');
  }

  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }

  const feed = await FeedModel.findById(feedId, shopDomain);

  if (!feed) {
    throw new Error('Feed not found');
  }

  return feed;
}

export async function getFeedsWithPaginationAndFilters(shopDomain, filters = {}) {
  return FeedModel.getFeedsWithPaginationAndFilters(shopDomain, filters);
}

/**
 * Create a new feed with videos
 * @param {Object} data - Feed data
 * @param {string} data.feedName - Feed name
 * @param {string} data.shopDomain - Shop domain
 * @param {string} data.widgetType - Widget type (carousel|grid)
 * @param {boolean} data.isEnabled - Whether feed is enabled
 * @param {Array} data.videos - Array of video objects with id, playbackId, position
 * @param {Object} [data.settings] - Structured settings: { general: {}, design: {}, translation: {} }
 * @returns {Promise<Object>} Created feed
 */
export async function createFeed(data) {
  const { feedName, shopDomain, widgetType, widgetPage, customPagePath, isEnabled, settings, videos = [] } = data;

  if (!feedName || feedName.trim().length < 3) {
    throw new Error('Feed name must be at least 3 characters');
  }

  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }

  // Resolve every payload video to a real Video.id BEFORE building the nested
  // create. The upload flow hands the client a MUX UPLOAD id (not a Video id),
  // so connecting by the raw value made every new-feed-with-a-fresh-upload save
  // fail. resolveVideoId accepts a Video id, playbackId, assetId or upload id —
  // the same resolution updateFeed already relies on.
  const resolvedVideos = [];
  for (let i = 0; i < videos.length; i++) {
    const entry = videos[i];
    const videoId = await resolveVideoId(entry);
    if (!videoId) {
      // Don't silently drop the merchant's video — tell them which one.
      throw new Error(
        `"${entry.fileName || 'A video'}" is still processing. Wait a few seconds, then save again.`,
      );
    }
    await applyFileName(videoId, entry);
    resolvedVideos.push({
      video: { connect: { id: videoId } },
      shop: { connect: { shopDomain } },
      playbackId: entry.playbackId,
      position: entry.position ?? i,
      productsTagged: entry.productsTagged || [],
    });
  }

  const feedData = {
    feedName: feedName.trim(),
    shop: { connect: { shopDomain } },
    widgetType: widgetType || 'carousel',
    widgetPage: widgetPage || 'homePage',
    customPagePath: widgetPage === 'custom' ? (customPagePath || null) : null,
    isEnabled: isEnabled !== false,
    settings: settings || undefined,
    videos: { create: resolvedVideos },
  };

  return FeedModel.create(feedData);
}

/**
 * Update feed
 * @param {string} feedId - Feed ID
 * @param {Object} data - Update data
 * @param {string} shopDomain - Owning shop (required; enforces tenant isolation)
 * @returns {Promise<Object>} Updated feed
 * @throws {Error} If feed not found or does not belong to shopDomain
 */
export async function updateFeed(feedId, data, shopDomain) {
  if (!feedId) {
    throw new Error('Feed ID is required');
  }
  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }

  // Ownership guard: throws "Feed not found" if the feed is not owned by this shop.
  // Prevents cross-tenant feed takeover regardless of the calling route.
  await getFeedById(feedId, shopDomain);

  const { feedName, widgetType, widgetPage, customPagePath, isEnabled, settings, videos } = data;

  const updateData = {};

  if (feedName !== undefined) {
    if (!feedName || feedName.trim().length < 3) {
      throw new Error('Feed name must be at least 3 characters');
    }
    updateData.feedName = feedName.trim();
  }

  if (widgetType !== undefined) {
    updateData.widgetType = widgetType;
  }

  if (widgetPage !== undefined) {
    updateData.widgetPage = widgetPage;
    updateData.customPagePath = widgetPage === 'custom' ? (customPagePath || null) : null;
  }

  if (isEnabled !== undefined) {
    updateData.isEnabled = isEnabled;
  }

  if (settings !== undefined) {
    updateData.settings = settings || null;
  }

  // Resolve and validate EVERY video before touching the feed, exactly as
  // createFeed does. Updating first and throwing afterwards left the feed's
  // scalars committed while the UI reported a failed save.
  const hasVideos = videos && Array.isArray(videos) && videos.length > 0;
  const resolvedVideos = [];
  if (hasVideos) {
    for (let i = 0; i < videos.length; i++) {
      const videoEntry = videos[i];
      const videoId = await resolveVideoId(videoEntry);
      // Mirror createFeed: skipping silently here meant syncFeedVideos never saw
      // the video, so a just-uploaded clip vanished behind a "saved" toast.
      if (!videoId || !videoEntry.playbackId) {
        throw new Error(
          `"${videoEntry.fileName || 'A video'}" is still processing. Wait a few seconds, then save again.`,
        );
      }
      resolvedVideos.push({
        videoId,
        entry: videoEntry,
        playbackId: videoEntry.playbackId,
        position: videoEntry.position ?? i,
        productsTagged: videoEntry.productsTagged ?? [],
      });
    }
  }

  const result = await FeedModel.updateById(feedId, updateData);

  if (hasVideos) {
    const feedForSync = await FeedModel.findById(feedId);
    for (const v of resolvedVideos) await applyFileName(v.videoId, v.entry);
    await syncFeedVideos(
      feedId,
      resolvedVideos.map(({ videoId, playbackId, position, productsTagged }) => ({
        videoId,
        playbackId,
        position,
        productsTagged,
      })),
      feedForSync?.shopDomain,
    );
  }

  return result;
}

/**
 * Delete feed by ID with shop validation
 * @param {string} feedId - Feed ID
 * @param {string} shopDomain - Shop domain for security
 * @returns {Promise<Object>} Deleted feed
 */
export async function deleteFeed(feedId, shopDomain) {
  if (!feedId) {
    throw new Error('Feed ID is required');
  }
  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }
  await getFeedById(feedId, shopDomain);
  return FeedModel.deleteById(feedId);
}
