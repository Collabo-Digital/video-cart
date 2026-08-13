/**
 * POST /webhooks/orders/create
 *
 * Authoritative order attribution. Joins the order's cart_token against the
 * CartAttribution registry written at add-to-cart, so attribution needs no
 * browser state at checkout time and nothing visible on the order.
 * Idempotent per (shop, order): counters increment only when the order row is
 * first created — webhook retries and the pixel fallback never double-count.
 */

import { authenticate } from "../../config/shopify.server";
import * as CartAttributionModel from "../../models/cartAttribution.server";
import { upsertOrderWithItems } from "../../models/videoCartOrder.server";
import { recordConversionFromPixel } from "../../models/analytics.server";
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";

export const action = async ({ request }) => {
  const { shop, payload } = await authenticate.webhook(request);

  try {
    // Normalize defensively — stored intents are bare tokens (no ?key= suffix).
    console.log("[Video Cart Pixel] orders/create webhook received for shop:", payload);
    const cartToken = typeof payload?.cart_token === "string" ? payload.cart_token.split("?")[0] : null;
    if (!cartToken) return new Response(null, { status: 200 }); // Buy-Now etc. — pixel path may still cover

    const intents = await CartAttributionModel.findByCartToken(shop, cartToken);
    if (!intents.length) return new Response(null, { status: 200 }); // no widget ATC in this cart

    // Match order lines to stored intents by product (+variant when recorded).
    const items = [];
    for (const line of payload?.line_items ?? []) {
      const productId = String(line.product_id ?? "");
      const intent = intents.find(
        (i) => i.productId === productId && (!i.variantId || i.variantId === String(line.variant_id ?? ""))
      );
      if (!intent) continue;

      const unitPrice = Number(line.price_set?.shop_money?.amount ?? line.price);
      const discount = Number(line.total_discount ?? 0);
      const quantity = Number(line.quantity) || 1;
      const lineTotal = Number.isFinite(unitPrice)
        ? Math.max(0, unitPrice * quantity - (Number.isFinite(discount) ? discount : 0))
        : 0;

      items.push({
        widget_id: intent.feedId,
        video_id: intent.videoId,
        product_id: productId,
        variant_id: line.variant_id != null ? String(line.variant_id) : undefined,
        quantity,
        line_total: lineTotal,
        line_item_id: line.id != null ? String(line.id) : undefined,
        visitor_id: intent.visitorId ?? undefined,
      });
    }

    if (items.length === 0) return new Response(null, { status: 200 });

    const { existed } = await upsertOrderWithItems(
      shop,
      payload.admin_graphql_api_id, // real Order GID → orderId column
      payload.name, // "#1053" → orderNumber column
      items,
      payload.currency ?? null, // shop currency, always present on the webhook
      { checkoutToken: payload.checkout_token ?? null }
    );
    if (!existed) {
      await recordConversionFromPixel(shop, items); // ownership re-validated inside
    }

    // Intents served their purpose — consume them.
    await CartAttributionModel.deleteByCartToken(shop, cartToken);

    return new Response(null, { status: 200 });
  } catch (error) {
    captureRouteError(error, {
      route: "orders-create",
      url: request.url,
      method: request.method,
      shop: shop ?? "unknown",
    });
    // Non-2xx → Shopify retries (up to 48h). Writes are idempotent per order,
    // so a retry after a transient failure is safe and wanted.
    return new Response(null, { status: 500 });
  }
};
