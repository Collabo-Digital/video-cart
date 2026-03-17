/**
 * POST /api/v1/analytics/conversion
 *
 * Public endpoint for the web pixel (checkout_completed). The pixel cannot
 * call the store origin (RestrictedUrlError), so it POSTs here (app origin).
 * Body: { shop: string, items: Array<{ video_id, widget_id, quantity?, line_total? }> }
 * Validates shop has an offline session (app installed), then records conversion events.
 */

import { sessionStorage } from "../../../../config/shopify.server";
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
  const { session } = await authenticate.admin(request);
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
    } if (!session.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: JSON_HEADERS });
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    const orderId = (typeof body?.orderId === "string" ? body.orderId : body?.order_id)?.trim() || null;
    const orderNumber = (typeof body?.orderNumber === "string" ? body.orderNumber : body?.order_number) != null ? String(body.orderNumber ?? body.order_number).trim() || null : null;
    const currency = (typeof body?.currency === "string" ? body.currency : null)?.trim() || null;


    if (items.length === 0) {
      return Response.json({ success: true, recorded: 0 }, { status: 200, headers: JSON_HEADERS });
    }

    await upsertOrderWithItems(session.shop, orderId, orderNumber, items, currency);
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
    console.error("Conversion API error:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to record conversion" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
};
