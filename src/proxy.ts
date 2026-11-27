import type { NextRequest } from "next/server";
import { decideRouteAccess } from "@/features/auth/auth-routing";
import { redirectWithSession, refreshProxySession } from "@/features/auth/proxy-session";
import { launchGateRedirect } from "@/lib/events/launch-gate";

/**
 * Next.js 16 Proxy (formerly middleware): routing only (G16).
 * 1. A5 refresh the Supabase session cookies (in parallel with step 2's lookup).
 * 2. F003 A1 launch gate, before any sign-in rule (FR-601): before the event
 *    start, non-exempt pages go to `/countdown` (307); an unreadable event
 *    lets the request through within 1.5 s (D003, Codex R23).
 * 3. A6 sign-in redirect: anonymous visitors of protected paths go to Login with
 *    an internal return path; a signed-in visitor leaves `/login` unless an
 *    `error` param is shown (R22). No role check here; Go enforces roles.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const [session, launchRedirect] = await Promise.all([
    refreshProxySession(request),
    launchGateRedirect(pathname),
  ]);
  if (launchRedirect) return redirectWithSession(session, new URL(launchRedirect, request.url));

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
