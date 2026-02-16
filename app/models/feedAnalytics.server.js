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
