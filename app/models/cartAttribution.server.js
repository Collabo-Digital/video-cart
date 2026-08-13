/**
 * CartAttribution Model - Data Access Layer
 *
 * Stores "this cart token added this product from this feed/video" so the
 * orders/create webhook can attribute orders by joining on the order's
 * cart_token. Rows are transient: consumed on order, expired after 30 days.
 */

import prisma from '../config/database.server';

const INTENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Upsert an ATC intent. Repeat ATC of the same (product, feed, video) in the
 * same cart accumulates quantity.
 * @param {Object} params
 * @param {string} params.shopDomain
 * @param {string} params.cartToken
 * @param {string} params.productId
 * @param {string} [params.variantId]
 * @param {string} params.feedId
 * @param {string} params.videoId
 * @param {number} [params.quantity]
 * @param {string} [params.visitorId]
 * @returns {Promise<Object>}
 */
export async function upsertIntent({ shopDomain, cartToken, productId, variantId = null, feedId, videoId, quantity = 1, visitorId = null }) {
  return prisma.cartAttribution.upsert({
    where: {
      shopDomain_cartToken_productId_feedId_videoId: {
        shopDomain, cartToken, productId, feedId, videoId,
      },
    },
    update: { quantity: { increment: quantity }, variantId },
    create: { shopDomain, cartToken, productId, variantId, feedId, videoId, quantity, visitorId },
  });
}

/**
 * All intents for one cart, used by the orders/create webhook.
 * @param {string} shopDomain
 * @param {string} cartToken
 * @returns {Promise<Array>}
 */
export async function findByCartToken(shopDomain, cartToken) {
  return prisma.cartAttribution.findMany({ where: { shopDomain, cartToken } });
}

/**
 * Remove intents once an order consumed them.
 * @param {string} shopDomain
 * @param {string} cartToken
 * @returns {Promise<{count: number}>}
 */
export async function deleteByCartToken(shopDomain, cartToken) {
  return prisma.cartAttribution.deleteMany({ where: { shopDomain, cartToken } });
}

/**
 * Opportunistic TTL sweep: intents older than 30 days are stale attribution.
 * @param {string} shopDomain
 * @returns {Promise<{count: number}>}
 */
export async function deleteExpired(shopDomain) {
  return prisma.cartAttribution.deleteMany({
    where: { shopDomain, createdAt: { lt: new Date(Date.now() - INTENT_TTL_MS) } },
  });
}
