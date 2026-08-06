/**
 * App Proxy - Assign a feed to a theme app block.
 * URL: POST /proxy/blocks/assign (proxied from /apps/video-widget/blocks/assign)
 *
 * Called from the block's design-mode dropdown. Storing the choice here is what
 * removes the copy-paste: a theme block setting cannot be written by JavaScript,
 * but the block id is stable, so the mapping can live in our database instead.
 */

import { authenticate } from "../../config/shopify.server";
import { getFeedById } from "../../services/feed/feed.service.server";
import * as ShopModel from "../../models/shop.server";
import * as ThemeBlockFeedModel from "../../models/themeBlockFeed.server";

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
      return Response.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }

    // App-proxy signing proves the request came through THIS shop's proxy — not
    // that it came from staff. The setup window, refreshed on every admin page
    // view, is what stops an anonymous storefront visitor remapping a block.
    const shopData = await ShopModel.findByDomain(session.shop);
    const until = shopData?.themeSetupUntil ? new Date(shopData.themeSetupUntil) : null;
    if (!until || until.getTime() < Date.now()) {
      return Response.json({
        success: false,
        error: "Open the Video Cart app in your Shopify admin, then reload this page and try again.",
      }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const blockId = body?.blockId?.trim();
    const feedId = body?.feedId?.trim();

    if (!blockId || !feedId) {
      return Response.json({
        success: false,
        error: "blockId and feedId are required",
      }, { status: 400 });
    }

    // Tenancy: getFeedById scopes the lookup by shop, so a feed id belonging to
    // another store simply isn't found.
    const feed = await getFeedById(feedId, session.shop).catch(() => null);
    if (!feed || feed.isDeleted || !feed.isEnabled) {
      return Response.json({
        success: false,
        error: "Feed not available",
      }, { status: 404 });
    }

    await ThemeBlockFeedModel.upsertMapping({
      shopDomain: session.shop,
      blockId,
      feedId,
    });

    return Response.json({ success: true, feedName: feed.feedName });
  } catch (error) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (error instanceof Response) throw error;

    console.error('Proxy assign block error:', error);

    return Response.json({
      success: false,
      error: 'Failed to save selection',
    }, { status: 500 });
  }
};
