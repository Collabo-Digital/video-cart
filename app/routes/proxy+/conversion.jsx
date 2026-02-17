/**
 * App Proxy - Conversion (checkout_completed from web pixel)
 * Route: /proxy/conversion (storefront: /apps/video-widget/conversion)
 * POST with JSON body { items: [...] }. Updates feed + video analytics.
 */

import { authenticate } from "../../config/shopify.server";
import { recordEvent, EVENT_TYPES } from "../../services/analytics/analytics.service.server";
import { getFeedById } from "../../services/feed/feed.service.server";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

/**
 * Aggregate items by (feedId, videoId) and record VIDEO_ORDER + WIDGET_ORDER.
 * @param {string} shop - shop domain for validation
 * @param {Array<{ video_id: string, widget_id: string, quantity?: number, line_total?: number }>} items
 */
async function recordConversionEvents(shop, items) {
  if (!items?.length) return;

  const byFeed = new Map();
  const byFeedVideo = new Map();

  for (const item of items) {
    const feedId = item.widget_id;
    const videoId = item.video_id;
    if (!feedId || !videoId) continue;

    const revenue = Number(item.line_total) ?? 0;

    const feedKey = feedId;
    if (!byFeed.has(feedKey)) {
      byFeed.set(feedKey, { revenue: 0, orderCount: 1 });
    }
    const f = byFeed.get(feedKey);
    f.revenue += revenue;

    const fvKey = `${feedId}\t${videoId}`;
    if (!byFeedVideo.has(fvKey)) {
      byFeedVideo.set(fvKey, { feedId, videoId, revenue: 0 });
    }
    const v = byFeedVideo.get(fvKey);
    v.revenue += revenue;
  }

  for (const [feedId, { revenue }] of byFeed) {
    await getFeedById(feedId, shop);
    await recordEvent({
      feedId,
      eventType: EVENT_TYPES.WIDGET_ORDER,
      orderCount: 1,
      revenueAmount: revenue,
    });
  }

  for (const [, { feedId, videoId, revenue }] of byFeedVideo) {
    await recordEvent({
      feedId,
      videoId,
      eventType: EVENT_TYPES.VIDEO_ORDER,
      orderCount: 1,
      revenueAmount: revenue,
    });
  }
}

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: JSON_HEADERS });
  }

  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session?.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: JSON_HEADERS });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return Response.json({ success: true, recorded: 0 }, { status: 200, headers: JSON_HEADERS });
    }

    await recordConversionFromPixel(session.shop, items);

    return Response.json(
      { success: true, recorded: items.length },
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    if (err.message === "Feed not found") {
      return Response.json(
        { success: false, error: "Feed not found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }
    console.error("Proxy conversion error:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to record conversion" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
