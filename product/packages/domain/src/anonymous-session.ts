import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const tokenVersion = "v1";

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAnonymousSessionToken(
  ownerId = randomUUID(),
  secret: string,
  expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30
): string {
  const payload = `${tokenVersion}.${ownerId}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyAnonymousSessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now()
): { ownerId: string; expiresAt: number } | null {
  if (!token) return null;
  const [version, ownerId, expiresAtText, providedSignature] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (version !== tokenVersion || !ownerId || !providedSignature || !Number.isSafeInteger(expiresAt)) return null;
  if (expiresAt <= now) return null;
  const expected = signature(`${version}.${ownerId}.${expiresAt}`, secret);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(providedSignature);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) return null;
  return { ownerId, expiresAt };
}
