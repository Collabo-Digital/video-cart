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

    const feeds = await getFeedsByShop(session.shop);

    const feedList = feeds
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