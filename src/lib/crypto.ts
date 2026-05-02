/**
 * Key-prefixed base64 encoding for stored GitHub access tokens.
 */

import { env } from "@/env";

function getKey(): string {
  return env.GITHUB_TOKEN_ENCRYPTION_KEY;
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
