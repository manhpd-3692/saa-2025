import type { ReactNode } from "react";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";
import { LocaleProvider } from "@/i18n/locale-provider";

// Reads the request locale; the shell layout above may render only the recovery step (N06).
export const instant = false;

/**
 * F006 segment layout: the board (or a directly opened kudo) in `children`,
 * and the `@modal` slot where a kudo opened from the board shows over it
 * (intercepted `(.)[id]` route; `default.tsx` renders nothing otherwise).
 * One dictionary (`common`, `shell`, `kudos-board`) serves both slots.
 */
export default async function KudosLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionaries(locale, ["common", "shell", "kudos-board"]);
  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      {children}
      {modal}
    </LocaleProvider>
  );
}
