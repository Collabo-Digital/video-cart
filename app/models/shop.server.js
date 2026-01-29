/**
 * Shop Model - Data Access Layer
 * 
 * Handles all database operations for shops.
 */

import prisma from '../config/database.server';

/**
 * Find shop by domain
 * @param {string} shopDomain - Shop domain
 * @returns {Promise<Object|null>} Shop object or null
 */
export async function findByDomain(shopDomain) {
  return prisma.shop.findUnique({
    where: { shopDomain },
  });
}

/**
 * Upsert shop by domain
 * @param {string} shopDomain - Shop domain
 * @param {Object} data - Shop data
 * @returns {Promise<Object>} Upserted shop object
 */
export async function upsertByDomain(shopDomain, data) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: {
      ...data,
      updatedAt: new Date(),
    },
    create: {
      shopDomain,
      ...data,
    },
  });
}

/**
 * Update shop by domain
 * @param {string} shopDomain - Shop domain
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated shop object
 */
export async function updateByDomain(shopDomain, data) {
  return prisma.shop.update({
    where: { shopDomain },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}
