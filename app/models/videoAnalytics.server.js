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
 * @param {Object} updates
 *  - videoImpressions?, videoViews?, videoProductClicks?, videoAtcClicks?, videoAddToCart?, videoOrders?, videoRevenue?
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

  const data = {
    // New fields (per requirements)
    videoImpressions: add(existing?.videoImpressions, updates.videoImpressions),
    videoViews: add(existing?.videoViews, updates.videoViews),
    videoProductClicks: add(existing?.videoProductClicks, updates.videoProductClicks),
    videoAtcClicks: add(existing?.videoAtcClicks, updates.videoAtcClicks),
    videoAddToCart: add(existing?.videoAddToCart, updates.videoAddToCart),
    videoOrders: add(existing?.videoOrders, updates.videoOrders),
    videoRevenue: (existing?.videoRevenue != null ? Number(existing.videoRevenue) : 0) + (updates.videoRevenue ?? 0),
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

/**
 * Get aggregated video-level analytics for a shop (all feeds) in a date range.
 * @param {string} shopDomain
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<{ videoImpressions, videoViews, videoProductClicks, videoAtcClicks, videoAddToCart, videoOrders, videoRevenue }>}
 */
export async function getAggregatedByShop(shopDomain, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const rows = await prisma.videoAnalytics.findMany({
    where: {
      feed: { shopDomain, isDeleted: false },
      date: { gte: start, lte: end },
    },
  });
  const out = {
    videoImpressions: 0,
    videoViews: 0,
    videoProductClicks: 0,
    videoAtcClicks: 0,
    videoAddToCart: 0,
    videoOrders: 0,
    videoRevenue: 0,
  };
  for (const row of rows) {
    out.videoImpressions += row.videoImpressions ?? 0;
    out.videoViews += row.videoViews ?? 0;
    out.videoProductClicks += row.videoProductClicks ?? 0;
    out.videoAtcClicks += row.videoAtcClicks ?? 0;
    out.videoAddToCart += row.videoAddToCart ?? 0;
    out.videoOrders += row.videoOrders ?? 0;
    out.videoRevenue += (row.videoRevenue ?? 0);
  }
  return out;
}

/**
 * Get daily video-level totals for a shop (for charts). One entry per day.
 * @param {string} shopDomain
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<Array<{ date: string, videoImpressions, videoViews, videoAddToCart, videoOrders, videoRevenue }>>}
 */
export async function getDailyByShop(shopDomain, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const rows = await prisma.videoAnalytics.findMany({
    where: {
      feed: { shopDomain, isDeleted: false },
      date: { gte: start, lte: end },
    },
    orderBy: { date: 'asc' },
  });
  const byDate = new Map();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const cur = byDate.get(key) ?? {
      date: key,
      videoImpressions: 0,
      videoViews: 0,
      videoAddToCart: 0,
      videoOrders: 0,
      videoRevenue: 0,
    };
    cur.videoImpressions += row.videoImpressions ?? 0;
    cur.videoViews += row.videoViews ?? 0;
    cur.videoAddToCart += row.videoAddToCart ?? 0;
    cur.videoOrders += row.videoOrders ?? 0;
    cur.videoRevenue += (row.videoRevenue ?? 0);
    byDate.set(key, cur);
  }
  return Array.from(byDate.entries())
    .map(([, v]) => v)
    .sort((a, b) => a.date.localeCompare(b.date));
}
