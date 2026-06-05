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
    });
  } catch (error) {
    console.error("[Proxy Settings] Error:", error);
    return Response.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
};
