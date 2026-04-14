import { authenticate } from "../../../../config/shopify.server";
import { findByDomain, updateByDomain } from "../../../../models/shop.server";
import { captureRouteError } from "~/lib/utils/observability/errorCapture";
import { apiError, apiSuccess } from "../../../../lib/utils/apiResponse.js";
export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    try {
        const shopData = await findByDomain(session.shop);
        if (!shopData) {
            return apiError(new Error('Shop not found'), {
                route: "shop-updateShopData",
                code: "SHOP_NOT_FOUND",
                statusCode: 404,
                requestId: request.id,
            });
        }
        const data = await request.json();
        const updatedShopData = await updateByDomain(session.shop, data);
        return apiSuccess({ updatedShopData }, {
            route: "shop-updateShopData",
            requestId: request.id,
        });
    } catch (error) {
        console.error("Error updating shop data:", error);
        captureRouteError(error, {
            route: "api.v1.shop.updateShopData",
            url: request.url,
            method: request.method,
            shop: session?.shop || 'unknown',
        });
        
        return apiError(error, {
            route: "shop-updateShopData",
            code: "FAILED_TO_UPDATE_SHOP_DATA",
            statusCode: 500,
            requestId: request.id,
        });
    }
};