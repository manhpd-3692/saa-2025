"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { requestGoApi, type GoApiRequestInit } from "./go-api-request";

/** Same 5 s budget as the server client (R23): a hung call must not block its caller. */
export const BROWSER_API_TIMEOUT_MS = 5000;

/**
 * Client Component call to the Go API with the browser session's Bearer token.
 * Rejects with `ApiError` (see api-error.ts); a call slower than
 * `BROWSER_API_TIMEOUT_MS` rejects with the `timeout` code.
 */
export async function goApiBrowser<T = unknown>(
  path: string,
  init?: GoApiRequestInit,
): Promise<T> {
  const { data } = await createSupabaseBrowserClient().auth.getSession();
  return requestGoApi<T>({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    baseUrlEnvName: "NEXT_PUBLIC_API_BASE_URL",
    path,
    token: data.session?.access_token,
    init,
    timeoutMs: BROWSER_API_TIMEOUT_MS,
    cache: "no-store",
  });
}
