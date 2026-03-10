/**
 * Fire-and-forget analytics. Does not throw to avoid breaking playback.
 */
import { api } from '../api';

export async function trackDbEvent(payload) {
    if (!payload?.feedId || !payload?.eventType) return;
    try {
        await api.analytics.recordEvent(payload);
    } catch (err) {
        if (import.meta.env?.DEV) {
            console.error('Analytics event failed:', err);
        }
    }
}