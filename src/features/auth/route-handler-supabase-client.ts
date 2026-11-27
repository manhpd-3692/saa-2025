import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "./supabase-public-env";

/**
 * Cookie-writing Supabase client for the `/auth/callback` Route Handler (A3):
 * per the installed Next.js guide, `cookies().set` works in a Route Handler,
 * and the writes land on the handler's response. Server Components use the
 * read-only client in `src/lib/supabase/server-client.ts` instead.
 */
export async function createRouteHandlerSupabaseClient(): Promise<SupabaseClient> {
  const { url, publishableKey } = supabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
