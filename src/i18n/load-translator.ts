import { loadDictionaries, translate } from "./load-dictionary";
import type { DictionaryNamespace, Locale } from "./locale-config";

export type Translate = (key: string) => string;

/**
 * Lookup over the given namespaces for an explicit locale (`vi` fallback per
 * key). Unlike `getRequestTranslator` it reads no request data, so it can run
 * inside a `use cache` scope that receives the locale as an argument.
 */
export async function loadTranslator(locale: Locale, ...namespaces: DictionaryNamespace[]): Promise<Translate> {
  const dictionary = await loadDictionaries(locale, namespaces);
  return (key) => translate(dictionary, key);
}
