/**
 * FeedAnalytics Model - Data Access Layer
 *
 * Daily snapshot of feed-level metrics. One row per feed per day.
 */

import prisma from '../config/database.server';

const FEEDS_PAGE_SIZE = 10;
const ORDER_DESC = [{ widgetRevenue: 'desc' }, { id: 'asc' }];
const ORDER_ASC = [{ widgetRevenue: 'asc' }, { id: 'desc' }];

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
 * Find feed analytics for a date range
 * @param {string} feedId
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<Array>}
 */
export async function findByFeedAndDateRange(feedId, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  return prisma.feedAnalytics.findMany({
    where: {
      feedId,
      isDeleted: false,
      date: { gte: start, lte: end },
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * Upsert and increment feed analytics for a given day
 * @param {string} feedId
 * @param {Date} date
 * @param {Object} increments
 *  - widgetImpressions?, widgetClicks?, widgetVideoPlays?, widgetViews?, widgetProductClicks?,
 *    widgetAddToCart?, widgetOrders?, widgetRevenue?
 * @returns {Promise<Object>}
 */
export async function upsertIncrement(feedId, date, increments) {
  const dateOnly = toDateOnly(date);

  // Atomic increment ops: { field: { increment: n } } → MongoDB $inc, which is
  // safe when many events land at once (no read-modify-write, so nothing is lost).
  const incOps = {};
  for (const [key, value] of Object.entries(increments)) {
    if (value != null) incOps[key] = { increment: value };
  }

  // Fast path: today's row already exists → atomically add to it (a single op).
  try {
    return await prisma.feedAnalytics.update({
      where: { feedId_date: { feedId, date: dateOnly } },
      data: incOps,
    });
  } catch (error) {
    if (error.code !== "P2025") throw error; // P2025 = row doesn't exist yet
  }

  // First event of the day → create the row.
  const feed = await prisma.feed.findUnique({
    where: { id: feedId },
    select: { shopDomain: true },
  });
  if (!feed) throw new Error(`Feed not found: ${feedId}`);

  try {
    return await prisma.feedAnalytics.create({
      data: {
        feed: { connect: { id: feedId } },
        shop: { connect: { shopDomain: feed.shopDomain } },
        date: dateOnly,
        ...increments,
      },
    });
  } catch (error) {
    // A concurrent request created the row a split-second earlier — the unique
    // index rejects us with P2002; just add to the row that now exists.
    if (error.code === "P2002") {
      return prisma.feedAnalytics.update({
        where: { feedId_date: { feedId, date: dateOnly } },
        data: incOps,
      });
    }
    throw error;
  }
}

/**
 * Get aggregated widget-level analytics for a shop (all feeds) in a date range.
 * @param {string} shopDomain
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<{ widgetImpressions, widgetClicks, widgetVideoPlays, widgetViews, widgetProductClicks, widgetAddToCart, widgetOrders, widgetRevenue }>}
 */
export async function getAggregatedByShop(shopDomain, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const rows = await prisma.feedAnalytics.findMany({
    where: {
      feed: { shopDomain, isDeleted: false },
      isDeleted: false,
      date: { gte: start, lte: end },
    },
  });
  const out = {
    widgetImpressions: 0,
    widgetClicks: 0,
    widgetVideoPlays: 0,
    widgetViews: 0,
    widgetProductClicks: 0,
    widgetAddToCart: 0,
    widgetOrders: 0,
    widgetRevenue: 0,
  };
  for (const row of rows) {
    out.widgetImpressions += row.widgetImpressions ?? 0;
    out.widgetClicks += row.widgetClicks ?? 0;
    out.widgetVideoPlays += row.widgetVideoPlays ?? 0;
    out.widgetViews += row.widgetViews ?? 0;
    out.widgetProductClicks += row.widgetProductClicks ?? 0;
    out.widgetAddToCart += row.widgetAddToCart ?? 0;
    out.widgetOrders += row.widgetOrders ?? 0;
    out.widgetRevenue += (row.widgetRevenue ?? 0);
  }
  return out;
}

/**
 * Get daily widget-level totals for a shop (for charts). One entry per day.
 * @param {string} shopDomain
 * @param {Object} options - { startDate: Date, endDate: Date }
 * @returns {Promise<Array<{ date: string, widgetImpressions, widgetViews, widgetAddToCart, widgetOrders, widgetRevenue }>>}
 */
export async function getDailyByShop(shopDomain, { startDate, endDate }) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  const rows = await prisma.feedAnalytics.findMany({
    where: {
      feed: { shopDomain, isDeleted: false },
      isDeleted: false,
      date: { gte: start, lte: end },
    },
    orderBy: { date: 'asc' },
  });
  const byDate = new Map();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const cur = byDate.get(key) ?? {
      date: key,
      widgetImpressions: 0,
      widgetViews: 0,
      widgetAddToCart: 0,
      widgetOrders: 0,
      widgetRevenue: 0,
    };
    cur.widgetImpressions += row.widgetImpressions ?? 0;
    cur.widgetViews += row.widgetViews ?? 0;
    cur.widgetAddToCart += row.widgetAddToCart ?? 0;
    cur.widgetOrders += row.widgetOrders ?? 0;
    cur.widgetRevenue += (row.widgetRevenue ?? 0);
    byDate.set(key, cur);
  }
  return Array.from(byDate.entries())
    .map(([, v]) => v)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get list of feeds with analytics for a shop
 * @param {string} shopDomain
 * @param {Object} filters - { widgetRevenue: number }
 * @param {string} orderBy - 'desc' or 'asc'
 * @returns {Promise<Array>}
 */
export async function getListofFeedsWithAnalytics(shopDomain, options = {}) {
  const { cursor, direction = 'next', take = FEEDS_PAGE_SIZE, startDate, endDate } = options;

  const where = { shopDomain, isDeleted: false };
  if (startDate != null && endDate != null) {
    where.date = { gte: toDateOnly(startDate), lte: toDateOnly(endDate) };
  }

  const include = {
    feed: {
      select: {
        id: true,
        feedName: true,
        widgetId: true,
        widgetType: true,
        isEnabled: true,
        shopDomain: true,
      },
    },
  };

  if (!cursor) {
    const feedsWithAnalyticsItems = await prisma.feedAnalytics.findMany({
      where,
      orderBy: ORDER_DESC,
      take: take + 1,
      include,
    });
    const hasMore = feedsWithAnalyticsItems.length > take;
    const feedsWithAnalytics = hasMore ? feedsWithAnalyticsItems.slice(0, take) : feedsWithAnalyticsItems;
    return {
      feedsWithAnalytics,
      nextCursor: hasMore ? feedsWithAnalytics[feedsWithAnalytics.length - 1].id : null,
      previousCursor: null,
    };
  }

  if (direction === 'next') {
    const feedsWithAnalyticsItems = await prisma.feedAnalytics.findMany({
      where,
      orderBy: ORDER_DESC,
      cursor: { id: cursor },
      skip: 1,
      take: take + 1,
      include,
    });
    const hasMore = feedsWithAnalyticsItems.length > take;
    const feedsWithAnalytics = hasMore ? feedsWithAnalyticsItems.slice(0, take) : feedsWithAnalyticsItems;
    return {
      feedsWithAnalytics,
      nextCursor: hasMore ? feedsWithAnalytics[feedsWithAnalytics.length - 1].id : null,
      previousCursor: cursor,
    };
  }

  const feedsWithAnalyticsItems = await prisma.feedAnalytics.findMany({
    where,
    orderBy: ORDER_ASC,
    cursor: { id: cursor },
    skip: 1,
    take: take + 1,
    include,
  });
  const hasMore = feedsWithAnalyticsItems.length > take;
  const feedsWithAnalytics = hasMore ? feedsWithAnalyticsItems.slice(0, take) : feedsWithAnalyticsItems;
  feedsWithAnalytics.reverse();

  return {
    feedsWithAnalytics,
    nextCursor: cursor,
    previousCursor: hasMore ? feedsWithAnalytics[0].id : null,
  };
}