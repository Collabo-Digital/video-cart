import { getListofFeedsWithAnalytics } from "../../../../../models/feedAnalytics.server";
import { authenticate } from "../../../../../config/shopify.server";
import { captureRouteError } from '../../../../../lib/utils/observability/errorCapture.js';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  try {
    console.log("REQUAET HITTED");
    const { cursor, direction = "next", take = 5, startDate, endDate } = await request.json();
    console.log("request.body IMP 000000000000000000000000000000000000000000----->", cursor, direction, take, startDate, endDate);
    const shopDomain = session.shop;
    let options = {
      cursor: cursor ?? null,
      direction: direction ?? "next",
      take: take ?? 5,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    };
    const feedsData = await getListofFeedsWithAnalytics(shopDomain, options);

    return Response.json({
      success: true,
      data: feedsData ?? {
        feedsWithAnalytics: [],
        nextCursor: null,
        previousCursor: null,
      },
    });

  } catch (error) {
    console.error("Error fetching feeds:", error);
    captureRouteError(error, {
      route: "analytics-feeds-getListofFeeds",
      url: request.url,
      method: request.method,
      shop: session?.shop || 'unknown',
    });
    return Response.json(
      { success: false, error: error.message ?? "Failed to fetch feeds" },
      { status: 500 },
    );

  }
};
