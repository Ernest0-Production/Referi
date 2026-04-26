/**
 * Key-prefixed base64 encoding for stored GitHub access tokens.
 * In production, set GITHUB_TOKEN_ENCRYPTION_KEY to a string of at least 32 characters.
 */

function getKey(): string {
  const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    if (process.env.NODE_ENV !== "production") {
      return "dev-placeholder-key-not-for-production!";
    }
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must be set and at least 32 chars");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const combined = `${key.slice(0, 8)}:${plaintext}`;
  return Buffer.from(combined).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64").toString("utf-8");
  const prefix = `${key.slice(0, 8)}:`;
  if (!combined.startsWith(prefix)) {
    throw new Error("Invalid token format");
  }
  return combined.slice(prefix.length);
}
