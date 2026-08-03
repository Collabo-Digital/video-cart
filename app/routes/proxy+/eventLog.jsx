/**
 * App Proxy - Analytics event log (GET, query params)
 * Route: /proxy/event-log (storefront: /apps/video-widget/event-log)
 * Records impression, view, click events in DB. Path avoids ad/tracking blockers.
 */

import { authenticate } from "../../config/shopify.server";
import { recordEvent, EVENT_TYPES } from "../../models/analytics.server";
import * as FeedModel from "../../models/feed.server";

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
    // Revenue/order values are NEVER read from the client here. Orders and revenue
    // are recorded only via the authenticated pixel → conversion endpoint (which
    // validates the order). Accepting them from a signed storefront GET would let
    // anyone forge a shop's revenue and order counts.

    if (!feedId || !eventType) {
      return Response.json(
        { success: false, error: "feedId and eventType are required" },
        { status: 400, headers: JSON_HEADERS }
      );
    }
    // Only non-monetary engagement events are allowed on this public endpoint.
    // Order events (revenue) must come from the pixel conversion path.
    if (
      !Object.values(EVENT_TYPES).includes(eventType) ||
      eventType === EVENT_TYPES.WIDGET_ORDER ||
      eventType === EVENT_TYPES.VIDEO_ORDER
    ) {
      return Response.json(
        { success: false, error: "Unsupported event type" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!session.shop) throw new Error('Shop domain is required');
    const feed = await FeedModel.findById(feedId, session.shop);
    if (!feed) throw new Error('Feed not found');

    // videoId must actually belong to this feed. feedId is already proven to be
    // this shop's, so a matching FeedVideo row proves the video is theirs too —
    // otherwise anyone could record analytics against another merchant's video.
    if (videoId) {
      const feedVideo = await FeedModel.findFeedVideo(feedId, videoId);
      if (!feedVideo) {
        return Response.json(
          { success: false, error: "Video not in feed" },
          { status: 404, headers: JSON_HEADERS }
        );
      }
    }

    await recordEvent({
      feedId,
      videoId,
      eventType,
      watchTimeSeconds: watchTimeSeconds != null ? Number(watchTimeSeconds) : 0,
    });

    return Response.json({ success: true }, { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (err instanceof Response) throw err;

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
