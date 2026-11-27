"use client";

import { useEffect } from "react";
import { PROFILE_UNAVAILABLE_LOGIN_PATH } from "@/lib/api/profile-recovery";
import { endBrowserSession } from "./sign-out-action";

/**
 * End the session in the browser after a failed missing-profile recovery
 * (Codex R22): sign out (the session cookies are removed even when Supabase
 * Auth does not answer), then replace the page with the Login error, which
 * `proxy.ts` keeps on screen.
 */
export async function signOutToProfileUnavailable(): Promise<void> {
  await endBrowserSession();
  window.location.replace(PROFILE_UNAVAILABLE_LOGIN_PATH);
}

/**
 * Rendered alone (no chrome, no children) by a Server Component layout whose
 * server-side recovery failed: Server Components cannot clear cookies, so the
 * browser does it (Codex N06). Used by the `(shell)` and admin layouts.
 */
export function ProfileRecoveryRedirect() {
  useEffect(() => {
    void signOutToProfileUnavailable();
  }, []);
  return null;
}
