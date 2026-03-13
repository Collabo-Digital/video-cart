/**
 * Mux Metrics Service
 *
 * Fetches overall data metrics from Mux Data API (views, watch time, QoE, etc.)
 * using @mux/mux-node. Requires MUX_TOKEN_ID and MUX_TOKEN_SECRET.
 *
 * All public functions accept an optional `dateWindow` ({ startDate, endDate })
 * as the last parameter. When provided, Mux data is fetched for that exact window.
 * When omitted, falls back to "last N days from now" (default 30).
 *
 * Usage:
 *   Index page  → pass { startDate: resetDate - 30d, endDate: now }
 *   Analytics   → omit dateWindow (uses "last N days") or pass your own range
 */

import mux from '../../config/mux.server';

const OVERALL_METRIC_IDS = [
  'views',
  'playing_time',
  'viewer_experience_score',
  'playback_failure_percentage',
  'rebuffer_percentage',
];

// ─── Timeframe helpers ───────────────────────────────────────────────

/**
 * Convert two Date objects to Mux epoch timeframe.
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {[number, number]}
 */
function toEpochPair(startDate, endDate) {
  const s = startDate instanceof Date ? startDate : new Date(startDate);
  const e = endDate instanceof Date ? endDate : new Date(endDate);
  return [Math.floor(s.getTime() / 1000), Math.floor(e.getTime() / 1000)];
}

/**
 * Single place that decides the Mux timeframe.
 *
 * @param {{ startDate: Date, endDate: Date } | null} dateWindow - Explicit window (e.g. reset cycle)
 * @param {number} daysFallback - "Last N days from now" when dateWindow is null
 * @returns {[number, number]} [startEpoch, endEpoch]
 */
function resolveTimeframe(dateWindow = null, daysFallback = 30) {
  if (dateWindow?.startDate != null && dateWindow?.endDate != null) {
    return toEpochPair(dateWindow.startDate, dateWindow.endDate);
  }
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(1, daysFallback));
  return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)];
}

// ─── Low-level Mux call ──────────────────────────────────────────────

/**
 * @typedef {{
 *   views: number,
 *   totalWatchTimeSeconds: number,
 *   avgWatchTimeSeconds: number | null,
 *   viewerExperienceScore: number | null,
 *   playbackFailurePercentage: number | null,
 *   rebufferPercentage: number | null,
 * }} MuxOverallDataMetrics
 */

async function fetchOneOverall(metricId, timeframe, filters) {
  try {
    const res = await mux.data.metrics.getOverallValues(metricId, {
      timeframe,
      filters,
    });
    return res?.data ?? null;
  } catch (err) {
    console.error(`Mux getOverallValues(${metricId}) error:`, err?.message);
    return null;
  }
}

// ─── Build normalized metrics from raw Mux rows ─────────────────────

function buildMetricsFromResults(results) {
  const [viewsRow, playingTimeRow, viewerExpRow, failureRow, rebufferRow] = results;

  const views = Number(viewsRow?.total_views ?? viewsRow?.value ?? 0) || 0;

  const rawWatchTime = Number(
    viewsRow?.total_watch_time ??
    viewsRow?.total_playing_time ??
    playingTimeRow?.value ??
    playingTimeRow?.total_playing_time ??
    0
  ) || 0;

  const totalWatchTimeSeconds = rawWatchTime / 1000;

  return {
    views,
    totalWatchTimeSeconds,
    avgWatchTimeSeconds: views > 0 ? totalWatchTimeSeconds / views : null,
    viewerExperienceScore:
      viewerExpRow?.value != null ? Number(viewerExpRow.value) : null,
    playbackFailurePercentage:
      failureRow?.value != null ? Number(failureRow.value) : null,
    rebufferPercentage:
      rebufferRow?.value != null ? Number(rebufferRow.value) : null,
  };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Metrics for a single playback ID.
 *
 * @param {string} playbackId
 * @param {number} [days=30] - Fallback: last N days (ignored when dateWindow is set)
 * @param {{ startDate: Date, endDate: Date } | null} [dateWindow] - Explicit date range
 * @returns {Promise<MuxOverallDataMetrics | null>}
 */
export async function getOverallDataMetricsForPlaybackId(
  playbackId,
  days = 30,
  dateWindow = null,
) {
  if (!playbackId || typeof playbackId !== 'string') return null;

  const timeframe = resolveTimeframe(dateWindow, days);
  const filters = [`playback_id:${playbackId}`];

  const results = await Promise.all(
    OVERALL_METRIC_IDS.map((id) => fetchOneOverall(id, timeframe, filters)),
  );

  return buildMetricsFromResults(results);
}

/**
 * Metrics for multiple playback IDs.
 *
 * @param {string[]} playbackIds
 * @param {number} [days=30]
 * @param {{ startDate: Date, endDate: Date } | null} [dateWindow]
 * @returns {Promise<Map<string, MuxOverallDataMetrics>>}
 */
export async function getOverallDataMetricsForPlaybackIds(
  playbackIds,
  days = 30,
  dateWindow = null,
) {
  const ids = [...new Set(playbackIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  const results = await Promise.all(
    ids.map(async (id) => {
      const metrics = await getOverallDataMetricsForPlaybackId(id, days, dateWindow);
      return [id, metrics];
    }),
  );

  const map = new Map();
  for (const [playbackId, metrics] of results) {
    if (metrics) map.set(playbackId, metrics);
  }
  return map;
}

/**
 * Metrics for multiple videos (keyed by videoId), with aggregate totals.
 *
 * @param {{ videoId: string, playbackId: string | null }[]} videos
 * @param {number} [days=30]
 * @param {{ startDate: Date, endDate: Date } | null} [dateWindow]
 * @returns {Promise<{ byVideoId, byPlaybackId, aggregate }>}
 */
export async function getOverallDataMetricsForVideoIds(
  videos,
  days = 30,
  dateWindow = null,
) {
  const playbackIds = videos.map((v) => v.playbackId).filter(Boolean);
  const byPlaybackIdMap = await getOverallDataMetricsForPlaybackIds(playbackIds, days, dateWindow);

  const byVideoId = {};
  for (const v of videos) {
    if (v.videoId && v.playbackId && byPlaybackIdMap.has(v.playbackId)) {
      byVideoId[v.videoId] = byPlaybackIdMap.get(v.playbackId);
    }
  }

  let aggregateViews = 0;
  let aggregateWatchTime = 0;
  let viewerExpSum = 0;
  let viewerExpCount = 0;
  let failureSum = 0;
  let failureCount = 0;
  let rebufferSum = 0;
  let rebufferCount = 0;

  for (const m of byPlaybackIdMap.values()) {
    aggregateViews += m.views ?? 0;
    aggregateWatchTime += m.totalWatchTimeSeconds ?? 0;
    if (m.viewerExperienceScore != null) {
      viewerExpSum += m.viewerExperienceScore;
      viewerExpCount += 1;
    }
    if (m.playbackFailurePercentage != null) {
      failureSum += m.playbackFailurePercentage;
      failureCount += 1;
    }
    if (m.rebufferPercentage != null) {
      rebufferSum += m.rebufferPercentage;
      rebufferCount += 1;
    }
  }

  const aggregate = {
    views: aggregateViews,
    totalWatchTimeSeconds: aggregateWatchTime,
    avgWatchTimeSeconds:
      aggregateViews > 0 ? aggregateWatchTime / aggregateViews : null,
    viewerExperienceScore:
      viewerExpCount > 0 ? viewerExpSum / viewerExpCount : null,
    playbackFailurePercentage:
      failureCount > 0 ? failureSum / failureCount : null,
    rebufferPercentage:
      rebufferCount > 0 ? rebufferSum / rebufferCount : null,
  };

  const byPlaybackId = Object.fromEntries(byPlaybackIdMap);
  return { byVideoId, byPlaybackId, aggregate };
}

/**
 * Metrics for one video by its app videoId.
 *
 * @param {string} videoId
 * @param {string | null} playbackId
 * @param {number} [days=30]
 * @param {{ startDate: Date, endDate: Date } | null} [dateWindow]
 * @returns {Promise<MuxOverallDataMetrics | null>}
 */
export async function getOverallDataMetricsForVideoId(
  videoId,
  playbackId,
  days = 30,
  dateWindow = null,
) {
  if (!playbackId) return null;
  return getOverallDataMetricsForPlaybackId(playbackId, days, dateWindow);
}

// ─── Deprecated wrappers (kept for backward compat) ──────────────────

/** @deprecated Use getOverallDataMetricsForPlaybackId */
export async function getMetricsForPlaybackId(playbackId, days = 30) {
  const m = await getOverallDataMetricsForPlaybackId(playbackId, days);
  return m ? { views: m.views, totalWatchTimeSeconds: m.totalWatchTimeSeconds } : null;
}

/** @deprecated Use getOverallDataMetricsForPlaybackIds */
export async function getMetricsForPlaybackIds(playbackIds, days = 30) {
  const map = await getOverallDataMetricsForPlaybackIds(playbackIds, days);
  const out = new Map();
  for (const [id, m] of map) {
    out.set(id, { views: m.views, totalWatchTimeSeconds: m.totalWatchTimeSeconds });
  }
  return out;
}

/** @deprecated Use getOverallDataMetricsForVideoIds */
export async function getOverallValuesForVideos(videos, days = 30) {
  const { byVideoId, byPlaybackId, aggregate } = await getOverallDataMetricsForVideoIds(videos, days);
  return {
    byVideoId,
    byPlaybackId,
    aggregate: {
      views: aggregate.views,
      totalWatchTimeSeconds: aggregate.totalWatchTimeSeconds,
    },
  };
}