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
import { captureRouteError } from "../../lib/utils/observability/errorCapture.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhooks can fire multiple times and after the app is already uninstalled.
  // Everything below is idempotent (updateMany / deleteMany), so retries and a
  // missing Shop row are both safe — no throw, no partial state.
  try {
    if (shop) {
      await ShopModel.deactivateByDomain(shop, {
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
      shop: shop ?? "unknown",
    });

    return apiError(error, {
      route: "app-uninstalled",
      code: "APP_UNINSTALLED_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};
