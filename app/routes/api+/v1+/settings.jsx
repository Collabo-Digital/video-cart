import * as GlobalSettingsModel from "../../../models/globalSettings.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";

export const loader = async ({ request }) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  };

  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return new Response(
        JSON.stringify({ success: false, error: "Shop parameter is required" }),
        { status: 400, headers }
      );
    }

    const globalRecord = await GlobalSettingsModel.findByShopDomain(shop);

    return new Response(
      JSON.stringify({
        success: true,
        data: { settings: globalRecord?.settings ?? null },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[Settings API] Error:", error);
    captureRouteError(error, {
      route: "settings-public",
      url: request.url,
      method: request.method,
    });
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to fetch settings" }),
      { status: 500, headers }
    );
  }
};
