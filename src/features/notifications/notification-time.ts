import type { Locale } from "@/i18n/locale-config";

/** Notification times read in the event's time zone, so every reader sees the same clock. */
const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const intlLocale = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");

/**
 * ALG-001: the largest whole unit that fits — minutes, hours, days (under 30),
 * months (under 12), then years — e.g. "2 giờ trước". Under a minute, and a
 * time slightly in the future (clock difference), reads `justNow`.
 */
export function formatRelativeTime(createdAt: string, now: Date, locale: Locale, justNow: string): string {
  const diff = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  if (diff < MINUTE) return justNow;
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    diff < HOUR
      ? [diff / MINUTE, "minute"]
      : diff < DAY
        ? [diff / HOUR, "hour"]
        : diff < MONTH
          ? [diff / DAY, "day"]
          : diff < YEAR
            ? [diff / MONTH, "month"]
            : [diff / YEAR, "year"];
  return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "always" }).format(-Math.floor(value), unit);
}

/** Absolute date and time of the detail window (FR-206): "14:05 12/11/2026" in Vietnamese. */
export function formatNotificationDateTime(createdAt: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: EVENT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(createdAt));
}
