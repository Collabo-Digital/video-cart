import { authenticate } from "../../../../../config/shopify.server";
import { getListofFeedsWithAnalytics } from "../../../../../models/feedAnalytics.server";
import { captureRouteError } from "../../../../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from '../../../../../lib/utils/apiResponse.js';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    const { cursor, direction = "next", take = 5, startDate, endDate } = await request.json();
    const shopDomain = session.shop;
    let options = {
      cursor: cursor ?? null,
      direction: direction ?? "next",
      take: take ?? 5,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    };
    const feedsData = await getListofFeedsWithAnalytics(shopDomain, options);

    return apiSuccess({
      feedsWithAnalytics: feedsData?.feedsWithAnalytics ?? [],
      nextCursor: feedsData?.nextCursor ?? null,
      previousCursor: feedsData?.previousCursor ?? null,
    }, {
      route: "analytics-feeds-getListofFeeds",
      requestId: request.id,
    });

  } catch (error) {
    captureRouteError(error, {
      route: "api.v1.analytics.feeds.getListofFeeds",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });

    return apiError(error, {
      route: "api.v1.analytics.feeds.getListofFeeds",
      code: "FAILED_TO_FETCH_FEEDS",
      statusCode: 500,
      requestId: request.id,
    });

  }
};
