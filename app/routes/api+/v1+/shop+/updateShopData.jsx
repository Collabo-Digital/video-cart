import { authenticate } from "../../../../config/shopify.server";
import { findByDomain, updateByDomain } from "../../../../models/shop.server";
import { captureRouteError } from "../../../../lib/utils/observability/errorCapture.js";

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    try {
        const shopData = await findByDomain(session.shop);
        if (!shopData) {
            return new Response(
                JSON.stringify({ error: 'Shop not found' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }
        const data = await request.json();
        const updatedShopData = await updateByDomain(session.shop, data);
        return new Response(
            JSON.stringify(updatedShopData),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error("Error updating shop data:", error);
        captureRouteError(error, {
            route: "shop-updateShopData",
            url: request.url,
            method: request.method,
            shop: session?.shop || 'unknown',
        });
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to update shop data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};