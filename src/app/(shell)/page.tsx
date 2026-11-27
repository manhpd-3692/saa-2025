import { getRequestTranslator } from "@/i18n/get-request-translator";

// The shell layout drops this segment when the profile is missing (it renders only
// ProfileRecoveryRedirect, N06), so it cannot be validated for instant navigation.
export const instant = false;

/**
 * Homepage route `/` inside the full shell. Its content (key visual, countdown,
 * awards, Kudos teaser) is F004's and arrives in phase 5; phase 3 only needs the
 * route so the shared header, footer and FAB render around it.
 */
export default async function HomePage() {
  const { t } = await getRequestTranslator("shell");
  return <h1 className="sr-only">{t("shell.nav.about")}</h1>;
}
