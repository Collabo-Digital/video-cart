import crypto from "node:crypto";

// const SECRET = import.meta.env.CRISP_TOKEN_SECRET || import.meta.env.SESSION_SECRET;
const SECRET = 'test_secret';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGO = "aes-256-gcm";

function getKey() {
    const raw = SECRET || "";
    return crypto.createHash("sha256").update(raw).digest();
}

export function generateCrispToken(shopId) {
    if (!SECRET) throw new Error("CRISP_TOKEN_SECRET or SESSION_SECRET required");
    if (!shopId) return null;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(String(shopId), "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, enc]).toString("base64url");
}

export function decryptCrispToken(token) {
    if (!SECRET || !token) return null;
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const enc = buf.subarray(IV_LENGTH + 16);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc) + decipher.final("utf8");
}