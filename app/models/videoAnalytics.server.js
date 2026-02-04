/**
 * VideoAnalytics Model - Data Access Layer
 *
 * Daily snapshot of video-in-feed metrics. One row per (videoId, feedId) per day.
 */

import prisma from '../config/database.server';

/**
 * Normalize to UTC start-of-day for date bucketing
 * @param {Date} d
 * @returns {Date}
 */
function toDateOnly(d) {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Find video analytics for a feed in a date range
 * @param {string} feedId
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<Array>}
 */
export async function findByFeedAndDateRange(feedId, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  return prisma.videoAnalytics.findMany({
    where: {
      feedId,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: 'asc' }, { videoId: 'asc' }],
  });
}

/**
 * Find analytics for a single video (across all feeds) in a date range
 * @param {string} videoId
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<Array>}
 */
export async function findByVideoAndDateRange(videoId, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  return prisma.videoAnalytics.findMany({
    where: {
      videoId,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: 'asc' }],
  });
}

/**
 * Upsert and increment video analytics for a given day
 * @param {string} videoId
 * @param {string} feedId
 * @param {Date} date
 * @param {Object} updates - { impressions?, views?, clicks?, purchases?, sales?, totalWatchTime? }
 * @returns {Promise<Object>}
 */
export async function upsertIncrement(videoId, feedId, date, updates) {
  const dateOnly = toDateOnly(date);
  const existing = await prisma.videoAnalytics.findUnique({
    where: {
      videoId_feedId_date: { videoId, feedId, date: dateOnly },
    },
  });

  const add = (a, b) => (a ?? 0) + (b ?? 0);
  const impressions = add(existing?.impressions, updates.impressions);
  const views = add(existing?.views, updates.views);
  const totalWatchTime = add(existing?.totalWatchTime, updates.totalWatchTime);
  const avgWatchTime = views > 0 ? totalWatchTime / views : null;

  const data = {
    impressions,
    views,
    clicks: add(existing?.clicks, updates.clicks),
    purchases: add(existing?.purchases, updates.purchases),
    sales: (existing?.sales != null ? Number(existing.sales) : 0) + (updates.sales ?? 0),
    totalWatchTime,
    avgWatchTime,
  };

  return prisma.videoAnalytics.upsert({
    where: {
      videoId_feedId_date: { videoId, feedId, date: dateOnly },
    },
    create: {
      videoId,
      feedId,
      date: dateOnly,
      ...data,
    },
    update: data,
  });
}
