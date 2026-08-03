/**
 * VideoAnalytics Model - Data Access Layer
 *
 * Daily snapshot of video-in-feed metrics. One row per (videoId, feedId) per day.
 */

import prisma from '../config/database.server';

const VIDEOS_PAGE_SIZE = 10;
const MIN_TAKE = 1;
const MAX_TAKE = 100;
const VIDEO_ORDER_DESC = [{ videoRevenue: 'desc' }, { id: 'asc' }];
const VIDEO_ORDER_ASC = [{ videoRevenue: 'asc' }, { id: 'desc' }];

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
      isDeleted: false,
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
      isDeleted: false,
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

  // Atomic increment ops (MongoDB $inc) — concurrency-safe, no lost updates.
  const incOps = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value != null) incOps[key] = { increment: value };
  }

  // Fast path: today's row exists → atomically add to it.
  try {
    return await prisma.videoAnalytics.update({
      where: { videoId_feedId_date: { videoId, feedId, date: dateOnly } },
      data: incOps,
    });
  } catch (error) {
    if (error.code !== "P2025") throw error; // P2025 = row doesn't exist yet
  }

  // First event of the day → resolve shopDomain + confirm the video exists, then create.
  const [feed, video] = await Promise.all([
    prisma.feed.findUnique({ where: { id: feedId }, select: { shopDomain: true } }),
    prisma.video.findUnique({ where: { id: videoId }, select: { id: true } }),
  ]);
  if (!feed) throw new Error(`Feed not found: ${feedId}`);
  let resolvedVideoId = videoId;
  if (!video) {
    // Fallback: caller may have passed a FeedVideo id instead of a Video id.
    const feedVideo = await prisma.feedVideo.findUnique({
      where: { id: videoId },
      select: { videoId: true },
    });
    if (!feedVideo) throw new Error(`Video not found: ${videoId}`);
    resolvedVideoId = feedVideo.videoId;
  }

  try {
    return await prisma.videoAnalytics.create({
      data: {
        video: { connect: { id: resolvedVideoId } },
        feed: { connect: { id: feedId } },
        shop: { connect: { shopDomain: feed.shopDomain } },
        date: dateOnly,
        ...updates,
      },
    });
  } catch (error) {
    // Lost the create race — the unique index rejects us with P2002; add to the
    // row that now exists.
    if (error.code === "P2002") {
      return prisma.videoAnalytics.update({
        where: { videoId_feedId_date: { videoId: resolvedVideoId, feedId, date: dateOnly } },
        data: incOps,
      });
    }
    throw error;
  }
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
      isDeleted: false,
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


/**
 * Get list of videos with analytics for a shop (cursor-based, previous + next).
 * @param {string} shopDomain
 * @param {Object} options - { cursor?, direction: 'next'|'prev', take? }
 * @returns {Promise<{ items: Array, nextCursor: string | null, previousCursor: string | null }>}
 */
export async function getListofVideosWithAnalytics(shopDomain, options = {}) {
  const { cursor, direction = 'next', take = VIDEOS_PAGE_SIZE, startDate, endDate } = options;
  // `take` arrives from a JSON body, so it can be a string ("5" + 1 === "51") or
  // an absurd number. Coerce and clamp — same pattern as video.server.js.
  const safeTake = Math.min(MAX_TAKE, Math.max(MIN_TAKE, Number(take) || VIDEOS_PAGE_SIZE));

  const where = { shopDomain, isDeleted: false };
  if (startDate != null && endDate != null) {
    where.date = { gte: toDateOnly(startDate), lte: toDateOnly(endDate) };
  }

  const include = {
    video: {
      select: {
        id: true,
        title: true,
        videoPlaybackId: true,
      },
    },
  };

  if (!cursor) {
    const videosWithAnalyticsItems = await prisma.videoAnalytics.findMany({
      where,
      orderBy: VIDEO_ORDER_DESC,
      take: safeTake + 1,
      include,
    });
    const hasMore = videosWithAnalyticsItems.length > safeTake;
    const videosWithAnalytics = hasMore ? videosWithAnalyticsItems.slice(0, safeTake) : videosWithAnalyticsItems;

    return {
      videosWithAnalytics,
      nextCursor: hasMore ? videosWithAnalytics[videosWithAnalytics.length - 1].id : null,
      previousCursor: null,
    };
  }

  if (direction === 'next') {
    const videosWithAnalyticsItems = await prisma.videoAnalytics.findMany({
      where,
      orderBy: VIDEO_ORDER_DESC,
      cursor: { id: cursor },
      skip: 1,
      take: safeTake + 1,
      include,
    });
    const hasMore = videosWithAnalyticsItems.length > safeTake;
    const videosWithAnalytics = hasMore ? videosWithAnalyticsItems.slice(0, safeTake) : videosWithAnalyticsItems;

    return {
      videosWithAnalytics,
      nextCursor: hasMore ? videosWithAnalytics[videosWithAnalytics.length - 1].id : null,
      previousCursor: cursor,
    };
  }

  const videosWithAnalyticsItems = await prisma.videoAnalytics.findMany({
    where,
    orderBy: VIDEO_ORDER_ASC,
    cursor: { id: cursor },
    skip: 1,
    take: safeTake + 1,
    include,
  });
  const hasMore = videosWithAnalyticsItems.length > safeTake;
  const videosWithAnalytics = hasMore ? videosWithAnalyticsItems.slice(0, safeTake) : videosWithAnalyticsItems;
  videosWithAnalytics.reverse();

  return {
    videosWithAnalytics,
    nextCursor: cursor,
    previousCursor: hasMore ? videosWithAnalytics[0].id : null,
  };
}