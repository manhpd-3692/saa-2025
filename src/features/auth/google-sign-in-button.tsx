"use client";

import { useRef, useState } from "react";
import { GoogleGIcon } from "@/components/shell/shell-icons";
import { useLocale } from "@/i18n/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { buildCallbackUrl, COMPANY_EMAIL_DOMAIN } from "./auth-routing";

/**
 * F002 A2 LoginButton#signInWithGoogle: starts Supabase Google OAuth (PKCE).
 * The `hd` hint only pre-selects company accounts in Google's chooser; the
 * domain rule itself is enforced by the callback and by Go (BR-003).
 * Disabled after the first click so a double click starts one flow (FR-202);
 * the Google mark turns into a spinner while the browser leaves for Google.
 */
export function GoogleSignInButton({ next, label }: { next: string; label: string }) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // Guards a second click that lands before the disabled state renders.
  const started = useRef(false);

  async function signIn() {
    if (started.current) return;
    started.current = true;
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
      started.current = false;
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        aria-busy={pending}
        className="flex h-[60px] items-center gap-2 rounded-panel bg-primary px-6 text-[22px] font-bold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-wait"
      >
        {label}
        {pending ? (
          <span aria-hidden="true" className="size-6 animate-spin rounded-full border-[3px] border-on-primary/30 border-t-on-primary" />
        ) : (
          <GoogleGIcon size={24} />
        )}
        {pending && <span className="sr-only">{t("common.loading")}</span>}
      </button>
      {failed && (
        <p role="alert" className="mt-4 text-base font-semibold text-white">
          {t("error.generic")}
        </p>
      )}
    </div>
  );
}
