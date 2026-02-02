/**
 * Video Model - Data Access Layer
 * 
 * Handles all database operations for videos.
 */

import prisma from '../config/database.server';

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
 * Delete video by ID
 * @param {string} id - Video ID
 * @returns {Promise<Object>} Deleted video object
 */
export async function deleteById(id) {
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
