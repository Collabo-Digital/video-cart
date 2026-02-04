/**
 * Analytics Service
 *
 * Records events and returns aggregated feed/video analytics from daily snapshots.
 */

import * as FeedAnalyticsModel from '../../models/feedAnalytics.server';
import * as VideoAnalyticsModel from '../../models/videoAnalytics.server';
import * as VideoModel from '../../models/video.server';

export const EVENT_TYPES = {
  IMPRESSION: 'impression',
  VIEW: 'view',
  CLICK: 'click',
  PURCHASE: 'purchase',
};

/**
 * Record an analytics event: increment feed (and optionally video) snapshot for today.
 * @param {Object} params
 * @param {string} params.feedId
 * @param {string} [params.videoId]
 * @param {string} params.eventType - impression | view | click | purchase
 * @param {number} [params.watchTimeSeconds] - for view events
 * @param {number} [params.salesAmount] - for purchase events
 */
export async function recordEvent({ feedId, videoId, eventType, watchTimeSeconds = 0, salesAmount = 0 }) {
  if (!feedId) throw new Error('feedId is required');
  const now = new Date();

  const feedIncrements = {};
  const videoUpdates = {};

  switch (eventType) {
    case EVENT_TYPES.IMPRESSION:
      feedIncrements.impressions = 1;
      if (videoId) videoUpdates.impressions = 1;
      break;
    case EVENT_TYPES.VIEW:
      feedIncrements.views = 1;
      if (videoId) {
        videoUpdates.views = 1;
        videoUpdates.totalWatchTime = Number(watchTimeSeconds) || 0;
      }
      break;
    case EVENT_TYPES.CLICK:
      feedIncrements.clicks = 1;
      if (videoId) videoUpdates.clicks = 1;
      break;
    case EVENT_TYPES.PURCHASE:
      feedIncrements.purchases = 1;
      feedIncrements.sales = Number(salesAmount) || 0;
      if (videoId) {
        videoUpdates.purchases = 1;
        videoUpdates.sales = Number(salesAmount) || 0;
      }
      break;
    default:
      throw new Error(`Unknown eventType: ${eventType}`);
  }

  await FeedAnalyticsModel.upsertIncrement(feedId, now, feedIncrements);
  if (videoId && Object.keys(videoUpdates).length > 0) {
    await VideoAnalyticsModel.upsertIncrement(videoId, feedId, now, videoUpdates);
  }
}

/**
 * Get aggregated feed analytics and per-video breakdown for a date range.
 * @param {string} feedId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{ feed: { impressions, views, clicks, purchases, sales }, videos: Array }>}
 */
export async function getFeedAnalytics(feedId, startDate, endDate) {
  const [feedRows, videoRows] = await Promise.all([
    FeedAnalyticsModel.findByFeedAndDateRange(feedId, { startDate, endDate }),
    VideoAnalyticsModel.findByFeedAndDateRange(feedId, { startDate, endDate }),
  ]);

  const feed = {
    impressions: 0,
    views: 0,
    clicks: 0,
    purchases: 0,
    sales: 0,
  };
  for (const row of feedRows) {
    feed.impressions += row.impressions ?? 0;
    feed.views += row.views ?? 0;
    feed.clicks += row.clicks ?? 0;
    feed.purchases += row.purchases ?? 0;
    feed.sales += Number(row.sales ?? 0);
  }

  const uniqueVideoIds = [...new Set(videoRows.map((r) => r.videoId).filter(Boolean))];
  const videoTitles = new Map();
  if (uniqueVideoIds.length > 0) {
    const videos = await VideoModel.findManyByIds(uniqueVideoIds);
    for (const v of videos) {
      if (v?.id) videoTitles.set(v.id, v.title ?? null);
    }
  }

  const byVideo = new Map();
  for (const row of videoRows) {
    const vid = row.videoId;
    if (!byVideo.has(vid)) {
      byVideo.set(vid, {
        videoId: vid,
        title: videoTitles.get(vid) ?? null,
        impressions: 0,
        views: 0,
        clicks: 0,
        purchases: 0,
        sales: 0,
        totalWatchTime: 0,
        avgWatchTime: null,
      });
    }
    const v = byVideo.get(vid);
    v.impressions += row.impressions ?? 0;
    v.views += row.views ?? 0;
    v.clicks += row.clicks ?? 0;
    v.purchases += row.purchases ?? 0;
    v.sales += Number(row.sales ?? 0);
    v.totalWatchTime += row.totalWatchTime ?? 0;
    if (row.avgWatchTime != null) {
      v.avgWatchTime = v.views > 0 ? v.totalWatchTime / v.views : null;
    }
  }
  const videos = Array.from(byVideo.values()).map((v) => ({
    ...v,
    avgWatchTime: v.views > 0 ? v.totalWatchTime / v.views : null,
  }));

  return { feed, videos };
}

/**
 * Get aggregated analytics for a single video (across all feeds) in a date range.
 * @param {string} videoId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{ video: { impressions, views, clicks, purchases, sales, totalWatchTime, avgWatchTime } }>}
 */
export async function getVideoAnalytics(videoId, startDate, endDate) {
  const rows = await VideoAnalyticsModel.findByVideoAndDateRange(videoId, { startDate, endDate });

  const video = {
    impressions: 0,
    views: 0,
    clicks: 0,
    purchases: 0,
    sales: 0,
    totalWatchTime: 0,
    avgWatchTime: null,
  };
  for (const row of rows) {
    video.impressions += row.impressions ?? 0;
    video.views += row.views ?? 0;
    video.clicks += row.clicks ?? 0;
    video.purchases += row.purchases ?? 0;
    video.sales += Number(row.sales ?? 0);
    video.totalWatchTime += row.totalWatchTime ?? 0;
  }
  if (video.views > 0) {
    video.avgWatchTime = video.totalWatchTime / video.views;
  }

  return { video };
}
