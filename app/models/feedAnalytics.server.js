/**
 * FeedAnalytics Model - Data Access Layer
 *
 * Daily snapshot of feed-level metrics. One row per feed per day.
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
  const existing = await prisma.feedAnalytics.findUnique({
    where: {
      feedId_date: { feedId, date: dateOnly },
    },
  });

  const add = (a, b) => (a ?? 0) + (b ?? 0);

  const data = {
    // New widget-level fields
    widgetImpressions: add(existing?.widgetImpressions, increments.widgetImpressions),
    widgetClicks: add(existing?.widgetClicks, increments.widgetClicks),
    widgetVideoPlays: add(existing?.widgetVideoPlays, increments.widgetVideoPlays),
    widgetViews: add(existing?.widgetViews, increments.widgetViews),
    widgetProductClicks: add(existing?.widgetProductClicks, increments.widgetProductClicks),
    widgetAddToCart: add(existing?.widgetAddToCart, increments.widgetAddToCart),
    widgetOrders: add(existing?.widgetOrders, increments.widgetOrders),
    widgetRevenue: (existing?.widgetRevenue != null ? Number(existing.widgetRevenue) : 0) + (increments.widgetRevenue ?? 0),
  };

  return prisma.feedAnalytics.upsert({
    where: {
      feedId_date: { feedId, date: dateOnly },
    },
    create: {
      feedId,
      date: dateOnly,
      ...data,
    },
    update: data,
  });
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
