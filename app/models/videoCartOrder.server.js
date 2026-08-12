/**
 * VideoCartOrder Model - Orders attributed to the video-cart app (from pixel).
 * Order total is calculated only from line items that have _tracking (our app).
 */

import prisma from "../config/database.server";

/**
 * Normalize a single line item from the pixel payload.
 * @param {{ video_id: string, widget_id: string, product_id?: string, variant_id?: string, quantity?: number, line_total?: number }} item
 * @returns {{ feedId: string, videoId: string, productId?: string, variantId?: string, quantity: number, lineTotal: number }}
 */
function normalizeItem(item) {
  const quantity = Number(item.quantity) ?? 1;
  const lineTotal = Number(item.line_total) ?? 0;
  return {
    feedId: String(item.widget_id ?? ""),
    videoId: String(item.video_id ?? ""),
    productId: item.product_id != null ? String(item.product_id) : undefined,
    variantId: item.variant_id != null ? String(item.variant_id) : undefined,
    lineItemId: item.line_item_id != null ? String(item.line_item_id) : undefined,
    visitorId: item.visitor_id != null ? String(item.visitor_id) : undefined,
    quantity: Number.isInteger(quantity) && quantity >= 0 ? quantity : 1,
    lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
  };
}

/**
 * Upsert an order and its line items. Order total = sum of line_total of provided items only (app-attributed).
 * @param {string} shopDomain
 * @param {string} orderId - Shopify order GID (e.g. gid://shopify/Order/123). If missing, a synthetic id is used.
 * @param {string} [orderNumber] - Display number e.g. #1001
 * @param {Array<{ video_id: string, widget_id: string, product_id?: string, variant_id?: string, quantity?: number, line_total?: number }>} items
 * @param {string} [currency]
 * @returns {Promise<{ order: object, itemCount: number }>}
 */
export async function upsertOrderWithItems(shopDomain, orderId, orderNumber, items, currency = null, { overwrite = true, checkoutToken = null } = {}) {
  console.log(`[Video Cart Pixel] upsertOrderWithItems called for shop=${shopDomain} orderId=${orderId} orderNumber=${orderNumber} items=${items.length} currency=${currency} checkoutToken=${checkoutToken}`);
  if (!items?.length) {
    throw new Error("items array is required and must not be empty");
  }

  const normalized = items.map(normalizeItem).filter((i) => i.feedId && i.videoId);
  if (normalized.length === 0) {
    throw new Error("No valid items (feedId and videoId required)");
  }

  // Order total = sum of line_total for these items only (our app-attributed items)
  const totalRevenue = normalized.reduce((sum, i) => sum + i.lineTotal, 0);

  const id = orderId && orderId.trim() ? orderId.trim() : `unknown_${Date.now()}_${shopDomain}`;

  const orderData = {
    shopDomain,
    orderId: id,
    orderNumber: orderNumber != null ? String(orderNumber) : null,
    totalRevenue,
    currency: currency != null ? String(currency) : null,
    checkoutToken,
  };

  let existing = await prisma.videoCartOrder.findUnique({
    where: { shopDomain_orderId: { shopDomain, orderId: id } },
    include: { items: true },
  });
  // Bridge: a pixel row created without a real order id is keyed by a
  // synthetic unknown_ id but carries the checkout token — find it here so the
  // webhook upgrades that row in place instead of creating a duplicate.
  if (!existing && checkoutToken) {
    existing = await prisma.videoCartOrder.findFirst({
      where: { shopDomain, checkoutToken },
      include: { items: true },
    });
  }

  if (existing) {
    if (!overwrite) {
      // A better-sourced record (the orders/create webhook) may already own
      // this row — a late pixel event must not degrade it.
      return { order: existing, itemCount: existing.items.length, existed: true };
    }
    await prisma.videoCartOrderItem.deleteMany({ where: { orderId: existing.id } });
    await prisma.videoCartOrder.update({
      where: { id: existing.id },
      data: {
        orderId: id, // upgrades a synthetic unknown_ key to the real GID
        orderNumber: orderData.orderNumber,
        totalRevenue: orderData.totalRevenue,
        currency: orderData.currency,
        checkoutToken: checkoutToken ?? existing.checkoutToken,
      },
    });
    const created = await prisma.videoCartOrderItem.createMany({
      data: normalized.map((i) => ({
        shopDomain,
        orderId: existing.id,
        feedId: i.feedId,
        videoId: i.videoId,
        productId: i.productId ?? null,
        variantId: i.variantId ?? null,
        lineItemId: i.lineItemId ?? null,
        visitorId: i.visitorId ?? null,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
    });
    // existed: true tells callers this order was already recorded — counter
    // increments must be skipped or replays double-count the scoreboards.
    return { order: { ...existing, ...orderData }, itemCount: created.count, existed: true };
  }

  const order = await prisma.videoCartOrder.create({
    data: {
      ...orderData,
      items: {
        create: normalized.map((i) => ({
          shopDomain,
          feedId: i.feedId,
          videoId: i.videoId,
          productId: i.productId ?? null,
          variantId: i.variantId ?? null,
          lineItemId: i.lineItemId ?? null,
          visitorId: i.visitorId ?? null,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      },
    },
    include: { items: true },
  });

  return { order, itemCount: normalized.length, existed: false };
}

/**
 * Find orders for a shop, optionally by date range.
 * @param {string} shopDomain
 * @param {{ startDate?: Date, endDate?: Date, limit?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function findByShop(shopDomain, options = {}) {
  const { startDate, endDate, limit = 100 } = options;
  const where = { shopDomain };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }
  return prisma.videoCartOrder.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Find orders for a shop with cursor-based pagination (for dashboard table).
 * @param {string} shopDomain
 * @param {{ startDate?: Date, endDate?: Date, limit?: number, cursor?: string }} [options]
 * @returns {Promise<{ orders: Array, nextCursor: string | null }>}
 */
export async function findByShopPaginated(shopDomain, options = {}) {
  const { startDate, endDate, limit = 5, cursor } = options;
  const where = { shopDomain };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }
  const rows = await prisma.videoCartOrder.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    // Peek one extra row: its existence is proof of a next page, so a full
    // final page no longer fabricates a phantom "Next".
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasNext = rows.length > limit;
  const orders = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? orders[orders.length - 1].id : null;
  return { orders, nextCursor };
}

/**
 * Get order count and total revenue for a shop, optionally in a date range.
 * @param {string} shopDomain
 * @param {{ startDate?: Date, endDate?: Date }} [options]
 * @returns {Promise<{ orderCount: number, totalRevenue: number }>}
 */
export async function getOrderStatsByShop(shopDomain, options = {}) {
  const { startDate, endDate } = options;
  const where = { shopDomain };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }
  // Aggregate in the database. This previously pulled every matching order
  // document into memory just to count them and sum one float, so cost scaled
  // linearly with the merchant's order history — and it runs twice per
  // Analytics page load (current period + previous period).
  const result = await prisma.videoCartOrder.aggregate({
    where,
    _count: { _all: true },
    _sum: { totalRevenue: true },
  });

  return {
    orderCount: result._count?._all ?? 0,
    // Mongo returns null for a sum over zero rows; keep the previous 0 contract.
    totalRevenue: Number(result._sum?.totalRevenue ?? 0) || 0,
  };
}
