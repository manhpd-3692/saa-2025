/** Locale configuration shared by server and client code (F001 § 4.6). */

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Vietnamese is the master language and the last fallback (BR-001, AD01). */
export const DEFAULT_LOCALE: Locale = "vi";

/** Written by the browser (LocaleSwitcher, Phase 3); readable by the server. */
export const LOCALE_COOKIE_NAME = "saa_locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** One JSON file per namespace under `dictionaries/{locale}/{namespace}.json`. */
export const DICTIONARY_NAMESPACES = ["common"] as const;
export type DictionaryNamespace = (typeof DICTIONARY_NAMESPACES)[number];

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}
