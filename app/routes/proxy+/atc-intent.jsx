/**
 * App Proxy - ATC attribution intent (storefront: /apps/video-widget/atc-intent)
 *
 * Stores the cart-token → feed/video link server-side at add-to-cart time.
 * The orders/create webhook joins on the order's cart_token, so attribution
 * never touches cart properties and nothing is visible on the order.
 */

import { authenticate } from "../../config/shopify.server";
import * as CartAttributionModel from "../../models/cartAttribution.server";
import * as FeedModel from "../../models/feed.server";

const JSON_HEADERS = { "Content-Type": "application/json" };

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session?.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: JSON_HEADERS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400, headers: JSON_HEADERS });
    }

    const cartToken = typeof body?.cartToken === "string" ? body.cartToken.trim() : "";
    const productId = body?.productId != null ? String(body.productId) : "";
    const feedId = typeof body?.feedId === "string" ? body.feedId : "";
    const videoId = typeof body?.videoId === "string" ? body.videoId : "";
    const variantId = body?.variantId != null ? String(body.variantId) : null;
    const quantity = Math.max(1, Math.floor(Number(body?.quantity) || 1));
    const visitorId = typeof body?.visitorId === "string" ? body.visitorId : null;

    if (!cartToken || !productId || !feedId || !videoId) {
      return Response.json(
        { success: false, error: "cartToken, productId, feedId and videoId are required" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // Same ownership proof as eventLog: feed belongs to the signed shop, and
    // the video is actually in that feed.
    const feed = await FeedModel.findById(feedId, session.shop);
    if (!feed) {
      return Response.json({ success: false, error: "Feed not found" }, { status: 404, headers: JSON_HEADERS });
    }
    const feedVideo = await FeedModel.findFeedVideo(feedId, videoId);
    if (!feedVideo) {
      return Response.json({ success: false, error: "Video not in feed" }, { status: 404, headers: JSON_HEADERS });
    }

    await CartAttributionModel.upsertIntent({
      shopDomain: session.shop,
      cartToken,
      productId,
      variantId,
      feedId,
      videoId,
      quantity,
      visitorId,
    });

    // Cheap TTL: sweep this shop's stale intents on write, no cron needed.
    await CartAttributionModel.deleteExpired(session.shop);

    return Response.json({ success: true }, { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    // authenticate.public.appProxy throws a Response on an invalid signature —
    // framework control flow, not an error. Let it through.
    if (err instanceof Response) throw err;

    console.error("Proxy atc-intent error:", err);
    return Response.json(
      { success: false, error: "Failed to record intent" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
