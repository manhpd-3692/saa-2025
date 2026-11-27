import "server-only";
import { getRequestLocale } from "./get-request-locale";
import { loadDictionaries, translate } from "./load-dictionary";
import type { DictionaryNamespace, Locale } from "./locale-config";

export interface RequestTranslator {
  locale: Locale;
  /** Text for a namespaced key in the request locale (`vi` fallback per key). */
  t: (key: string) => string;
}

/** Server Component helper: request locale (A6) plus a lookup over the given namespaces. */
export async function getRequestTranslator(
  ...namespaces: DictionaryNamespace[]
): Promise<RequestTranslator> {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionaries(locale, namespaces);
  return { locale, t: (key) => translate(dictionary, key) };
}
