/**
 * ThemeBlockFeed Model - Data Access Layer
 *
 * Maps a Shopify theme app block to the feed it renders. Keyed by the block id,
 * which is stable in the theme's template JSON — a theme block setting cannot be
 * written by JavaScript, so the merchant's choice lives here instead.
 */

import prisma from '../config/database.server';

/**
 * Save (or overwrite) which feed a block renders.
 * @param {Object} params
 * @param {string} params.shopDomain
 * @param {string} params.blockId - Shopify theme block id
 * @param {string} params.feedId
 * @returns {Promise<Object>} The stored mapping
 */
export async function upsertMapping({ shopDomain, blockId, feedId }) {
  return prisma.themeBlockFeed.upsert({
    where: { shopDomain_blockId: { shopDomain, blockId } },
    create: { shopDomain, blockId, feedId },
    update: { feedId },
  });
}

/**
 * Look up mappings for a page's blocks in one query.
 * @param {string} shopDomain
 * @param {string[]} blockIds
 * @returns {Promise<Array>} Mappings (may be shorter than blockIds)
 */
export async function findByBlockIds(shopDomain, blockIds) {
  if (!blockIds?.length) return [];

  return prisma.themeBlockFeed.findMany({
    where: { shopDomain, blockId: { in: blockIds } },
  });
}

/**
 * Drop every mapping pointing at a feed. Called when a feed is deleted, so its
 * blocks don't silently render nothing with no explanation.
 * @param {string} shopDomain
 * @param {string} feedId
 */
export async function deleteByFeedId(shopDomain, feedId) {
  return prisma.themeBlockFeed.deleteMany({ where: { shopDomain, feedId } });
}
