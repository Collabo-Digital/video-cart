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
        const body = await request.json();

        // Allow-list: the only field a client may write here is the Crisp chat
        // token id (set by initCrisp). Plan, limits, isActive, shopDomain, etc.
        // must NEVER be client-writable — those are driven by billing/onboarding.
        const allowed = {};
        if (body?.crispObject && typeof body.crispObject === "object") {
            allowed.crispObject = { crispTokenId: String(body.crispObject.crispTokenId ?? "") };
        }

        if (Object.keys(allowed).length === 0) {
            return apiError(new Error("No permitted fields to update"), {
                route: "shop-updateShopData",
                code: "NO_PERMITTED_FIELDS",
                statusCode: 400,
                requestId: request.id,
            });
        }

        await updateByDomain(session.shop, allowed);
        return apiSuccess({ ok: true }, {
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