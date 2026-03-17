import { getListofVideosWithAnalytics } from "../../../../../models/videoAnalytics.server";
import { authenticate } from "../../../../../config/shopify.server";
import { captureRouteError } from '../../../../../lib/utils/observability/errorCapture.js';

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

    return Response.json({
      success: true,
      data: videosData ?? {
        videosWithAnalytics: [],
        nextCursor: null,
        previousCursor: null,
      },
    });

  } catch (error) {
    console.error("Error fetching videos with analytics:", error);
    captureRouteError(error, {
      route: "analytics-videos-getListofVideos",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    }); 
    return Response.json(
      { success: false, error: error.message ?? "Failed to fetch videos with analytics" },
      { status: 500 },
    );

  }
};
