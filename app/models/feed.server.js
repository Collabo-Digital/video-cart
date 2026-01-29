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
 * Delete feed by ID
 * @param {string} id - Feed ID
 * @returns {Promise<Object>} Deleted feed object
 */
export async function deleteById(id) {
  return prisma.feed.delete({ where: { id } });
}

/**
 * Count feeds with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<number>} Count of feeds
 */
export async function count(filters = {}) {
  const { shopDomain } = filters;

  return prisma.feed.count({
    where: shopDomain ? { shopDomain } : undefined,
  });
}
