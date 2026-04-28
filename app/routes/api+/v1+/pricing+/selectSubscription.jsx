import { authenticate } from "../../../../config/shopify.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import { apiError, apiSuccess } from "../../../../lib/utils/apiResponse";


const ROUTE = "pricing-selectSubscription";


const getStoreSlug = (shop) => shop.replace(".myshopify.com", "");


export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  // try {
    const { plan } = await request.json();
    const storeSlug = getStoreSlug(session.shop);

    console.log("plan ----->", plan);
    console.log("storeSlug ----->", storeSlug);
    console.log("returnUrl ----->", `https://admin.shopify.com/store/${storeSlug}/apps/${process.env.SHOPIFY_APP_NAME}/app/pricing`);

    const billingResponse = await billing.request({
      plan,
      isTest: false,
      returnUrl: `https://admin.shopify.com/store/${storeSlug}/apps/${process.env.SHOPIFY_APP_NAME}/app/pricing`,
    });

    const subscription = billingResponse.appSubscriptions[0];

    return apiSuccess({ subscription });
  // } catch (error) {
  //   captureRouteError(error, {
  //     route: ROUTE,
  //     url: request.url,
  //     method: request.method,
  //     shop: session?.shop ?? "unknown",
  //   });

  //   return apiError(error, {
  //     route: ROUTE,
  //     code: "SELECT_SUBSCRIPTION_ERROR",
  //     statusCode: 500,
  //     requestId: request.id,
  //   });
  // }
};