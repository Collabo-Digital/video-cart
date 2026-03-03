  import {  authenticate } from "../../../../config/shopify.server";

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  let  shop = session.shop;
  shop = shop.replace(".myshopify.com", "");
  const { plan } = await request.json();
  const billingCheck = await billing.request({
    plan: plan,
    isTest: true,
    returnUrl: `https://admin.shopify.com/store/${shop}/apps/${process.env.SHOPIFY_APP_NAME}/app/pricing`,
  });


  const subscription = billingCheck.appSubscriptions[0];
 
  return { subscription };
};