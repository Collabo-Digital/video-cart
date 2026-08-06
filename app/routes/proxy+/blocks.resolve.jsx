/**
 * App Proxy - Resolve which feed each theme app block should render.
 * URL: GET /proxy/blocks/resolve?ids=b1,b2 (proxied from /apps/video-widget/blocks/resolve)
 *
 * The storefront sends every block id on the page in one request and gets back a
 * map keyed by block id, so a page with three blocks costs one round-trip.
 */

import { authenticate } from "../../config/shopify.server";
import * as FeedModel from "../../models/feed.server";
import * as ShopModel from "../../models/shop.server";
import * as ThemeBlockFeedModel from "../../models/themeBlockFeed.server";

const MAX_BLOCKS = 20;

/**
 * Shape a feed for the storefront.
 *
 * Deliberately duplicated from feeds.$feedId.jsx rather than extracted into a
 * shared serializer: that route is what every already-installed merchant block
 * uses, theme app extensions auto-update for all stores at once, and refactoring
 * it is risk this change doesn't need to take. Extracting it (and fixing the N+1
 * it still carries) is worth doing as its own verifiable change.
 */
function toStorefrontFeedPayload(feed) {
  const videos = (feed.videos || [])
    .map((feedVideo) => {
      const video = feedVideo.video;
      if (!video) return null;
      return {
        id: video.id,
        playbackId: video.videoPlaybackId || feedVideo.playbackId,
        title: video.fileName || video.title,
        duration: video.duration,
        aspectRatio: video.aspectRatio,
        status: video.status,
        productsTagged: feedVideo.productsTagged || [],
        position: feedVideo.position,
      };
    })
    // Ready videos only: the raw junction rows expose FeedVideo ids (which break
    // video analytics, that expect a Video id) and include PROCESSING/ERRORED
    // videos that render as broken players on the store.
    .filter((video) => video && video.status === 'READY' && video.playbackId)
    .sort((a, b) => a.position - b.position);

  return {
    id: feed.id,
    feedName: feed.feedName,
    widgetType: feed.widgetType || 'carousel',
    widgetPage: feed.widgetPage,
    customPagePath: feed.customPagePath || null,
    isEnabled: feed.isEnabled,
    videos,
    settings: {
      autoplay: feed.autoplay,
      showControls: feed.showControls,
      showTitle: feed.showTitle,
      ...(feed.settings || {}),
    },
  };
}

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
      return Response.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }

    // Same paywall as feeds.$feedId.jsx — without it this endpoint is a way
    // around the video view limit.
    const shopData = await ShopModel.findByDomain(session.shop);
    if (shopData?.planLimits?.videoViewLimitReached) {
      return Response.json({
        success: false,
        error: "You have reached your video view limit. Please upgrade your plan.",
      }, { status: 403 });
    }

    const ids = (new URL(request.url).searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_BLOCKS);

    if (!ids.length) {
      return Response.json({ success: true, data: {} });
    }

    const mappings = await ThemeBlockFeedModel.findByBlockIds(session.shop, ids);

    // Two blocks can point at the same feed — load it once.
    const feedIds = [...new Set(mappings.map((mapping) => mapping.feedId))];
    const feeds = await Promise.all(
      feedIds.map((id) => FeedModel.findById(id, session.shop).catch(() => null))
    );

    const payloadByFeedId = new Map(
      feeds
        .filter((feed) => feed && feed.isEnabled && !feed.isDeleted)
        .map((feed) => [feed.id, toStorefrontFeedPayload(feed)])
    );

    const data = {};
    for (const mapping of mappings) {
      const payload = payloadByFeedId.get(mapping.feedId);
      if (payload) data[mapping.blockId] = payload;
    }

    return Response.json({ success: true, data }, {
      // Per-block config that changes the instant a merchant picks a feed —
      // unlike feed content, this must never be served stale.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (error instanceof Response) throw error;

    console.error('Proxy resolve blocks error:', error);

    return Response.json({
      success: false,
      error: 'Failed to resolve blocks',
    }, { status: 500 });
  }
};
