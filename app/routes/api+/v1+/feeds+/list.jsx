/**
 * GET /api/v1/feeds/list
 * 
 * Lists all feeds for a shop. Used by theme editor to populate feed selector.
 * Accepts shop parameter from query string (provided by Liquid template).
 */

import { getFeedsByShop } from '../../../../services/feed/feed.service';
import { authenticate } from '../../../../config/shopify.server';

export const loader = async ({ request }) => {
  console.log('request of feeds list ------------------', );
   await authenticate.public.appProxy(request);
  try {
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

    const feeds = await getFeedsByShop(shop);

    // Return simplified feed data for selector
    const feedList = feeds
    .filter((feed) => feed.isEnabled && !feed.isDeleted)
    .map((feed) => ({
      id: feed.id,
      feedName: feed.feedName,
      widgetType: feed.widgetType,
      isEnabled: feed.isEnabled,
      videoCount: feed.videos?.length || 0,
      createdAt: feed.createdAt,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: feedList,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('List feeds error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch feeds',
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
