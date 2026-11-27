"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signOutToProfileUnavailable } from "@/features/auth/profile-recovery-redirect";
import { goApiBrowser } from "@/lib/api/go-api-browser";
import { PROVISION_PATH } from "@/lib/api/profile-recovery";
import { ME_PATH, resolveSessionSummary, type SessionUser } from "@/lib/auth/session-summary";

const SessionUserContext = createContext<SessionUser | null>(null);

/**
 * F001 MeRefresher: holds the signed-in Sunner the layout read from Go `/me`
 * and re-reads it from the browser when the window regains focus, so the
 * avatar, name and Admin item follow a role change without a reload (FR-601,
 * Codex R07). A failed missing-profile recovery signs out (R22); a transient
 * failure keeps the last known state. Go still guards every admin call.
 */
export function MeRefresher({ initialUser, children }: { initialUser: SessionUser | null; children: ReactNode }) {
  const [state, setState] = useState({ from: initialUser, user: initialUser });
  // A new server render (navigation refresh, language switch) brings a fresher user.
  if (state.from !== initialUser) setState({ from: initialUser, user: initialUser });

  useEffect(() => {
    let inFlight = false;
    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const summary = await resolveSessionSummary({
          hasSession: true,
          fetchMe: () => goApiBrowser(ME_PATH),
          provision: () => goApiBrowser(PROVISION_PATH, { method: "POST" }),
        });
        if (summary.kind === "signed-in") setState((s) => ({ ...s, user: summary.user }));
        else if (summary.kind === "signed-out") setState((s) => ({ ...s, user: null }));
        else if (summary.kind === "profile-missing") await signOutToProfileUnavailable();
      } catch (error) {
        console.error("session refresh on focus failed", error);
      } finally {
        inFlight = false;
      }
    }
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  return <SessionUserContext value={state.user}>{children}</SessionUserContext>;
}

/** The signed-in Sunner for the header controls; null when signed out or unknown. */
export function useSessionUser(): SessionUser | null {
  return useContext(SessionUserContext);
}
