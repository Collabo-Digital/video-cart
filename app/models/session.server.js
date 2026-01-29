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
