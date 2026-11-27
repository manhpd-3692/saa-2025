import type { ReactNode } from "react";
import { ForbiddenPage } from "@/components/errors/forbidden-page";
import { ServiceUnavailableNotice } from "@/components/errors/service-unavailable-notice";
import { AdminChrome } from "@/components/shell/admin-chrome";
import { MeRefresher } from "@/components/shell/me-refresher";
import { MinimalChrome } from "@/components/shell/minimal-chrome";
import { ProfileRecoveryRedirect } from "@/features/auth/profile-recovery-redirect";
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
    return (
      <MeRefresher initialUser={summary.user}>
        <AdminChrome>{children}</AdminChrome>
      </MeRefresher>
    );
  }
  return (
    <MinimalChrome>
      <ForbiddenPage />
    </MinimalChrome>
  );
}
