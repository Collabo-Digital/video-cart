/**
 * App Proxy - Analytics event log (GET, query params)
 * Route: /proxy/event-log (storefront: /apps/video-widget/event-log)
 * Records impression, view, click events in DB. Path avoids ad/tracking blockers.
 */

import { authenticate } from "../../config/shopify.server";
import { recordEvent, EVENT_TYPES } from "../../services/analytics/analytics.service.server";
import { getFeedById } from "../../services/feed/feed.service.server";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session?.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    const feedId = url.searchParams.get("feedId");
    const videoId = url.searchParams.get("videoId") || undefined;
    const eventType = url.searchParams.get("eventType");
    const watchTimeSeconds = url.searchParams.get("watchTimeSeconds");
    const salesAmount = url.searchParams.get("salesAmount");
    const revenueAmount = url.searchParams.get("revenueAmount");
    const orderCount = url.searchParams.get("orderCount");

    if (!feedId || !eventType) {
      return Response.json(
        { success: false, error: "feedId and eventType are required" },
        { status: 400, headers: JSON_HEADERS }
      );
    }
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      return Response.json(
        { success: false, error: `eventType must be one of: ${Object.values(EVENT_TYPES).join(", ")}` },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    await getFeedById(feedId, session.shop);

    await recordEvent({
      feedId,
      videoId,
      eventType,
      watchTimeSeconds: watchTimeSeconds != null ? Number(watchTimeSeconds) : 0,
      salesAmount: salesAmount != null ? Number(salesAmount) : 0,
      revenueAmount: revenueAmount != null ? Number(revenueAmount) : 0,
      orderCount: orderCount != null ? Number(orderCount) : 1,
    });

    return Response.json({ success: true }, { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    if (err.message === "Feed not found") {
      return Response.json(
        { success: false, error: "Feed not found" },
        { status: 404, headers: JSON_HEADERS }
      );
    }
    console.error("Proxy event-log error:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to record event" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
