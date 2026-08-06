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
        // Shopify returns code "TAKEN" when a web pixel already exists for this app
        // on the shop — that's benign. Any other code (INVALID_SETTINGS, BLANK,
        // INVALID_CONFIGURATION_JSON, NO_EXTENSION, UNEXPECTED_ERROR, …) is a real
        // failure that must surface — otherwise the pixel silently never installs
        // and revenue attribution never works.
        // Ref: https://shopify.dev/docs/api/admin-graphql/latest/enums/ErrorsWebPixelUserErrorCode
        const alreadyExists = payload.userErrors.some((e) => e.code === "TAKEN");
        if (alreadyExists) {
            return { status: "exists", webPixel: null, userErrors: [] };
        }
        return { status: "error", webPixel: null, userErrors: payload.userErrors };
    }

    return { status: "created", webPixel: payload?.webPixel ?? null, userErrors: [] };
}