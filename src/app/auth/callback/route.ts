import { NextResponse, type NextRequest } from "next/server";
import { isApiError } from "@/lib/api/api-error";
import { requestGoApi } from "@/lib/api/go-api-request";
import { GO_API_SERVER_TIMEOUT_MS } from "@/lib/api/go-api-server";
import { PROVISION_PATH } from "@/lib/api/profile-recovery";
import {
  isCompanyEmail,
  loginErrorPath,
  safeNext,
  type LoginErrorReason,
} from "@/features/auth/auth-routing";
import { createRouteHandlerSupabaseClient } from "@/features/auth/route-handler-supabase-client";

/**
 * F002 A3 AuthCallbackRoute#GET — the only Next route handler (G16).
 * Exchange the OAuth code for a cookie session, refuse non-company emails
 * (fast path; Go repeats BR-003), provision the profile in Go (A9, 5 s
 * timeout, R23), then redirect to the re-validated return path (BR-002).
 * Every failure signs the session out and lands on Login with a reason key.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  const providerError = searchParams.get("error");
  if (providerError) {
    return redirectTo(loginErrorPath(providerError === "access_denied" ? "cancelled" : "failed"));
  }
  const code = searchParams.get("code");
  if (!code) return redirectTo(loginErrorPath("failed"));

  const supabase = await createRouteHandlerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return redirectTo(loginErrorPath("failed")); // reused or invalid code

  const fail = async (reason: LoginErrorReason) => {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) console.error("auth callback: sign out after refusal failed", signOutError.message);
    return redirectTo(loginErrorPath(reason));
  };

  if (!isCompanyEmail(data.session.user.email)) return fail("domain_not_allowed");
  try {
    await requestGoApi({
      baseUrl: process.env.API_BASE_URL,
      baseUrlEnvName: "API_BASE_URL",
      path: PROVISION_PATH,
      token: data.session.access_token,
      init: { method: "POST" },
      timeoutMs: GO_API_SERVER_TIMEOUT_MS,
      cache: "no-store",
    });
  } catch (provisionError) {
    const refused =
      isApiError(provisionError) && provisionError.status === 403 && provisionError.code === "domain_not_allowed";
    if (!refused) console.error("auth callback: provision failed", provisionError);
    return fail(refused ? "domain_not_allowed" : "failed");
  }
  return redirectTo(safeNext(searchParams.get("next")));
}
