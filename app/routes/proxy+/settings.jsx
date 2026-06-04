import { authenticate } from "../../config/shopify.server";
import * as GlobalSettingsModel from "../../models/globalSettings.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const globalRecord = await GlobalSettingsModel.findByShopDomain(session.shop);

    return Response.json({
      success: true,
      data: { settings: globalRecord?.settings ?? null },
    });
  } catch (error) {
    console.error("[Proxy Settings] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
};
