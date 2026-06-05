import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';

export const settingsService = {
  async fetchSettings() {
    const result = await apiClient.get(ENDPOINTS.SETTINGS);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to fetch settings');
    }
    return result.data;
  },

  async fetchDiscoveryVideos() {
    const result = await apiClient.get(ENDPOINTS.DISCOVERY);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to fetch discovery videos');
    }
    return result.data;
  },
};
