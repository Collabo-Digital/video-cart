/**
 * Session Model - Data Access Layer
 * 
 * Handles all database operations for sessions.
 */

import prisma from '../config/database.server';

/**
 * Delete all sessions for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} Delete result
 */
export async function deleteByShop(shop) {
  return prisma.session.deleteMany({
    where: { shop },
  });
}

/**
 * Update session scope
 * @param {string} sessionId - Session ID
 * @param {string} scope - New scope
 * @returns {Promise<Object>} Updated session
 */
export async function updateScope(sessionId, scope) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { scope },
  });
}

/**
 * Keep only the latest session for a shop, delete the rest.
 * "Latest" = newest token expiry, tie-broken by newest document
 * (ObjectId timestamp). Deletes by Mongo _id (session_id) because
 * duplicate rows can share the same Shopify session id.
 * @param {string} shop - Shop domain
 * @returns {Promise<{deleted: number}>} Number of duplicates removed
 */
export async function keepOnlyLatestSession(shop) {
  const sessions = await prisma.session.findMany({ where: { shop } });
  if (sessions.length <= 1) return { deleted: 0 };

  const objectIdSeconds = (hex) => parseInt(hex.substring(0, 8), 16);
  const ranked = [...sessions].sort((a, b) => {
    const expDiff = (b.expires?.getTime() ?? 0) - (a.expires?.getTime() ?? 0);
    if (expDiff !== 0) return expDiff;
    return objectIdSeconds(b.session_id) - objectIdSeconds(a.session_id);
  });

  const [, ...duplicates] = ranked;
  const res = await prisma.session.deleteMany({
    where: { session_id: { in: duplicates.map((s) => s.session_id) } },
  });
  return { deleted: res.count };
}
