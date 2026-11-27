import type { Locale } from "@/i18n/locale-config";
import type { RemainingTimeParts } from "./split-remaining-time";

export const COUNTDOWN_UNITS = ["days", "hours", "minutes"] as const;
export type CountdownUnit = (typeof COUNTDOWN_UNITS)[number];

/**
 * Countdown text for one locale as plain strings: built by the Server Component
 * from the `countdown` dictionary and handed to the client countdown as props
 * (F003 here, F004 ceremony countdown later).
 */
export interface CountdownCopy {
  locale: Locale;
  /** Visible unit labels (DAYS / HOURS / MINUTES). */
  labels: Record<CountdownUnit, string>;
  /** Screen-reader words with a `{count}` slot, per plural category. */
  spoken: Record<CountdownUnit, { one: string; other: string }>;
}

export function buildCountdownCopy(locale: Locale, t: (key: string) => string): CountdownCopy {
  const forUnit = <T>(read: (unit: CountdownUnit) => T) =>
    Object.fromEntries(COUNTDOWN_UNITS.map((unit) => [unit, read(unit)])) as Record<CountdownUnit, T>;
  return {
    locale,
    labels: forUnit((unit) => t(`countdown.unit.${unit}`)),
    spoken: forUnit((unit) => ({
      one: t(`countdown.spoken.${unit}.one`),
      other: t(`countdown.spoken.${unit}.other`),
    })),
  };
}

/** E09 announcement in full words, e.g. "7 days 12 hours 35 minutes" / "7 ngày 12 giờ 35 phút". */
export function describeRemaining(parts: RemainingTimeParts, copy: CountdownCopy): string {
  const plural = new Intl.PluralRules(copy.locale);
  return COUNTDOWN_UNITS.map((unit) => {
    const form = plural.select(parts[unit]) === "one" ? "one" : "other";
    return copy.spoken[unit][form].replace("{count}", String(parts[unit]));
  }).join(" ");
}
