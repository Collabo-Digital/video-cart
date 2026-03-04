import { APP_BILLING_PLANS_NAMES } from "../../../../lib/constants/common";
import { authenticate } from "../../../../config/shopify.server";

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const billingCheck = await billing.check({
    plans: APP_BILLING_PLANS_NAMES,
  });
  console.log("billingCheck ----->", billingCheck);
  return { billingCheck };
};