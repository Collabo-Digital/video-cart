/**
 * GET /api/v1/feeds/list
 * 
 * Lists all feeds for a shop. Used by theme editor to populate feed selector.
 * Accepts shop parameter from query string (provided by Liquid template).
 */

import { authenticate } from '../../../../config/shopify.server';
import {  getFeedsWithPaginationAndFilters } from '../../../../services/feed/feed.service.server';
import { captureRouteError } from "~/lib/utils/observability/errorCapture";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    // await authenticate.public.appProxy(request);`s
    const { filters } = await request.json();
    // const feeds = await getFeedsByShop(shop);
    const feedsData = await getFeedsWithPaginationAndFilters(session.shop, filters);

    // Return simplified feed data for selector
    // const feedList = feedsData?.feeds
    //   .filter((feed) => feed.isEnabled && !feed.isDeleted)
    //   .map((feed) => ({
    //     id: feed.id,
    //     feedName: feed.feedName,
    //     widgetType: feed.widgetType,
    //     isEnabled: feed.isEnabled,
    //     videoCount: feed.videos?.length || 0,
    //     createdAt: feed.createdAt,
    //   }));

    return new Response(
      JSON.stringify({
        success: true,
        data: feedsData,
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
    captureRouteError(error, {
      route: "feeds-list",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
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
