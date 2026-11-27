import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requestGoApi, type GoApiRequestInit } from "./go-api-request";

/** Server-side budget for any Go call (R23). */
export const GO_API_SERVER_TIMEOUT_MS = 5000;

/**
 * Server Component / layout call to the Go API.
 * Bearer comes from the Supabase cookie session; the Go API verifies it, so the
 * unverified `getSession()` token is only forwarded, never trusted here.
 * Calls are never cached. Rejects with `ApiError` (see api-error.ts).
 */
export async function goApiServer<T = unknown>(
  path: string,
  init?: GoApiRequestInit,
): Promise<T> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return requestGoApi<T>({
    baseUrl: process.env.API_BASE_URL,
    baseUrlEnvName: "API_BASE_URL",
    path,
    token: data.session?.access_token,
    init,
    timeoutMs: GO_API_SERVER_TIMEOUT_MS,
    cache: "no-store",
  });
}
