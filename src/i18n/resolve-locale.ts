import { DEFAULT_LOCALE, isLocale, type Locale } from "./locale-config";

export interface LocaleSources {
  /** Raw value of the locale cookie, if present. */
  cookie?: string | null;
  /** Raw `Accept-Language` request header, if present. */
  acceptLanguage?: string | null;
}

/**
 * First supported locale in an `Accept-Language` header, honouring q-weights.
 * Region subtags are ignored (`en-US` -> `en`); `q=0` means "not acceptable".
 */
function matchAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params
        .map((p) => p.trim())
        .find((p) => p.toLowerCase().startsWith("q="));
      const parsed = qParam === undefined ? 1 : Number(qParam.slice(2));
      const q = Number.isFinite(parsed) ? parsed : 0;
      const primary = tag.trim().toLowerCase().split("-")[0] ?? "";
      return { primary, q, index };
    })
    .filter((entry) => entry.q > 0 && isLocale(entry.primary))
    // Higher q first; header order breaks ties.
    .sort((a, b) => b.q - a.q || a.index - b.index);

  const best = ranked[0];
  return best && isLocale(best.primary) ? best.primary : null;
}

/** BR-001 / BR-003: cookie -> Accept-Language -> `vi`; unsupported values are skipped. */
export function resolveLocale({ cookie, acceptLanguage }: LocaleSources): Locale {
  if (isLocale(cookie)) return cookie;
  return matchAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}
