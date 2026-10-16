import { createAnonymousSessionToken, verifyAnonymousSessionToken } from "@outfit/domain/anonymous-session";

export const anonymousOwnerCookie = "outfit_owner_session";
const anonymousOwnerMaxAge = 60 * 60 * 24 * 30;

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const pair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1);
}

export function resolveOwnerContext(request: Request, secret: string): {
  ownerId: string;
  token: string;
  isNew: boolean;
} {
  const existingToken = getCookieValue(request.headers.get("cookie"), anonymousOwnerCookie);
  const existing = verifyAnonymousSessionToken(existingToken, secret);
  if (existing && existingToken) return { ownerId: existing.ownerId, token: existingToken, isNew: false };

  const token = createAnonymousSessionToken(undefined, secret);
  const session = verifyAnonymousSessionToken(token, secret);
  if (!session) throw new Error("Unable to create anonymous owner session.");
  return { ownerId: session.ownerId, token, isNew: true };
}

export function ownerCookieHeader(token: string, secure: boolean): string {
  return `${anonymousOwnerCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${anonymousOwnerMaxAge}${secure ? "; Secure" : ""}`;
}
