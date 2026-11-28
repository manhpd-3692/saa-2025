import { CommunityRuleList } from "@/features/community-standards/community-rule-list";
import { getRequestLocale } from "@/i18n/get-request-locale";

// The shell layout drops this segment when the profile is missing (it renders only
// ProfileRecoveryRedirect, N06), so it cannot be validated for instant navigation.
export const instant = false;

/**
 * F004 A6 Community Standards `/community-standards`, signed-in only (proxy,
 * FR-601), opened from the footer and the spam-warning notification (FR-103).
 * The request locale is read here; the content is cached per locale.
 */
export default async function CommunityStandardsPage() {
  return <CommunityRuleList locale={await getRequestLocale()} />;
}
