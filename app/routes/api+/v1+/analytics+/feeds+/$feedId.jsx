import { authenticate } from '../../../../../config/shopify.server';
import * as FeedModel from '../../../../../models/feed.server';
import { getFeedAnalytics } from '../../../../../models/analytics.server';
import { captureRouteError } from "../../../../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from '../../../../../lib/utils/apiResponse.js';

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  try {
    const { feedId } = params;
    const url = new URL(request.url);
    const startDate = parseDate(url.searchParams.get('startDate'));
    const endDate = parseDate(url.searchParams.get('endDate'));

    if (!feedId) {
      return apiError(new Error('Feed ID is required'), {
        route: "analytics-feeds-getFeedAnalytics",
        code: "FEED_ID_REQUIRED",
        statusCode: 400,
        requestId: request.id,
      });
    }

    if (!session.shop) {
      return apiError(new Error('Shop domain is required'), {
        route: "analytics-feeds-getFeedAnalytics",
        code: "SHOP_DOMAIN_REQUIRED",
        statusCode: 400,
        requestId: request.id,
      });
    }
    const feed = await FeedModel.findById(feedId, session.shop);
    if (!feed) {
      return apiError(new Error('Feed not found'), {
        route: "analytics-feeds-getFeedAnalytics",
        code: "FEED_NOT_FOUND",
        statusCode: 404,
        requestId: request.id,
      });
    }

    const start = startDate || (() => { const d = new Date(); d.setDate(1); return d; })();
    const end = endDate || new Date();
    if (end < start) {
      return apiError(new Error('endDate must be >= startDate'), {
        route: "analytics-feeds-getFeedAnalytics",
        code: "END_DATE_MUST_BE_GREATER_THAN_START_DATE",
        statusCode: 400,
        requestId: request.id,
      });
    }

    const { widget, videos, atcRate } = await getFeedAnalytics(feedId, start, end);
    return apiSuccess({
      widget,
      atcRate,
      videos,
    }, {
      route: "analytics-feeds-getFeedAnalytics",
      requestId: request.id,
    });
  } catch (err) {
    if (err.message === 'Feed not found') {
      captureRouteError(err, {
        route: "api.v1.analytics.feeds.getFeedAnalytics",
        url: request.url,
        method: request.method,
        shop: session?.shop || 'unknown',
      });

      return apiError(new Error('Feed not found'), {
        route: "analytics-feeds-getFeedAnalytics",
        code: "FEED_NOT_FOUND",
        statusCode: 404,
        requestId: request.id,
      });
    }
    captureRouteError(err, {
      route: "api.v1.analytics.feeds.getFeedAnalytics",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });

    return apiError(err, {
      route: "api.v1.analytics.feeds.getFeedAnalytics",
      code: "FAILED_TO_LOAD_ANALYTICS",
      statusCode: 500,
      requestId: request.id,
    });
  }
};
