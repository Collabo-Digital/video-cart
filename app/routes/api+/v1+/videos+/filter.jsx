import { authenticate } from '../../../../config/shopify.server';
import { findAllPaginatedWithWidgets } from '../../../../models/video.server';
import { captureRouteError } from "../../../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from '../../../../lib/utils/apiResponse.js';



export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    if (!session) {
      return apiError(new Error('Unauthorized'), {
        route: "videos-filter",
        code: "UNAUTHORIZED",
        statusCode: 401,
        requestId: request.id,
      });
    }
    const { filters } = await request.json();

    const videosData = await findAllPaginatedWithWidgets(session.shop, filters);
    return apiSuccess({
      videosData,
    }, {
      route: "videos-filter",
      requestId: request.id,
    });
  } catch (error) {
    captureRouteError(error, {
      route: "api.v1.videos.filter",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });

    return apiError(error, {
      route: "videos-filter",
      code: "FAILED_TO_FILTER_VIDEOS",
      statusCode: 500,
      requestId: request.id,
    });
  }
};