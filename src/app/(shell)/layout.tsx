import type { ReactNode } from "react";
import { FloatingActionButton } from "@/components/shell/floating-action-button";
import { MeRefresher } from "@/components/shell/me-refresher";
import { ShellActionsProvider } from "@/components/shell/shell-actions-context";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { ProfileRecoveryRedirect } from "@/features/auth/profile-recovery-redirect";
import { getSessionSummary } from "@/lib/auth/get-session-summary";

// Blocks on Go `/me`: a missing profile must render no chrome at all (N06).
export const instant = false;

/**
 * F001 A1 full shell for signed-in pages: header, footer and FAB around the
 * page. Go `/me` (no-store, 5 s) decides what the header shows: signed in →
 * avatar menu and bell; 401 or an error/timeout → links and language only;
 * a failed missing-profile recovery → only `ProfileRecoveryRedirect`, which
 * signs out in the browser and opens Login (F002 R22, N06).
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const summary = await getSessionSummary();
  if (summary.kind === "profile-missing") return <ProfileRecoveryRedirect />;

  return (
    <ShellActionsProvider>
      <MeRefresher initialUser={summary.kind === "signed-in" ? summary.user : null}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          <FloatingActionButton />
        </div>
      </MeRefresher>
    </ShellActionsProvider>
  );
}
