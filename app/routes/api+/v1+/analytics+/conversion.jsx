/**
 * POST /api/v1/analytics/conversion
 *
 * Public endpoint for the web pixel (checkout_completed). The pixel cannot
 * call the store origin (RestrictedUrlError), so it POSTs here (app origin).
 * Body: { shop: string, items: Array<{ video_id, widget_id, quantity?, line_total? }> }
 * Validates shop has an offline session (app installed), then records conversion events.
 */

import { unauthenticated } from "../../../../config/shopify.server.js";
import { recordConversionFromPixel } from "../../../../models/analytics.server";
import { upsertOrderWithItems } from "../../../../models/videoCartOrder.server";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  // Allow the Shopify storefront / checkout origin
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle CORS preflight and accidental GETs
export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: JSON_HEADERS,
    });
  }

  // For GET or other methods, just return empty 204 with CORS headers
  return new Response(null, {
    status: 204,
    headers: JSON_HEADERS,
  });
};

export const action = async ({ request }) => {
  // Public endpoint: the web pixel runs sandboxed on the storefront and has no
  // admin session, so we must NOT call authenticate.admin here. Instead we take
  // the shop from the body and confirm the app is installed (an offline session
  // exists) before recording. Writes are idempotent on orderId (see
  // upsertOrderWithItems), so replays/duplicate checkout_completed events do not
  // double-count. Revenue here is analytics-only, never used for billing.
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405, headers: JSON_HEADERS });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const shop = typeof body?.shop === "string" ? body.shop.trim() : "";
    if (!shop) {
      return Response.json({ success: false, error: "shop is required" }, { status: 400, headers: JSON_HEADERS });
    }

    // Confirm the app is installed on this shop (offline session exists); throws otherwise.
    try {
      await unauthenticated.admin(shop);
    } catch (e) {
      return Response.json({ success: false, error: "Unknown or uninstalled shop" }, { status: 404, headers: JSON_HEADERS });
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    // Shopify order GIDs look like gid://shopify/Order/123. Anything else is
    // junk or a spoof attempt — treat as "no id" so it can't squat a real
    // order's row identity (the endpoint is public).
    const rawOrderId = (typeof body?.orderId === "string" ? body.orderId : body?.order_id)?.trim();
    const orderId = rawOrderId && /^gid:\/\/shopify\/Order\/\d+$/.test(rawOrderId) ? rawOrderId : null;
    const orderNumber = (typeof body?.orderNumber === "string" ? body.orderNumber : body?.order_number) != null ? String(body.orderNumber ?? body.order_number).trim() || null : null;
    const currency = (typeof body?.currency === "string" ? body.currency : null)?.trim() || null;


    if (items.length === 0) {
      return Response.json({ success: true, recorded: 0 }, { status: 200, headers: JSON_HEADERS });
    }

    // Counters bump only when the order is NEW. The order table is idempotent
    // on orderId, but recordConversionFromPixel is a blind increment — without
    // this gate a replayed checkout_completed double-counts feed/video
    // orders and revenue while the orders table stays correct.
    const { existed } = await upsertOrderWithItems(shop, orderId, orderNumber, items, currency);
    if (!existed) {
      await recordConversionFromPixel(shop, items);
    }

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
    console.error("Conversion API error:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to record conversion" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
