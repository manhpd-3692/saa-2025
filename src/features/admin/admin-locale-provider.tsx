import type { ReactNode } from "react";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";
import type { DictionaryNamespace } from "@/i18n/locale-config";
import { LocaleProvider } from "@/i18n/locale-provider";

/**
 * Client dictionary of the F010 admin pages (FR-002): the chrome's `common`
 * and `shell`, `gamification` for the hero tier names, and `admin`, plus a
 * page's own namespaces (`moderation` on Review content).
 */
export async function AdminLocaleProvider({ children, extraNamespaces = [] }: {
  children: ReactNode;
  extraNamespaces?: readonly DictionaryNamespace[];
}) {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionaries(locale, ["common", "shell", "gamification", "admin", ...extraNamespaces]);
  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      {children}
    </LocaleProvider>
  );
}
