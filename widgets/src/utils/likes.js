/**
 * Videos this shopper has liked. Device-local only — there is no likes concept
 * in the backend, so nothing here is ever sent anywhere.
 */
import { getStorageItem, setStorageItem } from './storage';

const LIKES_KEY = 'liked_videos';

export function getLikedIds() {
    const stored = getStorageItem(LIKES_KEY, []);
    return Array.isArray(stored) ? stored : [];
}

export function saveLikedIds(ids) {
    setStorageItem(LIKES_KEY, ids);
}

/** Stable key for a video: the feed id when there is one, playbackId otherwise —
 *  Discovery items are not feed-scoped and carry no reliable id. */
export function likeKey(video) {
    return video?.id ?? video?.playbackId ?? null;
}
