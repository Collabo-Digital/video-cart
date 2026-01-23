/**
 * Shop Onboarding Service
 * 
 * Handles shop installation and onboarding workflow.
 */

import * as ShopModel from '../../models/shop.server';

/**
 * Handle post-authentication tasks
 * @param {Object} params - Parameters
 * @param {Object} params.session - Shopify session
 * @param {Object} params.admin - Shopify admin API
 * @returns {Promise<Object>} Saved shop object
 */
export async function doTaskAfterAuth({ session, admin }) {
  console.log('DO TASK AFTER AUTH PROCESS', session);

  if (!session || !session.shop) {
    console.error('Invalid session: missing shop domain');
    return null;
  }

  if (!admin) {
    console.error('Admin object is required');
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
            plan {
              displayName
              partnerDevelopment
              shopifyPlus
            }
          }
        }
      `);
    } catch (graphqlError) {
      console.error('GraphQL request failed:', graphqlError);
      throw new Error(`Failed to fetch shop details: ${graphqlError.message}`);
    }

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse GraphQL response:', parseError);
      throw new Error('Invalid response format from Shopify API');
    }

    const shop = data.data.shop;
    console.log('Shop Details fetched successfully:', {
      id: shop.id,
      name: shop.name,
      domain: session.shop
    });

    if (!shop.id) {
      throw new Error('Shop ID is missing from Shopify response');
    }

    // Save or update shop in database
    let savedShop;
    try {
      savedShop = await ShopModel.upsertByDomain(session.shop, {
        shopId: shop.id,
        name: shop.name || null,
        email: shop.email || null,
        contactEmail: shop.contactEmail || null,
        accessToken: session.accessToken,

        // Plan Info
        planDisplayName: shop.plan?.displayName || null,
        partnerDevelopment: shop.plan?.partnerDevelopment || false,
        shopifyPlus: shop.plan?.shopifyPlus || false,

        // App specific
        isActive: true,
        installedAt: new Date(),
      });

      console.log('Shop saved to database successfully:', {
        id: savedShop.id,
        shopDomain: savedShop.shopDomain,
        name: savedShop.name
      });

      return savedShop;

    } catch (dbError) {
      console.error('Database error while saving shop:', {
        error: dbError.message,
        code: dbError.code,
        shopDomain: session.shop
      });

      throw new Error(`Failed to save shop to database: ${dbError.message}`);
    }

  } catch (error) {
    console.error('Error in doTaskAfterAuth:', {
      message: error.message,
      stack: error.stack,
      shopDomain: session?.shop,
      timestamp: new Date().toISOString()
    });

    return null;
  }
}
