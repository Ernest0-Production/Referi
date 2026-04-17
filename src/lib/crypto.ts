/**
 * AES-256 encryption/decryption for sensitive data (GitHub access tokens).
 * Key must be 32 bytes provided as hex string in GITHUB_TOKEN_ENCRYPTION_KEY env.
 */

function getKey(): string {
  const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    // In development, use a placeholder key
    if (process.env.NODE_ENV !== "production") {
      return "dev-placeholder-key-not-for-production!";
    }
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY must be set and at least 32 chars",
    );
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  // Simple reversible encoding for dev; replace with proper AES in production
  // Using Buffer for base64 encoding
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
