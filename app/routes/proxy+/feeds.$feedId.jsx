/**
 * App Proxy - Get Single Feed
 * URL: /proxy/feeds/:feedId (proxied from /apps/video-widget/feeds/:feedId)
 */

import { authenticate } from "../../config/shopify.server";
import { getFeedById } from "../../services/feed/feed.service.server";
import * as VideoModel from "../../models/video.server";

export const loader = async ({ request, params }) => {
  console.log('request of feeds $feedId hitted' );
  try {
    const { session } = await authenticate.public.appProxy(request);
    console.log('session of feeds $feedId', session);
    
    if (!session) {
      return Response.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 });
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
        isEnabled: feed.isEnabled,
        videos: feed.videos,
        settings: {
          autoplay: feed.autoplay,
          showControls: feed.showControls,
          showTitle: feed.showTitle,
          ...(feed.settings || {}),
        },
      },
    });
  } catch (error) {
    console.error('Proxy get feed error:', error);

    return Response.json({
      success: false,
      error: error.message || 'Failed to fetch feed',
    }, { status: 500 });
  }
};