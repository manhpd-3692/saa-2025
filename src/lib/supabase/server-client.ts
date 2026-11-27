import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the request cookies (publishable key only).
 * It is read-only: Server Components cannot write cookies, so `setAll` is a no-op here
 * and a token this client refreshes in memory is never persisted.
 *
 * Session refresh and cookie writes live elsewhere (F002 A5, Phase 2):
 * - `proxy.ts` refreshes the session and writes the renewed cookies;
 * - `/auth/callback` needs its own cookie-writing client (this one cannot serve a route handler).
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {
        // Intentionally a no-op: Server Components cannot set cookies (see above).
      },
    },
  });
}
