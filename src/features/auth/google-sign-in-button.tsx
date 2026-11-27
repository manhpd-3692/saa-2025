"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { buildCallbackUrl, COMPANY_EMAIL_DOMAIN } from "./auth-routing";

/**
 * F002 A2 LoginButton#signInWithGoogle: starts Supabase Google OAuth (PKCE).
 * The `hd` hint only pre-selects company accounts in Google's chooser; the
 * domain rule itself is enforced by the callback and by Go (BR-003).
 * Disabled after the first click so a double click starts one flow.
 */
export function GoogleSignInButton({ next }: { next: string }) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildCallbackUrl(window.location.origin, next),
          queryParams: { hd: COMPANY_EMAIL_DOMAIN },
        },
      });
      if (error) throw error;
      // On success the browser is leaving for Google; stay disabled.
    } catch (error) {
      console.error("Google sign-in could not start", error);
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div>
      <button type="button" onClick={signIn} disabled={pending} aria-busy={pending}>
        {pending ? t("common.loading") : "LOGIN With Google"}
      </button>
      {failed && <p role="alert">{t("error.generic")}</p>}
    </div>
  );
}
