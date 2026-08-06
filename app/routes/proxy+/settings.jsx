import { authenticate } from "../../config/shopify.server";
import { getAppSettingsFormDefaults } from "../../lib/constants/globalSettings";
import * as GlobalSettingsModel from "../../models/globalSettings.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const globalRecord = await GlobalSettingsModel.findByShopDomain(session.shop);
    const settings = getAppSettingsFormDefaults(globalRecord?.settings ?? null).settings;

    return Response.json({
      success: true,
      data: { settings },
    }, {
      // Per-shop (not per-shopper) data — safe to cache briefly. Every proxy hit
      // is otherwise an uncached round-trip through Shopify to a lambda to Mongo.
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    // authenticate.public.appProxy throws a Response (400) on an invalid
    // signature — framework control flow, not an error. Let it through.
    if (error instanceof Response) throw error;

    console.error("[Proxy Settings] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
};
