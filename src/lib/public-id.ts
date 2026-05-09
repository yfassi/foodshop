import { randomBytes } from "node:crypto";

// 16 bytes encoded as base64url → 22 URL-safe chars, ~128 bits of entropy.
export function generatePublicId() {
  return randomBytes(16).toString("base64url");
}
