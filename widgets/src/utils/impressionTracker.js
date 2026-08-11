/**
 * Shared impression tracking for all widget types.
 *
 * Dedupe unit is the tab-session (sessionStorage): one WIDGET_IMPRESSION per
 * feed and one VIDEO_IMPRESSION per (feed, video) per tab — page refreshes and
 * cross-page browsing no longer inflate counts. When sessionStorage is
 * unavailable the check degrades to the old per-mount behaviour, so events are
 * never lost, only deduped less.
 */

import { trackDbEvent } from './analytics';
import { EVENT_TYPES } from '../api/services/analyticsService';
import { getSessionItem, setSessionItem } from './storage';

function firedOnce(key) {
    if (getSessionItem(key)) return true;
    setSessionItem(key, '1');
    return false;
}

/**
 * Fire WIDGET_IMPRESSION when the container first intersects the viewport,
 * once per feed per tab-session. The observer self-disconnects on fire and is
 * also disconnected on unmount via the caller's onCleanup.
 * @param {Element|null} container
 * @param {{id?: string}} feed
 * @param {boolean} isPreview
 * @param {Function} onCleanup - SolidJS onCleanup from the calling effect
 */
export function observeWidgetImpression(container, feed, isPreview, onCleanup) {
    if (!container || !feed?.id || isPreview) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let sent = false;
    const observer = new IntersectionObserver(
        async (entries) => {
            if (sent) return;
            for (const entry of entries) {
                if (entry.isIntersecting && entry.intersectionRatio > 0) {
                    sent = true;
                    observer.disconnect();
                    if (!firedOnce(`imp_${feed.id}`)) {
                        await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_IMPRESSION });
                    }
                    break;
                }
            }
        },
        { threshold: 0.1 }
    );

    observer.observe(container);
    onCleanup(() => observer.disconnect());
}

/** Fire VIDEO_IMPRESSION once per (feed, video) per tab-session. */
export async function trackVideoImpressionOnce(feedId, videoId) {
    if (!feedId || !videoId) return;
    if (firedOnce(`vimp_${feedId}_${videoId}`)) return;
    await trackDbEvent({ feedId, videoId, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
}
