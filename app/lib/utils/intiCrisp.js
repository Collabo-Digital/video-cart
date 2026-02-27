import { Crisp } from "crisp-sdk-web";
import { decryptCrispToken, generateCrispToken } from "./crispTokenEncrypter";

async function generateCrispTokenClient(shopId) {
    if (!shopId) return null;
    const data = new TextEncoder().encode(String(shopId));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Initialize Crisp chat with the website ID from shop settings.
 * crispObject.crispTokenId (or crispWebsiteId) = Crisp Website ID from dashboard (Setup → Website ID).
 */
export const initCrisp = async (shopData) => {
    const websiteId = 'e841739d-077d-4871-8147-8150673f9141'; // or crispWebsiteId, depending on what you store

    if (!websiteId || typeof websiteId !== "string") {
        return;
    }

    Crisp.configure(websiteId);

    if (shopData?.email) {
        Crisp.user.setEmail(shopData.email);
    }
    if (shopData?.name) {
        Crisp.user.setNickname(shopData.name);
    }
    Crisp.session.setData({
        user_id: shopData.id,
        shop_domain: shopData.shopDomain,
    });
    const crispToken = await generateCrispTokenClient(shopData.id);
    console.log("crispToken ----->", crispToken);
    Crisp.setTokenId(crispToken);

    await fetch('/api/v1/shop/updateShopData', {
        method: 'POST',
        body: JSON.stringify({
            crispObject: {
                crispTokenId: crispToken,
            },
        }),
    });

};