/**
 * Video Model - Data Access Layer
 * 
 * Handles all database operations for videos.
 */

import prisma from '../config/database.server';
import mux from '../config/mux.server';

/**
 * Find all videos with optional filtering
 * @param {Object} filters - Optional filters (status, limit, offset)
 * @returns {Promise<Array>} Array of video objects
 */
export async function findAll(filters = {}) {
  const { status, limit = 50, offset = 0 } = filters;

  return prisma.video.findMany({
    where: { isDeleted: false, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Find video by ID
 * @param {string} id - Video ID
 * @returns {Promise<Object|null>} Video object or null
 */
export async function findById(id) {
  return prisma.video.findUnique({ where: { id } });
}

/**
 * Find videos by multiple IDs (e.g. for analytics aggregation)
 * @param {string[]} ids - Video IDs
 * @returns {Promise<Array>} Array of video objects
 */
export async function findManyByIds(ids) {
  if (!ids?.length) return [];
  return prisma.video.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, fileName: true, fileUploadName: true },
  });
}

/**
 * Find video by upload ID
 * @param {string} uploadId - Mux upload ID
 * @returns {Promise<Object|null>} Video object or null
 */
export async function findByUploadId(uploadId) {
  return prisma.video.findUnique({
    where: { videoUploadId: uploadId }
  });
}

/**
 * Find video by Mux asset ID
 * @param {string} assetId - Mux asset ID
 * @returns {Promise<Object|null>} Video object or null
 */
export async function findByAssetId(assetId) {
  return prisma.video.findUnique({
    where: { videoAssetId: assetId }
  });
}

/**
 * Find video by Mux playback ID
 * @param {string} playbackId - Mux playback ID
 * @returns {Promise<Object|null>} Video object or null
 */
export async function findByPlaybackId(playbackId) {
  if (!playbackId) return null;
  return prisma.video.findFirst({
    where: { videoPlaybackId: playbackId }
  });
}

/**
 * Find video by fileUploadName (original upload/import name; used for duplicate check)
 * @param {string} fileUploadName - Original file or URL-derived name
 * @returns {Promise<Object|null>} Video object or null
 */
export async function findByFileUploadName(fileUploadName, shopDomain) {
  if (!fileUploadName || typeof fileUploadName !== 'string') return null;
  const name = fileUploadName.trim();
  if (!name) return null;
  // Retired videos must not block re-uploading the same file.
  const where = { fileUploadName: name, isDeleted: false };
  // Scope to the shop so one merchant's filename can't collide with another's.
  if (shopDomain) where.shopDomain = shopDomain;
  return prisma.video.findFirst({ where });
}

/**
 * Create new video
 * @param {Object} data - Video data
 * @returns {Promise<Object>} Created video object
 */
export async function create(data) {
  return prisma.video.create({ data });
}

/**
 * Update video by ID
 * @param {string} id - Video ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated video object
 */
export async function updateById(id, data) {
  return prisma.video.update({
    where: { id },
    data,
  });
}

/**
 * Upsert video by upload ID
 * @param {Object} data - Video data with uploadId
 * @returns {Promise<Object>} Upserted video object
 */
export async function upsertByUploadId(data) {
  const { uploadId, ...videoData } = data;

  return prisma.video.upsert({
    where: { videoUploadId: uploadId },
    update: videoData,
    create: {
      videoUploadId: uploadId,
      ...videoData,
    },
  });
}

/**
 * Retire a video: delete the Mux asset, remove it from every feed, and soft
 * delete the DB record.
 *
 * The row is kept (isDeleted) rather than hard deleted because Video ->
 * VideoAnalytics is onDelete: Cascade — a hard delete would destroy the video's
 * entire history and retroactively change past reports, while the matching
 * VideoCartOrderItem revenue rows (which have no Video relation) would survive
 * and leave the two sources permanently inconsistent.
 *
 * @param {string} id - Video ID
 * @returns {Promise<Object>} Soft-deleted video object
 */
export async function deleteVideoAndMuxAsset(id) {
  if (!id) throw new Error('Video ID is required');
  const video = await findById(id);
  if (!video) throw new Error('Video not found');

  const isPlaceholder = video.videoAssetId?.startsWith('pending-');
  if (video.videoAssetId && !isPlaceholder) {
    try {
      await mux.video.assets.delete(video.videoAssetId);
    } catch (err) {
      const status = err?.status ?? err?.statusCode;
      if (status !== 404) throw err;
    }
  }

  // Remove from feeds so it stops rendering on the storefront (this is the part
  // that SHOULD be destructive), but keep the analytics history intact.
  await prisma.feedVideo.deleteMany({ where: { videoId: id } });

  return prisma.video.update({
    where: { id },
    data: { isDeleted: true, videoPlaybackId: null },
  });
}

/**
 * Count videos with optional filtering
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<number>} Count of videos
 */
export async function count(shopDomain) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required and must be a string');
  }
  return prisma.video.count({
    where: { shopDomain: shopDomain.trim(), isDeleted: false },
  });
}

/**
 * Find videos with pagination and associated widget (feed) ids and names.
 * For API: returns video id, video name, videoUploadId, widgets (id, widgetId, name).
 * @param {Object} options - { page?: number, perPage?: number, search?: string }
 * @returns {Promise<{ videos: Array, total: number }>}
 */

/** Pagination constants for videos */
const VIDEOS_PAGE_SIZE = 5;
const MIN_TAKE = 1;
const MAX_TAKE = 100;
const VIDEOS_ORDER_DESC = [{ createdAt: 'desc' }, { id: 'asc' }];
const VIDEOS_ORDER_ASC = [{ createdAt: 'asc' }, { id: 'desc' }];

const VIDEO_SELECT = {
  id: true,
  title: true,
  fileName: true,
  fileUploadName: true,
  videoPlaybackId: true,
  createdAt: true,
  feedVideos: {
    select: {
      feed: {
        select: {
          id: true,
          widgetId: true,
          feedName: true,
        },
      },
    },
  },
};

/**
 * Find videos with cursor-based pagination and filters (with feed/widget info)
 * @param {string} shopDomain - Shop domain (required)
 * @param {Object} filters - Filters (cursor, direction, take, startDate, endDate, search, status, widgetType, sortSelected)
 * @returns {Promise<{ videos: Array, nextCursor: string|null, previousCursor: string|null, hasNext: boolean, hasPrevious: boolean }>}
 */
export async function findAllPaginatedWithWidgets(shopDomain, filters = {}) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    throw new Error('shopDomain is required and must be a string');
  }

  const {
    cursor,
    direction = 'next',
    take = VIDEOS_PAGE_SIZE,
    startDate,
    endDate,
    search,
    status,
    widgetType,
    sortSelected,
  } = filters;

  const safeTake = Math.min(MAX_TAKE, Math.max(MIN_TAKE, Number(take) || VIDEOS_PAGE_SIZE));

  const where = {
    shopDomain: shopDomain.trim(),
    isDeleted: false,
  };

  // if (startDate != null || endDate != null) {
  //   const dateFilter = {};
  //   if (startDate != null) {
  //     const d = new Date(startDate);
  //     if (isNaN(d.getTime())) throw new Error('startDate must be a valid date');
  //     dateFilter.gte = d;
  //   }
  //   if (endDate != null) {
  //     const d = new Date(endDate);
  //     if (isNaN(d.getTime())) throw new Error('endDate must be a valid date');
  //     dateFilter.lte = d;
  //   }
  //   if (Object.keys(dateFilter).length) {
  //     where.createdAt = dateFilter;
  //   }
  // }

  if (search && typeof search === 'string' && search.trim()) {
    where.title = { contains: search.trim(), mode: 'insensitive' };
  }

  if (status && typeof status === 'string' && status.trim()) {
    where.status = status.trim();
  }

  if (widgetType && Array.isArray(widgetType) && widgetType.length > 0) {
    const validTypes = widgetType
      .filter((t) => typeof t === 'string' && t.trim())
      .map((t) => t.trim());
    if (validTypes.length > 0) {
      where.feedVideos = {
        some: { feed: { widgetType: { in: validTypes } } },
      };
    }
  }

  let orderBy = VIDEOS_ORDER_DESC;
  if (sortSelected && Array.isArray(sortSelected) && sortSelected.length > 0) {
    const first = sortSelected[0];
    const key = first.key ?? first.field;
    const dir = (first.direction ?? first.order) === 'asc' ? 'asc' : 'desc';
    if (key) {
      orderBy = [{ [key]: dir }, { id: dir === 'desc' ? 'asc' : 'desc' }];
    }
  }

  // --- First page (no cursor) ---
  if (!cursor) {
    const videosItems = await prisma.video.findMany({
      where,
      orderBy,
      take: safeTake + 1,
      select: VIDEO_SELECT,
    });
    const hasMore = videosItems.length > safeTake;
    const videos = hasMore ? videosItems.slice(0, safeTake) : videosItems;
    return {
      videos,
      nextCursor: hasMore ? videos[videos.length - 1].id : null,
      previousCursor: null,
      hasNext: hasMore,
      hasPrevious: false,
    };
  }

  // --- Next page ---
  if (direction === 'next') {
    const videosItems = await prisma.video.findMany({
      where,
      orderBy,
      cursor: { id: cursor },
      skip: 1,
      take: safeTake + 1,
      select: VIDEO_SELECT,
    });
    const hasMore = videosItems.length > safeTake;
    const videos = hasMore ? videosItems.slice(0, safeTake) : videosItems;
    return {
      videos,
      nextCursor: hasMore ? videos[videos.length - 1].id : null,
      previousCursor: cursor,
      hasNext: hasMore,
      hasPrevious: true,
    };
  }

  // --- Previous page ---
  const isDescOrder = Array.isArray(orderBy)
    ? (orderBy[0]?.createdAt === 'desc' || Object.values(orderBy[0] || {})[0] === 'desc')
    : false;
  const prevOrderBy = isDescOrder ? VIDEOS_ORDER_ASC : VIDEOS_ORDER_DESC;

  const videosItems = await prisma.video.findMany({
    where,
    orderBy: prevOrderBy,
    cursor: { id: cursor },
    take: safeTake + 1,
    select: VIDEO_SELECT,
  });
  const hasMore = videosItems.length > safeTake;
  const videos = hasMore ? videosItems.slice(0, safeTake) : videosItems;
  videos.reverse();

  return {
    videos,
    nextCursor: cursor,
    previousCursor: hasMore ? videos[0].id : null,
    hasNext: true,
    hasPrevious: hasMore,
  };
}



/**
 * Find video IDs and playback IDs by shop domain
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<Array>} Array of video objects with id and videoPlaybackId
 */
export async function findVideoIdsAndPlaybackIdsByShop(shopDomain) {
  const videos = await prisma.video.findMany({
    where: { shopDomain, isDeleted: false },
    select: { id: true, videoPlaybackId: true },
  });
  return videos.map((v) => ({ videoId: v.id, playbackId: v.videoPlaybackId }));
}