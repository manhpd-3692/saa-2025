"use client";

import { useEffect } from "react";
import { PROFILE_UNAVAILABLE_LOGIN_PATH } from "@/lib/api/profile-recovery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

/**
 * End the session in the browser after a failed missing-profile recovery
 * (Codex R22): await the Supabase sign-out, which removes the session cookies,
 * then replace the page with the Login error. A sign-out failure still
 * navigates, and `proxy.ts` keeps `/login?error=…` on screen either way.
 */
export async function signOutToProfileUnavailable(): Promise<void> {
  try {
    const { error } = await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    if (error) console.error("sign-out after failed profile recovery", error.message);
  } catch (error) {
    console.error("sign-out after failed profile recovery", error);
  }
  window.location.replace(PROFILE_UNAVAILABLE_LOGIN_PATH);
}

/**
 * Rendered alone (no chrome, no children) by a Server Component layout whose
 * server-side recovery failed: Server Components cannot clear cookies, so the
 * browser does it (Codex N06). Wired into the layouts in Phase 3.
 */
export function ProfileRecoveryRedirect() {
  useEffect(() => {
    void signOutToProfileUnavailable();
  }, []);
  return null;
}
