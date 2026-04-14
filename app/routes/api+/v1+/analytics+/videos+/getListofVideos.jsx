import { authenticate } from "../../../../../config/shopify.server";
import { getListofVideosWithAnalytics } from "../../../../../models/videoAnalytics.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import { apiError, apiSuccess } from '../../../../../lib/utils/apiResponse.js';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    const { cursor, direction = "next", take = 5 } = await request.json();
    const shopDomain = session.shop;
    let options = {
      cursor: cursor ?? null,
      direction: direction ?? "next",
      take: take ?? 5,
    };
    const videosData = await getListofVideosWithAnalytics(shopDomain, options);

    return apiSuccess({
      videosWithAnalytics: videosData?.videosWithAnalytics ?? [],
      nextCursor: videosData?.nextCursor ?? null,
      previousCursor: videosData?.previousCursor ?? null,
    }, {
      route: "analytics-videos-getListofVideos",
      requestId: request.id,
    });

  } catch (error) {
    captureRouteError(error, {
      route: "api.v1.analytics.videos.getListofVideos",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    }); 

    return apiError(error, {
      route: "analytics-videos-getListofVideos",
      code: "FAILED_TO_FETCH_VIDEOS_WITH_ANALYTICS",
      statusCode: 500,
      requestId: request.id,
    });

  }
};
