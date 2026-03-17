import { authenticate } from '../../../../config/shopify.server';
import { findAllPaginatedWithWidgets } from '../../../../models/video.server';
import { captureRouteError } from '../../../../lib/utils/observability/errorCapture.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    if (!session) {
      return jsonResponse(
        { success: false, error: 'Unauthorized' },
        401
      );
    }
    const { filters } = await request.json();
    
    const videosData = await findAllPaginatedWithWidgets(session.shop, filters);
    console.log("videosData ----->", videosData);
    return jsonResponse({
      success: true,
      data: videosData ,
    });
  } catch (error) {
    console.error("Error filtering videos:", error);
    captureRouteError(error, {
      route: "videos-filter",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
    throw error;
  }
};