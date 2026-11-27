import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "./supabase-public-env";

export interface ProxySession {
  /** The pass-through response carrying any refreshed session cookies. */
  response: NextResponse;
  /** A JWKS-verified, unexpired access token is present. */
  signedIn: boolean;
}

/**
 * F002 A5 SessionProxy#refreshSession, run first in `proxy.ts`: verify the
 * access token locally against the Supabase JWKS (`getClaims`), renewing it
 * with the refresh token when close to expiry, and write the renewed cookies
 * (and the no-cache headers the library asks for) onto the response. No Go
 * call, no database. Any failure counts as anonymous.
 */
export async function refreshProxySession(request: NextRequest): Promise<ProxySession> {
  const { url, publishableKey } = supabasePublicEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  try {
    const { data, error } = await supabase.auth.getClaims();
    return { response, signedIn: !error && typeof data?.claims?.sub === "string" };
  } catch {
    return { response, signedIn: false };
  }
}

/** A redirect that keeps the cookies and cache headers the refresh wrote. */
export function redirectWithSession(session: ProxySession, location: URL): NextResponse {
  const redirect = NextResponse.redirect(location);
  for (const cookie of session.response.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["Cache-Control", "Expires", "Pragma"]) {
    const value = session.response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
