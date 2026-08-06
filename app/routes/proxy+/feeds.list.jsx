/**
 * App Proxy - List Feeds
 * URL: /proxy/feeds/list (proxied from /apps/video-widget/feeds/list)
 */

import { authenticate } from "../../config/shopify.server";
import { getFeedsByShop } from "../../services/feed/feed.service.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return Response.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // The theme-editor picker shows a short list and searches for the rest, so
    // the whole feed inventory is no longer shipped to the browser on every
    // render. Absent params keep the old behaviour for any other caller.
    const url = new URL(request.url);
    // `contains` + insensitive becomes a MongoDB $regex. This endpoint is
    // reachable by any storefront visitor, so strip regex metacharacters rather
    // than hand one a catastrophic-backtracking pattern. Feed names realistically
    // don't contain these, and the remaining substring still matches.
    const search = (url.searchParams.get('q') || '')
      .replace(/[\\^$.*+?()[\]{}|]/g, '')
      .trim()
      .slice(0, 100);
    const requestedLimit = parseInt(url.searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 25)
      : 50;

    // Ask for one more than needed, so "there are others, keep searching" is
    // knowable without a second count query.
    const feeds = await getFeedsByShop(session.shop, {
      isEnabled: true,
      limit: limit + 1,
      ...(search ? { search } : {}),
    });

    const hasMore = feeds.length > limit;

    const feedList = feeds
      .slice(0, limit)
      .filter(feed => feed.isEnabled && !feed.isDeleted) // Only return enabled + not deleted
      .map((feed) => ({
        id: feed.id,
        feedName: feed.feedName,
        widgetType: feed.widgetType,
        isEnabled: feed.isEnabled,
        videoCount: feed.videos?.length || 0,
        createdAt: feed.createdAt,
      }));

    return Response.json({
      success: true,
      data: feedList,
      hasMore,
    });
  } catch (error) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (error instanceof Response) throw error;

    console.error('Proxy list feeds error:', error);

    return Response.json({
      success: false,
      error: error.message || 'Failed to fetch feeds',
    }, { status: 500 });
  }
};