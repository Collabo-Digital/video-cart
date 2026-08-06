/**
 * Crisp identity helpers (server-only).
 *
 * Both values are derived with a server-held secret so they cannot be forged in
 * the browser. Previously the session token was an UNKEYED SHA-256 of the shop
 * id computed client-side, which meant anyone who learned a shop's internal id
 * could compute the same token and resume that merchant's support conversation.
 *
 * The token is deterministic (same shop id + secret => same token), so it never
 * needs to be persisted in the database.
 */
/* global process */

import crypto from "node:crypto";

/**
 * Unguessable Crisp session token id for a shop.
 * @param {string} shopId - Internal Shop record id
 * @returns {string|null} Hex HMAC, or null when the secret/shopId is missing
 */
export function generateCrispTokenId(shopId) {
  const secret = process.env.CRISP_TOKEN_SECRET;
  if (!secret || !shopId) return null;
  return crypto.createHmac("sha256", secret).update(String(shopId)).digest("hex");
}

/**
 * Crisp Identity Verification signature: HMAC-SHA256 of the user's email using
 * the secret from the Crisp dashboard (Settings -> Identity Verification).
 * Without it, Crisp treats the identity as unverified.
 * @param {string} email - Merchant email
 * @returns {string|null} Hex HMAC, or null when the secret/email is missing
 */
export function generateCrispEmailHmac(email) {
  const secret = process.env.CRISP_IDENTITY_SECRET;
  if (!secret || !email) return null;
  return crypto.createHmac("sha256", secret).update(String(email)).digest("hex");
}
