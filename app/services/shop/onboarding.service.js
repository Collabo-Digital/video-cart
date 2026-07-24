// app/services/shop/onboarding.service.js

/**
 * Shop Onboarding Service
 *
 * Handles shop installation and onboarding workflow.
 */

import * as ShopModel from "../../models/shop.server";
import { ensureWebPixelInstalled } from "../../lib/utils/webPixel";
import {
  VIDEO_UPLOAD_LIMITS,
  VIDEO_VIEW_LIMITS,
} from "../../lib/constants/common";
import { notifyShopInstall } from "../../lib/utils/slack.server";
import { getNextResetDate } from "../../lib/utils/common";

/**
 * Handle post-authentication tasks
 * @param {Object} params - Parameters
 * @param {Object} params.session - Shopify session
 * @param {Object} params.admin - Shopify admin API
 * @returns {Promise<Object|null>} Saved shop object
 */
export async function doTaskAfterAuth({ session, admin }) {
  if (!session || !session.shop) {
    console.error("Invalid session: missing shop domain");
    return null;
  }

  if (!admin) {
    console.error("Admin object is required");
    return null;
  }

  try {
    // Fetch shop details from Shopify
    let response;
    try {
      response = await admin.graphql(`
        query getShopDetails {
          shop {
            id
            name
            email
            contactEmail
            shopOwnerName
            billingAddress  {
              address1
              address2
              city
              province
              zip
              country
              latitude
              longitude
              phone
            }
            plan {
              displayName
              partnerDevelopment
              shopifyPlus
            }
          }
        }
      `);
    } catch (graphqlError) {
      console.error("GraphQL request failed:", graphqlError);
      throw new Error(`Failed to fetch shop details: ${graphqlError.message}`);
    }

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Failed to parse GraphQL response:", parseError);
      throw new Error("Invalid response format from Shopify API");
    }

    const shop = data?.data?.shop;
    console.log("Shop Details fetched successfully:", {
      id: shop?.id,
      name: shop?.name,
      domain: session.shop,
    });

    if (!shop || !shop.id) {
      throw new Error("Shop ID is missing from Shopify response");
    }

    // Load existing shop from DB so we can preserve existing values
    let existingShop = null;
    try {
      existingShop = await ShopModel.findByDomain(session.shop);
    } catch (findError) {
      console.error("Error fetching existing shop from database:", {
        error: findError.message,
        shopDomain: session.shop,
      });
      // Non‑fatal: treat as if shop does not exist
    }

    // Merge plan limits:
    // - If DB already has values, keep them
    // - Otherwise initialize sensible defaults
    const existingPlanLimits = existingShop?.planLimits || {};
    const planLimits = {
      videoViewLimit:
        existingPlanLimits.videoViewLimit ?? VIDEO_VIEW_LIMITS.free,
      videoUploadLimit:
        existingPlanLimits.videoUploadLimit ?? VIDEO_UPLOAD_LIMITS.free,
      // Preserve DB flag if present; only default to false when no record yet
      videoViewLimitReached: existingPlanLimits.videoViewLimitReached ?? false,
      videoUploadLimitReached: existingPlanLimits.videoUploadLimitReached ?? false,
      // Preserve existing resetDate, otherwise set a new cycle
      resetDate:
        existingPlanLimits.resetDate ??
        getNextResetDate(new Date()).toISOString(),
    };

    // Build upsert payload:
    // - Use latest Shopify data when present
    // - Fall back to existing DB values
    // - Only initialize defaults when there is no existing record
    const savedShop = await ShopModel.upsertByDomain(session.shop, {
      shopId: shop.id,

      // Basic info: Shopify → existing DB → null
      name: shop.name || existingShop?.name || null,
      email: shop.email || existingShop?.email || null,
      contactEmail: shop.contactEmail || existingShop?.contactEmail || null,

      // Plan info: Shopify → existing DB → fallback
      planDisplayName:
        shop.plan?.displayName || existingShop?.planDisplayName || null,
      partnerDevelopment:
        shop.plan?.partnerDevelopment ??
        existingShop?.partnerDevelopment ??
        false,
      shopifyPlus: shop.plan?.shopifyPlus ?? existingShop?.shopifyPlus ?? false,

      shopOwnerName: shop.shopOwnerName || existingShop?.shopOwnerName || null,
      shopAddress1: shop.shopAddress?.address1 || existingShop?.shopAddress1 || null,
      shopAddress2: shop.shopAddress?.address2 || existingShop?.shopAddress2 || null,
      shopCity: shop.shopAddress?.city || existingShop?.shopCity || null,
      shopProvince: shop.shopAddress?.province || existingShop?.shopProvince || null,
      shopZip: shop.shopAddress?.zip || existingShop?.shopZip || null,
      shopCountry: shop.shopAddress?.country || existingShop?.shopCountry || null,
      shopLatitude: shop.shopAddress?.latitude || existingShop?.shopLatitude || null,
      shopLongitude: shop.shopAddress?.longitude || existingShop?.shopLongitude || null,
      shopPhone: shop.shopAddress?.phone || existingShop?.shopPhone || null,
      // App specific:
      // - isActive: keep existing, default to true on first install
      // - installedAt: never overwrite once set
      // - appPlan: preserve DB plan (user upgrades) and only set "Free" initially
      isActive: true,
      installedAt: existingShop?.installedAt ?? new Date(),
      appPlan: existingShop?.appPlan ?? "Free",
      planLimits,
    });

    console.log("Shop saved to database successfully:", {
      id: savedShop.id,
      shopDomain: savedShop.shopDomain,
      name: savedShop.name,
    });

    if (!existingShop) {
      notifyShopInstall({
        shopDomain: session.shop,
        name: shop.name,
        email: shop.email || shop.contactEmail,
        plan: shop.plan?.displayName,
      });
    }

    // Ensure app pixel is activated (creates web pixel record once per shop)
    // apiBaseUrl lets the pixel POST to the app (pixel cannot call same-origin store).
    const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
    const pixelResult = await ensureWebPixelInstalled(admin, {
      accountID: session.shop,
      ...(appUrl ? { apiBaseUrl: appUrl } : {}),
    });

    if (pixelResult?.status === "error") {
      console.error("Failed to create web pixel", pixelResult.userErrors);
    } else {
      console.log("Web pixel status:", pixelResult.status);
    }

    return savedShop;
  } catch (error) {
    console.error("Error in doTaskAfterAuth:", {
      message: error.message,
      stack: error.stack,
      shopDomain: session?.shop,
      timestamp: new Date().toISOString(),
    });

    return null;
  }
}
