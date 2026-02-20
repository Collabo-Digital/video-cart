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
  const { feedName, shopDomain, widgetType, widgetPage, isEnabled, settings, videos = [] } = data;

  if (!feedName || feedName.trim().length < 3) {
    throw new Error('Feed name must be at least 3 characters');
  }

  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }

  const feedData = {
    feedName: feedName.trim(),
    shop: { connect: { shopDomain } },
    widgetType: widgetType || 'carousel',
    widgetPage: widgetPage || 'homePage',
    isEnabled: isEnabled !== false,
    settings: settings || undefined,
    videos: {
      create: videos.map((video, index) => {
        const videoId = video.videoId ?? video.id;
        return {
          video: { connect: { id: videoId } },
          shop: { connect: { shopDomain } },
          playbackId: video.playbackId,
          position: video.position ?? index,
          productsTagged: video.productsTagged || [],
        };
      }),
    },
  };

  return FeedModel.create(feedData);
}

/**
 * Update feed
 * @param {string} feedId - Feed ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated feed
 */
export async function updateFeed(feedId, data) {
  if (!feedId) {
    throw new Error('Feed ID is required');
  }

  const { feedName, widgetType, widgetPage, isEnabled, settings, videos } = data;

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
  }

  if (isEnabled !== undefined) {
    updateData.isEnabled = isEnabled;
  }

  if (settings !== undefined) {
    updateData.settings = settings || null;
  }

  const result = await FeedModel.updateById(feedId, updateData);

  let feedForSync = null;
  if (videos && Array.isArray(videos) && videos.length > 0) {
    feedForSync = await FeedModel.findById(feedId);
    const resolvedVideos = [];
    for (let i = 0; i < videos.length; i++) {
      const videoEntry = videos[i];
      const videoId = await resolveVideoId(videoEntry);
      if (videoId && videoEntry.playbackId) {
        if (videoEntry.fileName != null && typeof videoEntry.fileName === 'string' && videoEntry.fileName.trim()) {
          await VideoModel.updateById(videoId, { fileName: videoEntry.fileName.trim() });
        }
        resolvedVideos.push({
          videoId,
          playbackId: videoEntry.playbackId,
          position: videoEntry.position ?? i,
          productsTagged: videoEntry.productsTagged ?? [],
        });
      }
    }
    await syncFeedVideos(feedId, resolvedVideos, feedForSync?.shopDomain);
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
