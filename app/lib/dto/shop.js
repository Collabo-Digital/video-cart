/**
 * Server → client serializer for the Shop record.
 *
 * NEVER return a raw Shop object (or a Shopify `session`) from a loader — both
 * carry `accessToken`, the Admin API credential for the store. React Router
 * serializes loader return values into the HTML that runs in the merchant's
 * browser, so anything returned here is readable by any script on the origin.
 *
 * This allow-list IS the trust boundary: only the fields named below reach the
 * client. Adding a new secret column to the Shop model will NOT leak it, because
 * this function must be updated explicitly to expose any new field.
 *
 * @param {Object|null} shop - Raw Shop record from Prisma (or null)
 * @returns {Object|null} Token-free shape safe to send to the browser
 */
export function toClientShop(shop) {
  if (!shop) return null;
  return {
    id: shop.id,
    shopDomain: shop.shopDomain,
    name: shop.name,
    email: shop.email,
    appPlan: shop.appPlan,
    // planLimits holds only counters/limits (views, uploads, resetDate) — no secrets
    planLimits: shop.planLimits ?? null,
    // crispObject holds only the chat token id used to identify the merchant in support chat
    crispObject: shop.crispObject ?? null,
  };
}
