import type { ReactNode } from "react";
import { FloatingActionButton } from "@/components/shell/floating-action-button";
import { MeRefresher } from "@/components/shell/me-refresher";
import { ShellActionsProvider } from "@/components/shell/shell-actions-context";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { ProfileRecoveryRedirect } from "@/features/auth/profile-recovery-redirect";
import { GamificationShellHost } from "@/features/gamification/gamification-shell-host";
import { KudoComposeHost } from "@/features/kudo-compose/kudo-compose-host";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";
import { getSessionSummary } from "@/lib/auth/get-session-summary";

// Blocks on Go `/me`: a missing profile must render no chrome at all (N06).
export const instant = false;

/** `display: contents` (no box: the sticky header still sticks to the page), hidden under a minimal page. */
const FULL_CHROME = "contents group-has-[[data-minimal-page]]/shell:hidden";

/**
 * F001 A1 full shell for signed-in pages: header, footer and FAB around the
 * page. Go `/me` (no-store, 5 s) decides what the header shows: signed in →
 * avatar menu and bell; 401 or an error/timeout → links and language only;
 * a failed missing-profile recovery → only `ProfileRecoveryRedirect`, which
 * signs out in the browser and opens Login (F002 R22, N06). A signed-in
 * Sunner also gets the write-kudo host (F005), which the FAB opens, and the
 * F008 host: the Thể lệ panel (FAB) and the secret box window ("Mở Secret Box").
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const summary = await getSessionSummary();
  if (summary.kind === "profile-missing") return <ProfileRecoveryRedirect />;
  const signedIn = summary.kind === "signed-in";
  const locale = await getRequestLocale();
  const [composeDictionary, gamificationDictionary] = signedIn
    ? await Promise.all([loadDictionaries(locale, ["common", "kudo-compose"]), loadDictionaries(locale, ["common", "gamification"])])
    : [null, null];

  return (
    <ShellActionsProvider>
      <MeRefresher initialUser={signedIn ? summary.user : null}>
        {/* A page that marks itself `data-minimal-page` (an error page under this shell, C01)
            draws the minimal chrome itself: the full chrome is then not rendered (display: none). */}
        <div className="group/shell flex min-h-screen flex-col">
          <div className={FULL_CHROME}>
            <SiteHeader />
          </div>
          <main className="flex flex-1 flex-col">{children}</main>
          <div className={FULL_CHROME}>
            <SiteFooter />
            {/* Same z-layer as header and FAB: after the header (covered by the window), before the FAB (stays usable). */}
            {composeDictionary && <KudoComposeHost locale={locale} dictionary={composeDictionary} />}
            {gamificationDictionary && <GamificationShellHost locale={locale} dictionary={gamificationDictionary} />}
            <FloatingActionButton />
          </div>
        </div>
      </MeRefresher>
    </ShellActionsProvider>
  );
}
