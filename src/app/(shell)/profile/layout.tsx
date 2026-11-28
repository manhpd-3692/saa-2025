import type { ReactNode } from "react";
import { ActiveCampaignProvider } from "@/features/gamification/active-campaign-context";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";
import { LocaleProvider } from "@/i18n/locale-provider";

// Reads the request locale; the shell layout above may render only the recovery step (N06).
export const instant = false;

/**
 * F007 segment layout for both profiles: one dictionary (`common`, `shell`,
 * `kudos-board` for the cards, `gamification` for hearts and icon names,
 * `profile`) and the active heart campaign (F008 A3) for the card hearts.
 */
export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionaries(locale, ["common", "shell", "kudos-board", "gamification", "profile"]);
  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <ActiveCampaignProvider>{children}</ActiveCampaignProvider>
    </LocaleProvider>
  );
}
