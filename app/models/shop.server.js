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

/**
 * Deactivate a shop on uninstall. Idempotent: uses updateMany so it does NOT
 * throw when the row is already gone, which makes the uninstall webhook safe to
 * retry. Sets isActive:false and uninstalledAt; merge any extra fields via `extra`.
 * @param {string} shopDomain - Shop domain
 * @param {Object} [extra] - Additional fields to set (e.g. appPlan, planLimits)
 * @returns {Promise<{count: number}>} Number of rows updated
 */
export async function deactivateByDomain(shopDomain, extra = {}) {
  return prisma.shop.updateMany({
    where: { shopDomain },
    data: {
      isActive: false,
      uninstalledAt: new Date(),
      updatedAt: new Date(),
      ...extra,
    },
  });
}
