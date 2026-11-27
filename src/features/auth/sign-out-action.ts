"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { LOGIN_PATH } from "./auth-routing";
import { supabaseSessionCookieNames } from "./session-cookie-names";

/** Same budget as every other backend wait (Codex R23). */
const SIGN_OUT_BUDGET_MS = 5000;

/**
 * Ends the session in this browser: Supabase `signOut` (scope local) revokes it
 * in Auth and removes the session cookies. When Auth fails or does not answer
 * within 5 s, supabase-js keeps the cookies, so they are expired here instead;
 * the browser is signed out either way (FR-402) and no click hangs.
 */
export async function endBrowserSession(): Promise<void> {
  try {
    const result = await Promise.race([
      createSupabaseBrowserClient().auth.signOut({ scope: "local" }),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), SIGN_OUT_BUDGET_MS)),
    ]);
    if (result === "timeout") console.error("sign-out: no answer from Supabase Auth within 5 s");
    else if (result.error) console.error("sign-out failed", result.error.message);
  } catch (error) {
    console.error("sign-out failed", error);
  }
  for (const name of supabaseSessionCookieNames(document.cookie)) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

/**
 * F002 A4 AvatarMenu#signOut: end the browser session, then load Login with a
 * full page load so no Server Component output stays cached. Idempotent: an
 * already-expired session still ends on Login, and `proxy.ts` sends any later
 * protected request back to Login (FR-104, FR-402).
 */
export async function signOutToLogin(): Promise<void> {
  await endBrowserSession();
  window.location.replace(LOGIN_PATH);
}
