import { authenticate } from "../../../../config/shopify.server";
import { captureRouteError } from "../../../../lib/utils/observability/errorCapture.server";
import { apiError, apiSuccess } from "../../../../lib/utils/apiResponse";
import {
  APP_BILLING_PLANS_NAMES,
  VIDEO_UPLOAD_LIMITS,
  VIDEO_VIEW_LIMITS,
} from "../../../../lib/constants/common";
import * as ShopModel from "../../../../models/shop.server";


const ROUTE = "pricing-cancelSubscription";


export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  try {
    const { hasActivePayment, appSubscriptions } = await billing.check({
      plans: APP_BILLING_PLANS_NAMES,
    });

    if (!hasActivePayment || !appSubscriptions.length) {
      return apiError(
        { error: "No active subscription found to cancel" },
        { status: 400, route: ROUTE, code: "NO_ACTIVE_SUBSCRIPTION" }
      );
    }

    const subscription = appSubscriptions[0];

    await billing.cancel({
      subscriptionId: subscription.id,
      prorate: true,
    });

    await ShopModel.updateByDomain(session.shop, {
      appPlan: "Free",
      planLimits: {
        videoViewLimit: VIDEO_VIEW_LIMITS.free,
        videoUploadLimit: VIDEO_UPLOAD_LIMITS.free,
      },
    });

    return apiSuccess(
      { message: "Subscription cancelled successfully" },
      { route: ROUTE, code: "SUBSCRIPTION_CANCELLED_SUCCESSFULLY" }
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
      code: "CANCEL_SUBSCRIPTION_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};