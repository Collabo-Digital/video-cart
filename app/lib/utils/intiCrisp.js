import { Crisp } from "crisp-sdk-web";

/**
 * Initialize Crisp chat.
 *
 * The session token id and the email verification signature are generated on
 * the server (see crispToken.server.js) and passed in — never derived in the
 * browser, so they cannot be forged.
 *
 * @param {Object} shopData - Token-free shop DTO
 * @param {{ tokenId?: string|null, emailHmac?: string|null }} [crisp] - Server-generated values
 */
export const initCrisp = (shopData, crisp) => {
    const websiteId = 'e841739d-077d-4871-8147-8150673f9141'; // Crisp Website ID (public by design)

    if (!websiteId || typeof websiteId !== "string") {
        return;
    }

    Crisp.configure(websiteId);

    if (shopData?.email) {
        // Second arg is Crisp's Identity Verification signature; without it the
        // identity is unverified.
        Crisp.user.setEmail(shopData.email, crisp?.emailHmac || undefined);
    }
    if (shopData?.name) {
        Crisp.user.setNickname(shopData.name);
    }

    Crisp.session.setData({
        user_id: shopData?.id,
        shop_domain: shopData?.shopDomain,
    });

    if (crisp?.tokenId) {
        Crisp.setTokenId(crisp.tokenId);
    }
};
