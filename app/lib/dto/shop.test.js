/**
 * Guard test for the Shop client serializer.
 *
 * Requires a test runner (Vitest). None is configured in package.json yet
 * (see audit finding H11 — "no tests"). Once Vitest is added:
 *   npm i -D vitest
 *   add "test": "vitest" to package.json scripts
 * this file runs with `npm test` and permanently prevents the C0 token leak
 * from being reintroduced.
 */
import { describe, it, expect } from "vitest";
import { toClientShop } from "./shop";

describe("toClientShop", () => {
  const raw = {
    id: "abc123",
    shopDomain: "demo.myshopify.com",
    name: "Demo Store",
    email: "owner@demo.com",
    appPlan: "Pro",
    planLimits: { videoViewLimit: 1000, videoUploadLimit: 50 },
    crispObject: { crispTokenId: "tok" },
    accessToken: "shpat_super_secret_admin_token",
    refreshToken: "shpss_refresh",
  };

  it("never exposes the access token", () => {
    const out = toClientShop(raw);
    expect(out).not.toHaveProperty("accessToken");
    expect(out).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(out)).not.toContain("shpat_");
  });

  it("keeps the fields the UI needs", () => {
    const out = toClientShop(raw);
    expect(out).toMatchObject({
      appPlan: "Pro",
      planLimits: { videoUploadLimit: 50, videoViewLimit: 1000 },
      shopDomain: "demo.myshopify.com",
    });
  });

  it("returns null for a missing shop", () => {
    expect(toClientShop(null)).toBeNull();
    expect(toClientShop(undefined)).toBeNull();
  });
});
