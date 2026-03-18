import { authenticate } from "../../../../config/shopify.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import { apiError, apiSuccess } from "../../../../lib/utils/apiResponse";
import {
  APP_BILLING_PLANS_NAMES,
  VIDEO_UPLOAD_LIMITS,
  VIDEO_VIEW_LIMITS,
} from "../../../../lib/constants/common";
import * as ShopModel from "../../../../models/shop.server";


const ROUTE = "pricing-acceptSubscription";


export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  try {
    const billingCheck = await billing.check({
      plans: APP_BILLING_PLANS_NAMES,
    });

    // Resolve the active plan name, defaulting to Free if no subscription found
    const planName = billingCheck?.appSubscriptions?.[0]?.name ?? "Free";

    await ShopModel.updateByDomain(session.shop, {
      appPlan: planName,
      planLimits: {
        videoViewLimit: VIDEO_VIEW_LIMITS[planName.toLowerCase()],
        videoUploadLimit: VIDEO_UPLOAD_LIMITS[planName.toLowerCase()],
      },
    });

    return apiSuccess(
      { billingCheck },
      { route: ROUTE, code: "ACCEPT_SUBSCRIPTION_SUCCESS" }
    );
  } catch (error) {
    captureRouteError(error, {
      route: ROUTE,
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });

    return apiError(error, {
      route: ROUTE,
      code: "ACCEPT_SUBSCRIPTION_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};