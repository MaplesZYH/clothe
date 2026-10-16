import { NextResponse } from "next/server";

export function middleware(): NextResponse {
  // Owner cookies are issued by the Node route handlers. Keeping middleware
  // edge-safe lets the static shell run before server secrets are configured.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
