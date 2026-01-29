/**
 * POST /webhooks/app/uninstalled
 * 
 * Handles app uninstall webhook from Shopify.
 */

import { authenticate } from "../../config/shopify.server";
import * as SessionModel from "../../models/session.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await SessionModel.deleteByShop(shop);
  }

  return new Response();
};
