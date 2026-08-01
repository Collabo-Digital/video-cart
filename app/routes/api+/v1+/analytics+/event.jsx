import { authenticate } from '../../../../config/shopify.server.js';
import { recordEvent, EVENT_TYPES } from '../../../../models/analytics.server';
import * as FeedModel from '../../../../models/feed.server';
import { apiError, apiSuccess } from '../../../../lib/utils/apiResponse.js';
import { captureRouteError } from "~/lib/utils/observability/errorCapture";

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return apiError(new Error('Method not allowed'), {
      route: "analytics-event",
      code: "METHOD_NOT_ALLOWED",
      statusCode: 405,
      requestId: request.id,
    }); 
  }
  const { session } = await authenticate.admin(request);

  try {
    const body = await request.json().catch(() => ({}));
    // `shop` is NEVER read from the body — the authenticated session is the only
    // trustworthy source of tenancy. Money values (salesAmount/revenueAmount/
    // orderCount) are not client-writable either; revenue is recorded solely via
    // the verified pixel conversion path.
    const { feedId, videoId, eventType, watchTimeSeconds } = body;

    if (!feedId || !eventType) {
      return apiError(new Error('feedId and eventType are required'), {
        route: "analytics-event",
        code: "FEED_ID_AND_EVENT_TYPE_REQUIRED",
        statusCode: 400,
        requestId: request.id,
      });
    }
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      return apiError(new Error(`eventType must be one of: ${Object.values(EVENT_TYPES).join(', ')}`), {
        route: "analytics-event",
        code: "EVENT_TYPE_INVALID",
        statusCode: 400,
        requestId: request.id,
      });
    }

    // Unconditional ownership check against the AUTHENTICATED shop — prevents
    // one merchant writing analytics into another merchant's feed.
    const feed = await FeedModel.findById(feedId, session.shop);
    if (!feed) {
      return apiError(new Error('Feed not found or access denied'), {
        route: "analytics-event",
        code: "FEED_NOT_FOUND_OR_ACCESS_DENIED",
        statusCode: 404,
        requestId: request.id,
      });
    }

    await recordEvent({
      feedId,
      videoId: videoId || undefined,
      eventType,
      watchTimeSeconds: watchTimeSeconds ?? 0,
    });

    return apiSuccess({ success: true }, {
      route: "analytics-event",
      code: "EVENT_RECORDED",
      statusCode: 200,
      requestId: request.id,
    });
  } catch (err) {
    captureRouteError(err, {
      route: "analytics-event",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
    return apiError(err, {
      route: "analytics-event",
      code: "FAILED_TO_RECORD_EVENT",
      statusCode: 500,
      requestId: request.id,
    });
  }
};
