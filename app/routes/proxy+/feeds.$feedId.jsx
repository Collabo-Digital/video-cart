import { authenticate } from "../../config/shopify.server";
import { getFeedById } from "../../services/feed/feed.service.server";
import * as VideoModel from "../../models/video.server";
import * as ShopModel from "../../models/shop.server";

export const loader = async ({ request, params }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      return Response.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }
    const shopData = await ShopModel.findByDomain(session.shop);
    const videoViewLimitReached = shopData?.planLimits?.videoViewLimitReached ?? false;
    if (videoViewLimitReached) {
      return Response.json({
        success: false,
        error: "You have reached your video view limit. Please upgrade your plan.",
      }, { status: 403 });
    }
    const feed = await getFeedById(params.feedId, session.shop);

    if (!feed) {
      return Response.json({
        success: false,
        error: "Feed not found"
      }, { status: 404 });
    }

    // Verify feed belongs to this shop
    if (feed.shopDomain !== session.shop) {
      return Response.json({
        success: false,
        error: "Unauthorized access to feed"
      }, { status: 403 });
    }

    // Check if feed is enabled
    if (!feed.isEnabled) {
      return Response.json({
        success: false,
        error: "Feed is disabled"
      }, { status: 403 });
    }

    if (feed.isDeleted) {
      return Response.json({
        success: false,
        error: "Feed is deleted",
      }, { status: 404 });
    }

    // Fetch full video data for each feed video
    const videosWithData = await Promise.all(
      (feed.videos || []).map(async (feedVideo) => {
        try {
          const video = await VideoModel.findById(feedVideo.videoId);
          if (!video) {
            return null;
          }
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
        } catch (error) {
          console.error(`Error fetching video ${feedVideo.videoId}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and videos that aren't ready
    const readyVideos = videosWithData
      .filter((video) => video !== null && video.status === 'READY' && video.playbackId)
      .sort((a, b) => a.position - b.position);

    // Return feed data formatted for storefront
    return Response.json({
      success: true,
      data: {
        id: feed.id,
        feedName: feed.feedName,
        widgetType: feed.widgetType || 'carousel',
        widgetPage: feed.widgetPage,
        customPagePath: feed.customPagePath || null,
        isEnabled: feed.isEnabled,
        // readyVideos, NOT feed.videos: the raw junction rows expose FeedVideo
        // ids (breaking video analytics, which expect a Video id) and include
        // PROCESSING/ERRORED videos that render as broken players on the store.
        videos: readyVideos,
        settings: {
          autoplay: feed.autoplay,
          showControls: feed.showControls,
          showTitle: feed.showTitle,
          ...(feed.settings || {}),
        },
      },
    }, {
      // Per-shop (not per-shopper) data — safe to cache briefly. Every proxy hit
      // is otherwise an uncached round-trip through Shopify to a lambda to Mongo.
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (error instanceof Response) throw error;

    console.error('Proxy get feed error:', error);

    return Response.json({
      success: false,
      error: error.message || 'Failed to fetch feed',
    }, { status: 500 });
  }
};