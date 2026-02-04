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
 * @param {Object} increments - { impressions?, views?, clicks?, purchases?, sales? }
 * @returns {Promise<Object>}
 */
export async function upsertIncrement(feedId, date, increments) {
  const dateOnly = toDateOnly(date);
  const existing = await prisma.feedAnalytics.findUnique({
    where: {
      feedId_date: { feedId, date: dateOnly },
    },
  });

  const data = {
    impressions: (existing?.impressions ?? 0) + (increments.impressions ?? 0),
    views: (existing?.views ?? 0) + (increments.views ?? 0),
    clicks: (existing?.clicks ?? 0) + (increments.clicks ?? 0),
    purchases: (existing?.purchases ?? 0) + (increments.purchases ?? 0),
    sales: (existing?.sales != null ? Number(existing.sales) : 0) + (increments.sales ?? 0),
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
