/**
 * Feed Model - Data Access Layer
 * 
 * Handles all database operations for feeds.
 */

import prisma from '../config/database.server';

/**
 * Find all feeds with optional filtering
 * @param {Object} filters - Optional filters (shopDomain, limit, offset)
 * @returns {Promise<Array>} Array of feed objects
 */
export async function findAll(filters = {}) {
  const { shopDomain, limit = 50, offset = 0, includeDeleted = false } = filters;

  const where = {};
  if (shopDomain) where.shopDomain = shopDomain;
  if (!includeDeleted) where.isDeleted = false;

  return prisma.feed.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: {
      videos: {
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Find feed by ID
 * @param {string} id - Feed ID
 * @param {string} shopDomain - Shop domain for security
 * @returns {Promise<Object|null>} Feed object or null
 */
export async function findById(id, shopDomain = null) {
  const where = { id };
  if (shopDomain) {
    where.shopDomain = shopDomain;
  }
  where.isDeleted = false;

  return prisma.feed.findUnique({
    where,
    include: {
      videos: {
        orderBy: { position: 'asc' },
        include: { video: true },
      },
    },
  });
}

/**
 * Create new feed
 * @param {Object} data - Feed data
 * @returns {Promise<Object>} Created feed object
 */
export async function create(data) {
  return prisma.feed.create({
    data,
    include: {
      videos: true,
    },
  });
}

/**
 * Update feed by ID
 * @param {string} id - Feed ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated feed object
 */
export async function updateById(id, data) {
  return prisma.feed.update({
    where: { id },
    data,
  });
}

/**
 * Update productsTagged for each video in a feed
 * @param {string} feedId - Feed ID
 * @param {Array<{ videoId: string, productsTagged: Array<{ id, title?, handle?, image?, images?, productType?, status?, vendor? }> }>} videos - Videos with productsTagged (JSON array of product objects)
 */
export async function updateVideosProductsTagged(feedId, videos) {
  if (!videos || !Array.isArray(videos)) return;
  for (const entry of videos) {
    await prisma.feedVideo.updateMany({
      where: { feedId, videoId: entry.videoId },
      data: { productsTagged: entry.productsTagged ?? [] },
    });
  }
}

/**
 * Sync feed videos: create or update FeedVideo for each resolved video, remove others.
 * Used when saving feed so new uploads (resolved by playbackId/assetId) appear in the feed.
 * @param {string} feedId - Feed ID
 * @param {Array<{ videoId: string, playbackId: string, position: number, productsTagged: Array }>} resolvedVideos - Resolved videos (videoId = our Video.id)
 * @param {string} shopDomain - Shop domain (required for FeedVideo create)
 */
export async function syncFeedVideos(feedId, resolvedVideos, shopDomain) {
  if (!feedId || !Array.isArray(resolvedVideos) || !shopDomain) return;

  for (let i = 0; i < resolvedVideos.length; i++) {
    const { videoId, playbackId, position, productsTagged } = resolvedVideos[i];
    if (!videoId || !playbackId) continue;

    await prisma.feedVideo.upsert({
      where: {
        feedId_videoId: { feedId, videoId },
      },
      create: {
        feed: { connect: { id: feedId } },
        video: { connect: { id: videoId } },
        shop: { connect: { shopDomain } },
        playbackId,
        position: position ?? i,
        productsTagged: productsTagged ?? [],
      },
      update: {
        playbackId,
        position: position ?? i,
        productsTagged: productsTagged ?? [],
      },
    });
  }

  const keepVideoIds = resolvedVideos.map((entry) => entry.videoId).filter(Boolean);
  if (keepVideoIds.length > 0) {
    await prisma.feedVideo.deleteMany({
      where: {
        feedId,
        videoId: { notIn: keepVideoIds },
      },
    });
  } else {
    await prisma.feedVideo.deleteMany({ where: { feedId } });
  }
}

/**
 * Soft-delete feed by ID and all related analytics/order items (set isDeleted = true).
 * @param {string} id - Feed ID
 * @returns {Promise<Object>} Updated feed object
 */
export async function deleteById(id) {
  return prisma.$transaction(async (tx) => {
    await tx.feedAnalytics.updateMany({
      where: { feedId: id },
      data: { isDeleted: true },
    });
    await tx.videoAnalytics.updateMany({
      where: { feedId: id },
      data: { isDeleted: true },
    });
    await tx.videoCartOrderItem.updateMany({
      where: { feedId: id },
      data: { isDeleted: true },
    });
    return tx.feed.update({
      where: { id },
      data: { isDeleted: true },
    });
  });
}

/**
 * Count feeds for a shop. Takes the shop domain as a string (matches
 * VideoModel.count). Always scoped — never counts across merchants.
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<number>} Count of the shop's non-deleted feeds
 */
export async function count(shopDomain) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required and must be a string');
  }

  return prisma.feed.count({
    where: { shopDomain: shopDomain.trim(), isDeleted: false },
  });
}

/**
 * Find all feed-video records for a video, with feed included.
 * Only returns feeds for the given shop that are not deleted.
 * @param {string} videoId - Video ID
 * @param {string} shopDomain - Shop domain for security
 * @returns {Promise<Array>} Array of FeedVideo with feed included
 */
export async function findFeedVideosByVideoId(videoId, shopDomain) {
  if (!videoId) return [];

  const where = {
    videoId,
    feed: {
      isDeleted: false,
      ...(shopDomain ? { shopDomain } : {}),
    },
  };

  return prisma.feedVideo.findMany({
    where,
    include: {
      feed: {
        select: {
          id: true,
          feedName: true,
          widgetId: true,
          shopDomain: true,
          isEnabled: true,
          isDeleted: true,
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  });
}

/** Default and limits for pagination */
const FEEDS_PAGE_SIZE = 5;
const MIN_TAKE = 1;
const MAX_TAKE = 100;
const ORDER_DESC = [{ createdAt: 'desc' }, { id: 'asc' }];
const ORDER_ASC = [{ createdAt: 'asc' }, { id: 'desc' }];

/**
 * Get feeds with cursor-based pagination and filters
 * @param {string} shopDomain - Shop domain (required)
 * @param {Object} filters - Filters (cursor, direction, take, startDate, endDate, search?)
 * @returns {Promise<{ feeds: Array, nextCursor: string|null, previousCursor: string|null, hasNext: boolean, hasPrevious: boolean }>}
 */
export async function getFeedsWithPaginationAndFilters(shopDomain, filters = {}) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required and must be a string');
  }

  console.log("filters form the core controller ----->", filters);

  const {
    cursor,
    direction = 'next',
    take = FEEDS_PAGE_SIZE,
    startDate,
    endDate,
    search,
    status,
    widgetType,
    sortSelected,
  } = filters;

  const safeTake = Math.min(MAX_TAKE, Math.max(MIN_TAKE, Number(take) || FEEDS_PAGE_SIZE));

  const where = {
    shopDomain: shopDomain.trim(),
    isDeleted: false,
  };

  if (startDate != null || endDate != null) {
    const dateFilter = {};
    if (startDate != null) {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) throw new Error('startDate must be a valid date');
      dateFilter.gte = d;
    }
    if (endDate != null) {
      const d = new Date(endDate);
      if (isNaN(d.getTime())) throw new Error('endDate must be a valid date');
      dateFilter.lte = d;
    }
    if (Object.keys(dateFilter).length) {
      where.createdAt = dateFilter;
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    where.feedName = { contains: search.trim(), mode: 'insensitive' };
  }

  if (status && typeof status[0] === 'string' && status[0].trim()) {
    where.isEnabled = status[0] === 'active';
  }

  if (widgetType && Array.isArray(widgetType) && widgetType.length > 0) {
    const validTypes = widgetType
      .filter((t) => typeof t === 'string' && t.trim())
      .map((t) => t.trim());
    if (validTypes.length > 0) {
      where.widgetType = { in: validTypes };
    }
  }

  let orderBy = ORDER_DESC;
  if (sortSelected && Array.isArray(sortSelected) && sortSelected.length > 0) {
    const first = sortSelected[0];
    const key = first.key ?? first.field;
    const dir = (first.direction ?? first.order) === "asc" ? "asc" : "desc";
    if (key) {
      orderBy = [{ [key]: dir }, { id: dir === "desc" ? "asc" : "desc" }];
    }
  }


  const include = {
    _count: {
      select: { videos: true },
    },
  };

  // --- First page (no cursor) ---
  if (!cursor) {
    const feedsItems = await prisma.feed.findMany({
      where,
      orderBy,
      take: safeTake + 1,
      include,
    });
    const hasMore = feedsItems.length > safeTake;
    const feeds = hasMore ? feedsItems.slice(0, safeTake) : feedsItems;
    return {
      feeds,
      nextCursor: hasMore ? feeds[feeds.length - 1].id : null,
      previousCursor: null,
      hasNext: hasMore,
      hasPrevious: false,
    };
  }

  // --- Next page ---
  if (direction === 'next') {
    const feedsItems = await prisma.feed.findMany({
      where,
      orderBy,
      cursor: { id: cursor },
      skip: 1,
      take: safeTake + 1,
      include,
    });
    const hasMore = feedsItems.length > safeTake;
    const feeds = hasMore ? feedsItems.slice(0, safeTake) : feedsItems;
    return {
      feeds,
      nextCursor: hasMore ? feeds[feeds.length - 1].id : null,
      previousCursor: cursor,
      // previousCursor: feeds[0]?.id ?? cursor,
      hasNext: hasMore,
      hasPrevious: true,
    };
  }

  // --- Previous page ---
  // const feedsItems = await prisma.feed.findMany({
  //   where,
  //   orderBy,
  //   cursor: { id: cursor },
  //   skip: 1,
  //   take: safeTake + 1,
  //   include,
  // });
  const isDescOrder = Array.isArray(orderBy)
    ? (orderBy[0]?.createdAt === 'desc' || Object.values(orderBy[0] || {})[0] === 'desc')
    : false;
  const prevOrderBy = isDescOrder ? ORDER_ASC : ORDER_DESC;
  const feedsItems = await prisma.feed.findMany({
    where,
    orderBy: prevOrderBy,
    cursor: { id: cursor },
    take: safeTake + 1,
    include,
  });

  const hasMore = feedsItems.length > safeTake;
  const feeds = hasMore ? feedsItems.slice(0, safeTake) : feedsItems;
  feeds.reverse();

  return {
    feeds,
    nextCursor: cursor,
    previousCursor: hasMore ? feeds[0].id : null,
    hasNext: true,
    hasPrevious: hasMore,
  };
}
