/**
 * POST /webhooks/app/uninstalled
 * 
 * Handles app uninstall webhook from Shopify.
 */

import { VIDEO_UPLOAD_LIMITS, VIDEO_VIEW_LIMITS } from "../../lib/constants/common";
import { authenticate } from "../../config/shopify.server";
import * as SessionModel from "../../models/session.server";
import * as ShopModel from "../../models/shop.server";
import { apiError, apiSuccess } from "../../lib/utils/apiResponse";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  try {
    if(shop && session) {
      await ShopModel.updateByDomain(shop, {
        appPlan: "Free",
        planLimits: {
          videoViewLimit: VIDEO_VIEW_LIMITS.free,
          videoUploadLimit: VIDEO_UPLOAD_LIMITS.free,
        },
      });
      await SessionModel.deleteByShop(shop);
    }
    return apiSuccess({ message: "App uninstalled successfully" }, { route: "app-uninstalled", code: "APP_UNINSTALLED_SUCCESS" });
  } catch (error) {
    captureRouteError(error, {
      route: "app-uninstalled",
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });

    return apiError(error, {
      route: "app-uninstalled",
      code: "APP_UNINSTALLED_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }

  return new Response();
};
