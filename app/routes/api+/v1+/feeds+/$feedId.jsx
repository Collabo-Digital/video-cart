/**
 * GET /api/v1/feeds/:feedId
 * 
 * Gets a specific feed by ID with all video data for storefront rendering.
 * This endpoint is public (no auth required) as it's called from the storefront.
 */

import { getFeedById } from '../../../../services/feed/feed.service.server';
import * as VideoModel from '../../../../models/video.server';

export const loader = async ({ params, request }) => {
  try {
    const { feedId } = params;
    
    if (!feedId) {
      return new Response(
        JSON.stringify({ error: 'Feed ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get shop from query parameter (provided by Liquid template)
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return new Response(
        JSON.stringify({ error: 'Shop parameter is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get feed with shop validation
    const feed = await getFeedById(feedId, shop);

    if (!feed) {
      return new Response(
        JSON.stringify({ error: 'Feed not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!feed.isEnabled) {
      return new Response(
        JSON.stringify({ error: 'Feed is disabled' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (feed.isDeleted) {
      return new Response(
        JSON.stringify({ error: 'Feed is deleted' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
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
            title: video.title,
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
      .filter((video) => video !== null && video.status === 'READY' && video.playbackId);

    // Return feed data formatted for storefront
    const feedData = {
      id: feed.id,
      feedName: feed.feedName,
      widgetType: feed.widgetType,
      settings: {
        autoplay: feed.autoplay,
        showControls: feed.showControls,
        showTitle: feed.showTitle,
        ...(feed.settings || {}),
      },
      videos: readyVideos.sort((a, b) => a.position - b.position),
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: feedData,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error('Get feed error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch feed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
