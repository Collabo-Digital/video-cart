/**
 * Feed Service
 *
 * Handles feed business logic and workflows. Server-only (uses models).
 */

import * as FeedModel from '../../models/feed.server';
import { updateVideosProductsTagged as updateFeedVideosProductsTagged } from '../../models/feed.server';

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
 * @returns {Promise<Object>} Created feed
 */
export async function createFeed(data) {
  const { feedName, shopDomain, widgetType, isEnabled, settings, videos = [] } = data;

  if (!feedName || feedName.trim().length < 3) {
    throw new Error('Feed name must be at least 3 characters');
  }

  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }

  const feedData = {
    feedName: feedName.trim(),
    shopDomain,
    widgetType: widgetType || 'carousel',
    isEnabled: isEnabled !== false,
    settings: settings || undefined,
    videos: {
      create: videos.map((video, index) => ({
        videoId: video.videoId ?? video.id,
        playbackId: video.playbackId,
        position: video.position ?? index,
        productsTagged: video.productsTagged || [],
      })),
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

  const { feedName, widgetType, isEnabled, settings, videos } = data;

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

  if (isEnabled !== undefined) {
    updateData.isEnabled = isEnabled;
  }

  if (settings !== undefined) {
    updateData.settings = settings || null;
  }

  const result = await FeedModel.updateById(feedId, updateData);

  if (videos && Array.isArray(videos) && videos.length > 0) {
    await updateFeedVideosProductsTagged(feedId, videos);
  }

  return result;
}
