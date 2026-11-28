/** Locale configuration shared by server and client code (F001 § 4.6). */

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Vietnamese is the master language and the last fallback (BR-001, AD01). */
export const DEFAULT_LOCALE: Locale = "vi";

/** Written by the browser (LocaleSwitcher, Phase 3); readable by the server. */
export const LOCALE_COOKIE_NAME = "saa_locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * One JSON file per namespace under `dictionaries/{locale}/{namespace}.json`.
 * Keys carry their namespace as a prefix (`shell.nav.about`), so namespaces can
 * be merged into one client dictionary without collisions.
 */
export const DICTIONARY_NAMESPACES = [
  "common",
  "shell",
  "auth",
  "errors",
  "countdown",
  "home",
  "awards",
  "standards",
  "kudo-compose",
  "kudos-board",
] as const;
export type DictionaryNamespace = (typeof DICTIONARY_NAMESPACES)[number];

/** Namespaces every page needs on the client: shared words and the app chrome. */
export const CLIENT_NAMESPACES = ["common", "shell"] as const satisfies readonly DictionaryNamespace[];

/**
 * `document.cookie` value written by the language switch (A7): readable by the
 * server, not httpOnly (it holds no secret), SameSite=Lax, one year (§ 4.6).
 */
export function localeCookieValue(locale: Locale, secure: boolean): string {
  const attributes = [`Path=/`, `Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}`, "SameSite=Lax"];
  if (secure) attributes.push("Secure");
  return [`${LOCALE_COOKIE_NAME}=${locale}`, ...attributes].join("; ");
}

/** Browser only: persists the language choice for the next server render (A7). */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = localeCookieValue(locale, window.location.protocol === "https:");
}

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}
