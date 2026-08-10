/**
 * Analytics Model
 *
 * Records events and returns aggregated feed/video analytics from daily snapshots.
 */

import * as FeedAnalyticsModel from './feedAnalytics.server';
import * as VideoAnalyticsModel from './videoAnalytics.server';
import * as VideoModel from './video.server';
import * as FeedModel from './feed.server';

export const EVENT_TYPES = {
  // Widget-level
  WIDGET_IMPRESSION: 'widget_impression',
  WIDGET_CLICK: 'widget_click',
  WIDGET_VIDEO_PLAY: 'widget_video_play',
  WIDGET_PRODUCT_CLICK: 'widget_product_click',
  WIDGET_ATC: 'widget_add_to_cart',
  WIDGET_ORDER: 'widget_order',

  // Video-level (requires videoId)
  VIDEO_IMPRESSION: 'video_impression',
  VIDEO_VIEW: 'video_view',
  VIDEO_PRODUCT_CLICK: 'video_product_click',
  VIDEO_ATC_CLICK: 'video_atc_click',
  VIDEO_ATC: 'video_add_to_cart',
  VIDEO_ORDER: 'video_order',
};

/**
 * Record an analytics event: increment feed (and optionally video) snapshot for today.
 * @param {Object} params
 * @param {string} params.feedId
 * @param {string} [params.videoId]
 * @param {string} params.eventType - impression | view | click | purchase
 * @param {number} [params.watchTimeSeconds] - for view events
 * @param {number} [params.salesAmount] - for purchase events
 */
export async function recordEvent({
  feedId,
  videoId,
  eventType,
  // legacy
  watchTimeSeconds = 0,
  salesAmount = 0,
  // new conversion fields
  revenueAmount = 0,
  orderCount = 1,
} = {}) {
  if (!feedId) throw new Error('feedId is required');
  const now = new Date();

  const feedIncrements = {};
  const videoUpdates = {};

  switch (eventType) {
    // Widget-level
    case EVENT_TYPES.WIDGET_IMPRESSION:
      feedIncrements.widgetImpressions = 1;
      break;
    case EVENT_TYPES.WIDGET_CLICK:
      feedIncrements.widgetClicks = 1;
      feedIncrements.widgetViews = 1;
      break;
    case EVENT_TYPES.WIDGET_VIDEO_PLAY:
      feedIncrements.widgetVideoPlays = 1;
      feedIncrements.widgetViews = 1;
      break;
    case EVENT_TYPES.WIDGET_PRODUCT_CLICK:
      feedIncrements.widgetProductClicks = 1;
      break;
    case EVENT_TYPES.WIDGET_ATC:
      feedIncrements.widgetAddToCart = 1;
      break;
    case EVENT_TYPES.WIDGET_ORDER: {
      const orders = Number(orderCount) || 1;
      const revenue = Number(revenueAmount ?? salesAmount) || 0;
      feedIncrements.widgetOrders = orders;
      feedIncrements.widgetRevenue = revenue;
      break;
    }

    // Video-level (requires videoId)
    case EVENT_TYPES.VIDEO_IMPRESSION:
      if (!videoId) throw new Error('videoId is required for video_impression');
      videoUpdates.videoImpressions = 1;
      break;
    case EVENT_TYPES.VIDEO_VIEW:
      if (!videoId) throw new Error('videoId is required for video_view');
      videoUpdates.videoViews = 1;
      break;
    case EVENT_TYPES.VIDEO_PRODUCT_CLICK:
      if (!videoId) throw new Error('videoId is required for video_product_click');
      videoUpdates.videoProductClicks = 1;
      break;
    case EVENT_TYPES.VIDEO_ATC_CLICK:
      if (!videoId) throw new Error('videoId is required for video_atc_click');
      videoUpdates.videoAtcClicks = 1;
      break;
    case EVENT_TYPES.VIDEO_ATC:
      if (!videoId) throw new Error('videoId is required for video_add_to_cart');
      videoUpdates.videoAddToCart = 1;
      break;
    case EVENT_TYPES.VIDEO_ORDER: {
      if (!videoId) throw new Error('videoId is required for video_order');
      const orders = Number(orderCount) || 1;
      const revenue = Number(revenueAmount ?? salesAmount) || 0;
      videoUpdates.videoOrders = orders;
      videoUpdates.videoRevenue = revenue;
      break;
    }

    // Legacy eventType compatibility (old widget sends these)
    case 'impression':
      feedIncrements.widgetImpressions = 1;
      if (videoId) {
        videoUpdates.videoImpressions = 1;
      }
      break;
    case 'click':
      feedIncrements.widgetClicks = 1;
      feedIncrements.widgetViews = 1;
      break;
    case 'view':
      feedIncrements.widgetVideoPlays = 1;
      feedIncrements.widgetViews = 1;
      if (videoId) {
        videoUpdates.videoViews = 1;
      }
      break;
    case 'purchase': {
      const revenue = Number(revenueAmount ?? salesAmount) || 0;
      feedIncrements.widgetOrders = 1;
      feedIncrements.widgetRevenue = revenue;
      if (videoId) {
        videoUpdates.videoOrders = 1;
        videoUpdates.videoRevenue = revenue;
      }
      break;
    }
    default:
      throw new Error(`Unknown eventType: ${eventType}`);
  }

  await FeedAnalyticsModel.upsertIncrement(feedId, now, feedIncrements);
  if (videoId && Object.keys(videoUpdates).length > 0) {
    await VideoAnalyticsModel.upsertIncrement(videoId, feedId, now, videoUpdates);
  }
}

/**
 * Get aggregated feed analytics and per-video breakdown for a date range.
 * @param {string} feedId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{ feed: { impressions, views, clicks, purchases, sales }, videos: Array }>}
 */
export async function getFeedAnalytics(feedId, startDate, endDate) {
  const [feedRows, videoRows] = await Promise.all([
    FeedAnalyticsModel.findByFeedAndDateRange(feedId, { startDate, endDate }),
    VideoAnalyticsModel.findByFeedAndDateRange(feedId, { startDate, endDate }),
  ]);

  console.log("feedRows IMP 000000000000000000000000000000000000000000----->", feedRows);
  console.log("videoRows IMP 000000000000000000000000000000000000000000----->", videoRows);

  // Widget-level totals (per requirements)
  const widget = {
    impressions: 0,      // widgetImpressions
    clicks: 0,           // widgetClicks
    videoPlays: 0,       // widgetVideoPlays
    views: 0,            // widgetViews (or derived clicks+videoPlays)
    productClicks: 0,    // widgetProductClicks
    addToCart: 0,        // widgetAddToCart
    orders: 0,           // widgetOrders
    revenue: 0,          // widgetRevenue
  };

  for (const row of feedRows) {
    widget.impressions += row.widgetImpressions ?? 0;
    widget.clicks += row.widgetClicks ?? 0;
    widget.videoPlays += row.widgetVideoPlays ?? 0;
    widget.views += row.widgetViews ?? 0;
    widget.productClicks += row.widgetProductClicks ?? 0;
    widget.addToCart += row.widgetAddToCart ?? 0;
    widget.orders += row.widgetOrders ?? 0;
    widget.revenue += Number(row.widgetRevenue ?? 0);

  }
  console.log("videoRows IMP 000000000000000000000000000000000000000000----->", videoRows);
  const uniqueVideoIds = [...new Set(videoRows.map((r) => r.videoId).filter(Boolean))];
  console.log("uniqueVideoIds IMP 000000000000000000000000000000000000000000----->", uniqueVideoIds);
  const videoTitles = new Map();
  if (uniqueVideoIds.length > 0) {
    const videos = await VideoModel.findManyByIds(uniqueVideoIds);
    for (const v of videos) {
      if (v?.id) videoTitles.set(v.id, v.title ?? null);
    }
  }

  const byVideo = new Map();
  for (const row of videoRows) {
    const vid = row.videoId;
    console.log("vid IMP 000000000000000000000000000000000000000000----->", row);
    if (!byVideo.has(vid)) {
      byVideo.set(vid, {
        videoId: vid,
        title: videoTitles.get(vid) ?? null,
        // Video-level metrics (per requirements)
        videoImpressions: 0,
        videoViews: 0,
        productClicks: 0,
        atcClicks: 0,
        addToCart: 0,
        orders: 0,
        revenue: 0,

      });
    }
    const v = byVideo.get(vid);
    v.videoImpressions += row.videoImpressions ?? 0;
    v.videoViews += row.videoViews ?? 0;
    v.productClicks += row.videoProductClicks ?? 0;
    v.atcClicks += row.videoAtcClicks ?? 0;
    v.addToCart += row.videoAddToCart ?? 0;
    v.orders += row.videoOrders ?? 0;
    v.revenue += Number(row.videoRevenue ?? 0);

  }
  const videos = Array.from(byVideo.values());

  // Derived metrics
  const atcRate = widget.views > 0 ? widget.addToCart / widget.views : 0;

  return { widget, atcRate, videos };
}

/**
 * Get aggregated analytics for a single video (across all feeds) in a date range.
 * @param {string} videoId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{ video: { impressions, views, clicks, purchases, sales, totalWatchTime, avgWatchTime } }>}
 */
export async function getVideoAnalytics(videoId, startDate, endDate) {
  const rows = await VideoAnalyticsModel.findByVideoAndDateRange(videoId, { startDate, endDate });

  const video = {
    // Video-level (per requirements)
    videoImpressions: 0,
    videoViews: 0,
    productClicks: 0,
    atcClicks: 0,
    addToCart: 0,
    orders: 0,
    revenue: 0,

  };
  for (const row of rows) {
    video.videoImpressions += row.videoImpressions ?? 0;
    video.videoViews += row.videoViews ?? 0;
    video.productClicks += row.videoProductClicks ?? 0;
    video.atcClicks += row.videoAtcClicks ?? 0;
    video.addToCart += row.videoAddToCart ?? 0;
    video.orders += row.videoOrders ?? 0;
    video.revenue += Number(row.videoRevenue ?? 0);

  }

  return { video };
}

/**
 * Record conversion events from pixel (checkout_completed). Used by both
 * app proxy and public API. Validates each feed belongs to shop.
 * @param {string} shop - shop domain
 * @param {Array<{ video_id: string, widget_id: string, quantity?: number, line_total?: number }>} items
 */
export async function recordConversionFromPixel(shop, items) {
  if (!items?.length) return;

  const byFeed = new Map();
  const byFeedVideo = new Map();

  for (const item of items) {
    const feedId = item.widget_id;
    const videoId = item.video_id;
    if (!feedId || !videoId) continue;

    // Number() yields NaN (not null) on bad input, so `?? 0` never caught it —
    // one malformed line_total used to poison the whole feed's revenue sum.
    const parsed = Number(item.line_total);
    const revenue = Number.isFinite(parsed) ? parsed : 0;

    if (!byFeed.has(feedId)) byFeed.set(feedId, { revenue: 0 });
    byFeed.get(feedId).revenue += revenue;

    const fvKey = `${feedId}\t${videoId}`;
    if (!byFeedVideo.has(fvKey)) byFeedVideo.set(fvKey, { feedId, videoId, revenue: 0 });
    byFeedVideo.get(fvKey).revenue += revenue;
  }

  if (!shop) throw new Error('Shop domain is required');

  // Skip unknown/foreign feeds instead of throwing — one bad item must not
  // discard the whole order's credit, and with the existed-flag gate in the
  // conversion route a mid-loop throw would lose the counters permanently.
  const validFeedIds = new Set();
  for (const [feedId, { revenue }] of byFeed) {
    const feed = await FeedModel.findById(feedId, shop);
    if (!feed) continue;
    validFeedIds.add(feedId);

    await recordEvent({
      feedId,
      eventType: EVENT_TYPES.WIDGET_ORDER,
      orderCount: 1,
      revenueAmount: revenue,
    });
  }

  for (const [, { feedId, videoId, revenue }] of byFeedVideo) {
    // Feed must have passed the shop check above, and the video must actually
    // be IN that feed — membership proves the video is this shop's too.
    if (!validFeedIds.has(feedId)) continue;
    const feedVideo = await FeedModel.findFeedVideo(feedId, videoId);
    if (!feedVideo) continue;

    await recordEvent({
      feedId,
      videoId,
      eventType: EVENT_TYPES.VIDEO_ORDER,
      orderCount: 1,
      revenueAmount: revenue,
    });
  }
}
