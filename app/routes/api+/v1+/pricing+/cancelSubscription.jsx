import { APP_BILLING_PLANS_NAMES, VIDEO_UPLOAD_LIMITS, VIDEO_VIEW_LIMITS } from "../../../../lib/constants/common";
import { authenticate } from "../../../../config/shopify.server";
import * as ShopModel from "../../../../models/shop.server";

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  // 1. Check current subscriptions for your known plans
  const {hasActivePayment,appSubscriptions } = await billing.check({
    plans: APP_BILLING_PLANS_NAMES,
  });


  if (!hasActivePayment || !appSubscriptions.length) {
    // Nothing to cancel – either already free, or plan mismatch
    return new Response(JSON.stringify(
      {
        error: "NO_ACTIVE_SUBSCRIPTION",
        message: "No active subscription found to cancel",
      },
      { status: 400 }
    ));
  }

  const subscription = appSubscriptions[0];
  const subscriptionId = subscription.id;

  console.log("Cancelling subscription:", {
    id: subscriptionId,
    name: subscription.name,
    status: subscription.status,
  });

  // 2. Cancel the subscription
  const cancelledSubscription = await billing.cancel({
    subscriptionId,
    prorate: true,
  });

  console.log("Cancelled subscription result:", cancelledSubscription);

  // 3. Update your own record of the shop
  await ShopModel.updateByDomain(session.shop, {
    appPlan: "Free",
    videoViewLimit: VIDEO_VIEW_LIMITS.free,
    videoUploadLimit: VIDEO_UPLOAD_LIMITS.free,
  });

  return new Response(JSON.stringify({
    cancelSubscription: cancelledSubscription,
    message: "Subscription cancelled successfully",
  }), { status: 200 });
};