/**
 * App Proxy - Conversion (checkout_completed from web pixel)
 * Route: /proxy/conversion (storefront: /apps/video-widget/conversion)
 * POST with JSON body { items: [...] }. Updates feed + video analytics.
 */

import { authenticate } from "../../config/shopify.server";
import { recordConversionFromPixel } from "../../models/analytics.server";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};


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
