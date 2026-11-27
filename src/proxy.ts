import type { NextRequest } from "next/server";
import { decideRouteAccess } from "@/features/auth/auth-routing";
import { redirectWithSession, refreshProxySession } from "@/features/auth/proxy-session";

/**
 * Next.js 16 Proxy (formerly middleware): routing only (G16).
 * 1. A5 refresh the Supabase session cookies.
 * 2. (Phase 4) F003 launch-gate redirect.
 * 3. A6 sign-in redirect: anonymous visitors of protected paths go to Login with
 *    an internal return path; a signed-in visitor leaves `/login` unless an
 *    `error` param is shown (R22). No role check here; Go enforces roles.
 */
export async function proxy(request: NextRequest) {
  const session = await refreshProxySession(request);
  const { pathname, search, searchParams } = request.nextUrl;
  const decision = decideRouteAccess({
    pathname,
    search,
    signedIn: session.signedIn,
    hasErrorParam: searchParams.has("error"),
  });
  if (!decision) return session.response;
  return redirectWithSession(session, new URL(decision.redirect, request.url));
}

export const config = {
  matcher: [
    // Every request except Next internals and static files (images, icons, fonts).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
