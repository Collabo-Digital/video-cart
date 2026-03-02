import { getListofVideosWithAnalytics } from "../../../../../models/videoAnalytics.server";
import { authenticate } from "../../../../../config/shopify.server";

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
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

    return Response.json(
      { success: false, error: error.message ?? "Failed to fetch videos with analytics" },
      { status: 500 },
    );

  }
};
