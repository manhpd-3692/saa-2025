import type { Locale } from "@/i18n/locale-config";

/** Kudo times read in the event's time zone, so server and browser render the same text. */
const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh";

const TIME_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** FR-002 card time "HH:mm - MM/dd/yyyy" (e.g. "10:00 - 10/30/2025"). */
export function formatKudoTime(iso: string): string {
  const parts = Object.fromEntries(TIME_PARTS.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.hour}:${parts.minute} - ${parts.month}/${parts.day}/${parts.year}`;
}

/** Spotlight ticker time "08:30PM". */
export function formatTickerTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: EVENT_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(" ", "");
}

/** Counts with the locale's grouping: "1.000" in Vietnamese, "1,000" in English. */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(value);
}

/** Fills `{name}` placeholders of a dictionary text. */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/**
 * BR-004 search key: lower case without Vietnamese diacritics, so "nguyen"
 * finds "Nguyễn" and "DUC" finds "Đức".
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
