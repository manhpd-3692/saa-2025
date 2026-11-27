import "server-only";
import { connection } from "next/server";
import { goApiServer } from "@/lib/api/go-api-server";
import { PROVISION_PATH } from "@/lib/api/profile-recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { ME_PATH, resolveSessionSummary, type SessionSummary } from "./session-summary";

/**
 * Server-side session summary for the `(shell)` and admin layouts (F001 A1,
 * F002 A7/A8): Go `/me` with the cookie session's Bearer token, `no-store`, 5 s
 * timeout (`goApiServer`). No session cookie → no call. The layout never writes
 * cookies; a `profile-missing` result is rendered as `ProfileRecoveryRedirect`.
 */
export async function getSessionSummary(): Promise<SessionSummary> {
  // Request time only: the session check reads the clock (token expiry) and /me is per request.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return resolveSessionSummary({
    hasSession: Boolean(data.session?.access_token),
    fetchMe: () => goApiServer(ME_PATH),
    provision: () => goApiServer(PROVISION_PATH, { method: "POST" }),
  });
}
