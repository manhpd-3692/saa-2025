import type { ReactNode } from "react";
import { ForbiddenPage } from "@/components/errors/forbidden-page";
import { ServiceUnavailableNotice } from "@/components/errors/service-unavailable-notice";
import { AdminChrome } from "@/components/shell/admin-chrome";
import { MeRefresher } from "@/components/shell/me-refresher";
import { MinimalChrome } from "@/components/shell/minimal-chrome";
import { ShellActionsProvider } from "@/components/shell/shell-actions-context";
import { ProfileRecoveryRedirect } from "@/features/auth/profile-recovery-redirect";
import { GamificationShellHost } from "@/features/gamification/gamification-shell-host";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";
import { getSessionSummary } from "@/lib/auth/get-session-summary";

// Blocks on Go `/me` (role gate); nothing here can be prerendered.
export const instant = false;

/**
 * F002 A7 AdminLayout#requireAdmin + F001 admin chrome. `proxy.ts` already sent
 * anonymous visitors to Login; here Go `/me` (no-store, 5 s) decides the
 * chrome: admin → admin chrome and the page; any other answer → the plain
 * Forbidden page in the minimal chrome (AD15, R18; status not asserted).
 * Cosmetic gate only: every `/api/v1/admin/...` call is refused by Go `RequireAdmin`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const summary = await getSessionSummary();

  if (summary.kind === "profile-missing") return <ProfileRecoveryRedirect />;
  if (summary.kind === "unavailable") {
    return (
      <MinimalChrome>
        <ServiceUnavailableNotice />
      </MinimalChrome>
    );
  }
  if (summary.kind === "signed-in" && summary.user.role === "admin") {
    const locale = await getRequestLocale();
    const gamificationDictionary = await loadDictionaries(locale, ["common", "gamification"]);
    // An admin is a Sunner too and earns Secret Boxes (F008): the F008 host is mounted here as
    // well, so a Secret Box notice in the admin bell opens the box window (F009 DEC-002).
    return (
      <ShellActionsProvider>
        <MeRefresher initialUser={summary.user}>
          <AdminChrome>{children}</AdminChrome>
          <GamificationShellHost locale={locale} dictionary={gamificationDictionary} />
        </MeRefresher>
      </ShellActionsProvider>
    );
  }
  return (
    <MinimalChrome>
      <ForbiddenPage />
    </MinimalChrome>
  );
}
