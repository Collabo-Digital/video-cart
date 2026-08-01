/**
 * POST /webhooks/app/scopes_update
 * 
 * Handles app scopes update webhook from Shopify.
 */

import { authenticate } from "../../config/shopify.server";
import * as SessionModel from "../../models/session.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  if (session) {
    await SessionModel.updateScope(session.id, current.toString());
  }

  return new Response();
};
