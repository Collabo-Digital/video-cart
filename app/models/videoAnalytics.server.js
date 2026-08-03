/**
 * VideoAnalytics Model - Data Access Layer
 *
 * Daily snapshot of video-in-feed metrics. One row per (videoId, feedId) per day.
 */

import prisma from '../config/database.server';

const VIDEOS_PAGE_SIZE = 10;
const MIN_TAKE = 1;
const MAX_TAKE = 100;

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

  // Aggregate the daily snapshots per video. Without this the same video appears
  // once per day (per feed), each row showing only that day's revenue — so the
  // table was really "top days across all videos", not "top videos".
  const grouped = await prisma.videoAnalytics.groupBy({
    by: ['videoId'],
    where,
    _sum: {
      videoImpressions: true,
      videoViews: true,
      videoProductClicks: true,
      videoAtcClicks: true,
      videoAddToCart: true,
      videoOrders: true,
      videoRevenue: true,
    },
  });

  if (!grouped.length) {
    return { videosWithAnalytics: [], nextCursor: null, previousCursor: null };
  }

  // Highest total revenue first; tie-break on videoId so the order is stable.
  const sorted = grouped
    .map((g) => ({
      videoId: g.videoId,
      videoImpressions: g._sum.videoImpressions ?? 0,
      videoViews: g._sum.videoViews ?? 0,
      videoProductClicks: g._sum.videoProductClicks ?? 0,
      videoAtcClicks: g._sum.videoAtcClicks ?? 0,
      videoAddToCart: g._sum.videoAddToCart ?? 0,
      videoOrders: g._sum.videoOrders ?? 0,
      videoRevenue: g._sum.videoRevenue ?? 0,
    }))
    .sort((a, b) => (b.videoRevenue - a.videoRevenue) || a.videoId.localeCompare(b.videoId));

  // Cursor is now a videoId (previously an analytics-row id).
  let start = 0;
  if (cursor) {
    const idx = sorted.findIndex((r) => r.videoId === cursor);
    if (idx !== -1) {
      start = direction === 'next' ? idx + 1 : Math.max(0, idx - safeTake);
    }
  }
  const page = sorted.slice(start, start + safeTake);

  const videos = await prisma.video.findMany({
    where: { id: { in: page.map((r) => r.videoId) } },
    select: {
      id: true,
      title: true,
      videoPlaybackId: true,
    },
  });
  const videoById = new Map(videos.map((v) => [v.id, v]));

  const videosWithAnalytics = page.map((r) => ({
    id: r.videoId,
    ...r,
    video: videoById.get(r.videoId) ?? null,
  }));

  return {
    videosWithAnalytics,
    nextCursor: start + safeTake < sorted.length ? page[page.length - 1]?.videoId ?? null : null,
    previousCursor: start > 0 ? page[0]?.videoId ?? null : null,
  };
}