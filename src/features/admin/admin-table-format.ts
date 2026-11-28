import { fillText } from "@/features/kudos-board/kudo-board-format";
import { REPORT_TIME_ZONE } from "./report-dates";

/** D010: the ID column shows the first 8 characters of the user id. */
export const shortUserId = (id: string) => id.slice(0, 8);

const LOGIN_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Last Logged in as the design shows it: "23/12/2025" over "10:00", report time zone. */
export function formatLastLogin(iso: string): { date: string; time: string } {
  const p = Object.fromEntries(LOGIN_PARTS.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return { date: `${p.day}/${p.month}/${p.year}`, time: `${p.hour}:${p.minute}` };
}

/**
 * Time to get 6 Badges as days, hours and minutes with leading zero units
 * left out (the CSV writes the same parts in English, "2d 5h 0m").
 */
export function formatBadgeDuration(seconds: number, t: (key: string) => string): string {
  const minutesTotal = Math.floor(seconds / 60);
  const d = Math.floor(minutesTotal / 1440);
  const h = Math.floor((minutesTotal % 1440) / 60);
  const m = minutesTotal % 60;
  if (d > 0) return fillText(t("admin.users.duration.days"), { d, h, m });
  if (h > 0) return fillText(t("admin.users.duration.hours"), { h, m });
  return fillText(t("admin.users.duration.minutes"), { m });
}
