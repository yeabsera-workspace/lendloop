/**
 * HMAC-SHA256 helpers for Convex ↔ n8n signed requests.
 * Uses Web Crypto (available in Convex runtime).
 */

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload(
  secret: string,
  body: string,
  timestamp: string,
): Promise<string> {
  const key = await importKey(secret);
  const message = `${timestamp}.${body}`;
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toHex(sig);
}

export async function verifySignature(
  secret: string,
  body: string,
  timestamp: string,
  signature: string,
  maxSkewMs = 5 * 60 * 1000,
): Promise<boolean> {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts) > maxSkewMs) return false;

  const expected = await signPayload(secret, body, timestamp);
  if (expected.length !== signature.length) return false;

  // Constant-time-ish compare
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getWebhookSecret(): string {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("N8N_WEBHOOK_SECRET is not configured");
  }
  return secret;
}
