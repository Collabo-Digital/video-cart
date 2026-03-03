import { APP_BILLING_PLANS_NAMES, VIDEO_UPLOAD_LIMITS, VIDEO_VIEW_LIMITS } from "../../../../lib/constants/common";
import { authenticate } from "../../../../config/shopify.server";
import * as ShopModel from "../../../../models/shop.server";


export const loader = async ({ request }) => {
  try {
    const { billing, session } = await authenticate.admin(request);
    const billingCheck = await billing.check({
      plans: APP_BILLING_PLANS_NAMES,
    });

    // Determine active plan from billing check (adjust based on actual billingCheck shape)
    const activeSubscription = billingCheck?.appSubscriptions?.[0];
    const planName = activeSubscription?.name; // e.g. "Basic", "Growth", "Advanced"
    const appPlanValue = planName || "";

    if (appPlanValue && session.shop) {
      await ShopModel.updateByDomain(session.shop, {
        appPlan: appPlanValue,
        videoViewLimit: VIDEO_VIEW_LIMITS[appPlanValue.toLowerCase()],
        videoUploadLimit: VIDEO_UPLOAD_LIMITS[appPlanValue.toLowerCase()],
      });
    }

    return { billingCheck };
  } catch (error) {
    console.error("Error accepting subscription----->", error);
    throw error; // or return { error: error.message } with appropriate status
  }
};