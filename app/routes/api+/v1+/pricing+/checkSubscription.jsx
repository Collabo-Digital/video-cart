import { authenticate } from "../../../../config/shopify.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import { apiError, apiSuccess } from "../../../../lib/utils/apiResponse";
import { APP_BILLING_PLANS_NAMES } from "../../../../lib/constants/common";

const ROUTE = "pricing-checkSubscription";

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  try {
    const billingCheck = await billing.check({
      plans: APP_BILLING_PLANS_NAMES,
    });

    return apiSuccess({ billingCheck }, { route: ROUTE, code: "CHECK_SUBSCRIPTION_SUCCESS" });
  } catch (error) {
    captureRouteError(error, {
      route: ROUTE,
      url: request.url,
      method: request.method,
      shop: session?.shop ?? "unknown",
    });

    return apiError(error, {
      route: ROUTE,
      code: "CHECK_SUBSCRIPTION_ERROR",
      statusCode: 500,
      requestId: request.id,
    });
  }
};