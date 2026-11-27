import {
  DEFAULT_LOCALE,
  type DictionaryNamespace,
  type Locale,
} from "./locale-config";

/** Flat `key -> text` map for one namespace. `vi` is the key master (AD01). */
export type Dictionary = Readonly<Record<string, string>>;

async function importDictionary(
  locale: Locale,
  namespace: DictionaryNamespace,
): Promise<Dictionary> {
  const imported = await import(`./dictionaries/${locale}/${namespace}.json`);
  return imported.default as Dictionary;
}

/** BR-003: a key missing from the localized dictionary falls back to the `vi` value. */
export function withMasterFallback(
  master: Dictionary,
  localized: Dictionary,
): Dictionary {
  return { ...master, ...localized };
}

export async function loadDictionary(
  locale: Locale,
  namespace: DictionaryNamespace,
): Promise<Dictionary> {
  const master = await importDictionary(DEFAULT_LOCALE, namespace);
  if (locale === DEFAULT_LOCALE) return master;
  return withMasterFallback(master, await importDictionary(locale, namespace));
}

/** Text for `key`; an unknown key renders as the key itself so gaps stay visible. */
export function translate(dictionary: Dictionary, key: string): string {
  return dictionary[key] ?? key;
}
