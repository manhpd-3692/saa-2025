import { AwardsPageContent } from "@/features/awards/awards-page-content";
import { getRequestLocale } from "@/i18n/get-request-locale";

// The shell layout drops this segment when the profile is missing (it renders only
// ProfileRecoveryRedirect, N06), so it cannot be validated for instant navigation.
export const instant = false;

/**
 * F004 A3 Awards Information `/awards`, signed-in only (proxy, FR-601). The
 * request locale is read here; the content below is cached per locale. An
 * award fragment (`/awards#mvp`) never reaches the server (BR-003).
 */
export default async function AwardsPage() {
  return <AwardsPageContent locale={await getRequestLocale()} />;
}
