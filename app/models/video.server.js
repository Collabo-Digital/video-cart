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
    where: status ? { status } : undefined,
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
export async function findByFileUploadName(fileUploadName) {
  if (!fileUploadName || typeof fileUploadName !== 'string') return null;
  const name = fileUploadName.trim();
  if (!name) return null;
  return prisma.video.findFirst({
    where: { fileUploadName: name }
  });
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
 * Delete video by ID (database only)
 * @param {string} id - Video ID
 * @returns {Promise<Object>} Deleted video object
 */
export async function deleteById(id) {
  return prisma.video.delete({ where: { id } });
}

/**
 * Delete video from Mux and database. Removes Mux asset first, then DB record.
 * Cascade deletes FeedVideo and VideoAnalytics for this video.
 * @param {string} id - Video ID
 * @returns {Promise<Object>} Deleted video object
 */
export async function deleteVideoAndMuxAsset(id) {
  if (!id) throw new Error('Video ID is required');
  const video = await findById(id);
  if (!video) throw new Error('Video not found');
  if (video.videoAssetId) {
    await mux.video.assets.delete(video.videoAssetId);
  }
  return prisma.video.delete({ where: { id } });
}

/**
 * Count videos with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<number>} Count of videos
 */
export async function count(filters = {}) {
  const { status } = filters;

  return prisma.video.count({
    where: status ? { status } : undefined,
  });
}

/**
 * Find videos with pagination and associated widget (feed) ids and names.
 * For API: returns video id, video name, videoUploadId, widgets (id, widgetId, name).
 * @param {Object} options - { page?: number, perPage?: number, search?: string }
 * @returns {Promise<{ videos: Array, total: number }>}
 */
export async function findAllPaginatedWithWidgets(options = {}) {
  const { search = '', page = 1, perPage = 20, shopDomain } = options;
  const offset = (Math.max(1, page) - 1) * perPage;
  const take = Math.min(100, Math.max(1, perPage));

  const searchTrim = typeof search === 'string' ? search.trim() : '';
  const where = {
    ...(shopDomain ? { shopDomain } : {}),
    ...(searchTrim
      ? {
        OR: [
          { title: { contains: searchTrim } },
          { fileName: { contains: searchTrim } },
          { fileUploadName: { contains: searchTrim } },
        ],
      }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: offset,
      select: {
        id: true,
        title: true,
        fileName: true,
        fileUploadName: true,
        videoUploadId: true,
        videoPlaybackId: true,
        status: true,
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
      },
    }),
    prisma.video.count({ where }),
  ]);

  const videos = rows.map((v) => ({
    id: v.id,
    videoName: v.title || v.fileName || v.fileUploadName || 'Untitled',
    fileUploadName: v.fileUploadName ?? undefined,
    videoUploadId: v.videoUploadId,
    status: v.status,
    createdAt: v.createdAt,
    videoPlaybackId: v.videoPlaybackId,
    widgets: (v.feedVideos || []).map((fv) => ({
      id: fv.feed?.id,
      widgetId: fv.feed?.widgetId,
      name: fv.feed?.feedName ?? '',
    })).filter((w) => w.id != null),
  }));

  return { videos, total };
}
