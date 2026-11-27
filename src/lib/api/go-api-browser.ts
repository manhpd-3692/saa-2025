"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { requestGoApi, type GoApiRequestInit } from "./go-api-request";

/**
 * Client Component call to the Go API with the browser session's Bearer token.
 * Rejects with `ApiError` (see api-error.ts).
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
    cache: "no-store",
  });
}
