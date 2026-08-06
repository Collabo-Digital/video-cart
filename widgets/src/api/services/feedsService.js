/**
 * Feed API service. Uses apiClient + ENDPOINTS; validates app response contract (ARCHITECTURE-RULES §13).
 * Response: { success: boolean, data?: T, error?: string }
 */

import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';

export const feedsService = {
  /**
   * Fetch a single feed. Validates result.success and result.data before returning.
   * @param {string} feedId
   * @param {string} [shop]
   * @returns {Promise<object>} result.data (feed payload); throws on invalid response.
   */
  async fetchFeed(feedId, shop) {
    const result = await apiClient.get(ENDPOINTS.FEED_BY_ID(feedId, shop));
    if (!result || typeof result.success !== 'boolean') {
      throw new Error('Invalid feed response');
    }
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid feed data');
    }
    return result.data;
  },

  /**
   * Resolve which feed each theme app block renders. One request for the whole
   * page, keyed by block id — blocks with no saved pick are simply absent.
   * @param {string[]} blockIds
   * @returns {Promise<Record<string, object>>} blockId -> feed payload
   */
  async resolveBlocks(blockIds) {
    const result = await apiClient.get(ENDPOINTS.BLOCKS_RESOLVE(blockIds));
    if (!result || typeof result.success !== 'boolean') {
      throw new Error('Invalid blocks response');
    }
    if (!result.success) {
      throw new Error(result.error || 'Invalid blocks data');
    }
    return result.data || {};
  },

  /**
   * Build feed URL (e.g. for debugging or links). Encodes query params.
   * @param {string} feedId
   * @param {string} [shop]
   * @returns {string}
   */
  buildFeedUrl(feedId, shop) {
    return ENDPOINTS.FEED_BY_ID(feedId, shop);
  },
};
