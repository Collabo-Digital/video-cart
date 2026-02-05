/**
 * Web Pixel helpers (Admin GraphQL)
 *
 * Notes:
 * - Shopify validates settings against your extension's `shopify.extension.toml`
 *   (for example: `extensions/video-cart-pixel/shopify.extension.toml`)
 * - If required keys are missing (or empty), `webPixelCreate` returns userErrors
 * - The Admin API has `webPixel` (singular, by ID) and `webPixelCreate`; there is
 *   no `webPixels` list query in the current schema, so we only use create.
 */

export async function createWebPixel(admin, settings) {
    const mutation = [
        "mutation WebPixelCreate($webPixel: WebPixelInput!) {",
        "  webPixelCreate(webPixel: $webPixel) {",
        "    userErrors {",
        "      field",
        "      message",
        "      code",
        "    }",
        "    webPixel {",
        "      id",
        "      settings",
        "    }",
        "  }",
        "}",
    ].join("\n");

    const response = await admin.graphql(mutation, {
        variables: { webPixel: { settings } },
    });

    const json = await response.json();
    return json?.data?.webPixelCreate;
}

/**
 * Ensure a web pixel record exists for this app on the shop.
 * Creating this record is what activates the app pixel in Customer Events.
 * Uses only webPixelCreate (no list query - webPixels is not in the Admin API).
 */
export async function ensureWebPixelInstalled(admin, settings) {
    const payload = await createWebPixel(admin, settings);

    if (payload?.userErrors?.length) {
        // If pixel already exists, Shopify may return an error; treat as non-fatal.
        const messages = payload.userErrors.map((e) => e.message?.toLowerCase() ?? "");
        const alreadyExists = messages.some(
            (m) =>
                m.includes("already exists") ||
                m.includes("web pixel") ||
                m.includes("duplicate")
        );
        if (alreadyExists) {
            return { status: "exists", webPixel: null, userErrors: [] };
        }
        return { status: "error", webPixel: null, userErrors: payload.userErrors };
    }

    return { status: "created", webPixel: payload?.webPixel ?? null, userErrors: [] };
}