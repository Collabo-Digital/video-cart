/**
 * Mux Metrics Service
 *
 * Fetches overall data metrics from Mux Data API (views, watch time, QoE, etc.)
 * using @mux/mux-node. Requires MUX_TOKEN_ID and MUX_TOKEN_SECRET.
 *
 * Exposes:
 * - Full overall metrics for one playback ID
 * - Grouped metrics by video ids (multiple videos)
 * - Single video metrics (one video id)
 */

import mux from '../../config/mux.server';

/** Mux metric IDs we fetch for "everything" overall data */
const OVERALL_METRIC_IDS = [
  'views',                      // total_views, total_watch_time, total_playing_time
  'playing_time',               // sum watch time (seconds)
  'viewer_experience_score',    // 0-100 QoE
  'playback_failure_percentage',
  'rebuffer_percentage',
];

/**
 * Build timeframe array for Mux API (last N days as epoch [start, end]).
 * @param {number} days - Number of days (e.g. 30)
 * @returns {[number, number]} [startEpoch, endEpoch]
 */
function getTimeframeEpoch(days = 30) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(1, days));
  return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)];
}

/**
 * Normalized overall data metrics shape (everything we expose per video/playback).
 * @typedef {{
 *   views: number,
 *   totalWatchTimeSeconds: number,
 *   avgWatchTimeSeconds: number | null,
 *   viewerExperienceScore: number | null,
 *   playbackFailurePercentage: number | null,
 *   rebufferPercentage: number | null,
 * }} MuxOverallDataMetrics
 */

/**
 * Fetch one metric's overall value from Mux (no throw).
 * @param {string} metricId - Mux metric ID
 * @param {number[]} timeframe - [startEpoch, endEpoch]
 * @param {string[]} filters - e.g. ['playback_id:xxx']
 * @returns {Promise<{ value?: number, total_views?: number, total_watch_time?: number, total_playing_time?: number } | null>}
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

/**
 * Build normalized metrics object from raw Mux responses for one playback ID.
 * Fetches all OVERALL_METRIC_IDS and merges into one MuxOverallDataMetrics object.
 *
 * @param {string} playbackId - Mux playback ID
 * @param {number} [days=30] - Last N days
 * @returns {Promise<MuxOverallDataMetrics | null>}
 */
export async function getOverallDataMetricsForPlaybackId(playbackId, days = 30) {
  if (!playbackId || typeof playbackId !== 'string') return null;

  const [startEpoch, endEpoch] = getTimeframeEpoch(days);
  const timeframe = [startEpoch, endEpoch];
  const filters = [`playback_id:${playbackId}`];

  const results = await Promise.all(
    OVERALL_METRIC_IDS.map((id) => fetchOneOverall(id, timeframe, filters))
  );

  const viewsRow = results[0];
  const playingTimeRow = results[1];
  const viewerExpRow = results[2];
  const failureRow = results[3];
  const rebufferRow = results[4];

  const views = Number(
    viewsRow?.total_views ?? viewsRow?.value ?? 0
  ) || 0;
  const rawWatchTime = Number(
    viewsRow?.total_watch_time ??
    viewsRow?.total_playing_time ??
    playingTimeRow?.value ??
    playingTimeRow?.total_playing_time ??
    0
  ) || 0;
  // Mux getOverallValues returns watch/playing time in milliseconds
  const totalWatchTimeSeconds = rawWatchTime / 1000;
  const avgWatchTimeSeconds =
    views > 0 ? totalWatchTimeSeconds / views : null;
  const viewerExperienceScore =
    viewerExpRow?.value != null ? Number(viewerExpRow.value) : null;
  const playbackFailurePercentage =
    failureRow?.value != null ? Number(failureRow.value) : null;
  const rebufferPercentage =
    rebufferRow?.value != null ? Number(rebufferRow.value) : null;

  return {
    views,
    totalWatchTimeSeconds,
    avgWatchTimeSeconds,
    viewerExperienceScore,
    playbackFailurePercentage,
    rebufferPercentage,
  };
}

/**
 * Fetch full overall data metrics for multiple playback IDs (one set of Mux calls per playback).
 *
 * @param {string[]} playbackIds - Mux playback IDs
 * @param {number} [days=30] - Last N days
 * @returns {Promise<Map<string, MuxOverallDataMetrics>>} playbackId -> metrics
 */
export async function getOverallDataMetricsForPlaybackIds(playbackIds, days = 30) {
  const ids = [...new Set(playbackIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  const results = await Promise.all(
    ids.map(async (id) => {
      const metrics = await getOverallDataMetricsForPlaybackId(id, days);
      return [id, metrics];
    })
  );

  const map = new Map();
  for (const [playbackId, metrics] of results) {
    if (metrics) map.set(playbackId, metrics);
  }
  return map;
}

/**
 * Group of data metrics: fetch overall metrics for multiple video ids, keyed by video id.
 * Use when you pass a list of video ids (e.g. all videos in a feed).
 *
 * @param {{ videoId: string, playbackId: string | null }[]} videos - List of { videoId, playbackId }
 * @param {number} [days=30] - Last N days
 * @returns {Promise<{
 *   byVideoId: Record<string, MuxOverallDataMetrics>,
 *   byPlaybackId: Record<string, MuxOverallDataMetrics>,
 *   aggregate: MuxOverallDataMetrics
 * }>}
 */
export async function getOverallDataMetricsForVideoIds(videos, days = 30) {
  const playbackIds = videos.map((v) => v.playbackId).filter(Boolean);
  const byPlaybackIdMap = await getOverallDataMetricsForPlaybackIds(playbackIds, days);

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
    rebufferPercentage: rebufferCount > 0 ? rebufferSum / rebufferCount : null,
  };

  const byPlaybackId = Object.fromEntries(byPlaybackIdMap);
  return { byVideoId, byPlaybackId, aggregate };
}

/**
 * Single data metrics: fetch overall metrics for one video id.
 * Use when you pass a single video id.
 *
 * @param {string} videoId - Your app's video id
 * @param {string | null} playbackId - Mux playback ID for that video
 * @param {number} [days=30] - Last N days
 * @returns {Promise<MuxOverallDataMetrics | null>}
 */
export async function getOverallDataMetricsForVideoId(videoId, playbackId, days = 30) {
  if (!playbackId) return null;
  const metrics = await getOverallDataMetricsForPlaybackId(playbackId, days);
  return metrics;
}

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
