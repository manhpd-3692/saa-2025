/**
 * Report days as `YYYY-MM-DD` strings in the report time zone (D009), so the
 * server and the browser agree on "today" and on day boundaries. Arithmetic
 * runs on UTC dates, which have no daylight saving to trip over.
 */

export const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", { timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

const toUtc = (day: string) => new Date(`${day}T00:00:00Z`);
const fromUtc = (date: Date) => date.toISOString().slice(0, 10);

/** Today in the report time zone. */
export function reportToday(now: Date = new Date()): string {
  const parts = Object.fromEntries(DAY_FORMAT.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(day: string, days: number): string {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

export type QuickRange = "last7" | "last30" | "thisMonth";
export const QUICK_RANGES: readonly QuickRange[] = ["last7", "last30", "thisMonth"];

/** D012 quick ranges ending today; "last30" is also the default range (D001). */
export function quickRange(kind: QuickRange, today: string): { from: string; to: string } {
  if (kind === "thisMonth") return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: addDays(today, kind === "last7" ? -6 : -29), to: today };
}

/** The quick range a range equals, or "custom". */
export function quickRangeOf(from: string, to: string, today: string): QuickRange | "custom" {
  return QUICK_RANGES.find((kind) => {
    const range = quickRange(kind, today);
    return range.from === from && range.to === to;
  }) ?? "custom";
}

export interface CalendarMonth {
  year: number;
  /** 0-11 */
  month: number;
}

export const monthOf = (day: string): CalendarMonth => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 });

export function addMonths({ year, month }: CalendarMonth, months: number): CalendarMonth {
  const index = year * 12 + month + months;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

/** Six Monday-first weeks covering the month, with the neighbouring months' days. */
export function monthGrid({ year, month }: CalendarMonth): string[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = fromUtc(new Date(Date.UTC(year, month, 1 - mondayOffset)));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** SM-001 selection: nothing → start → range; while only a start is set, earlier days are refused. */
export interface DaySelection {
  start: string | null;
  end: string | null;
}

export const isDayBeforeStart = (selection: DaySelection, day: string) =>
  selection.start !== null && selection.end === null && day < selection.start;

export function pickDay(selection: DaySelection, day: string): DaySelection {
  if (selection.start !== null && selection.end === null) {
    return isDayBeforeStart(selection, day) ? selection : { start: selection.start, end: day };
  }
  return { start: day, end: null };
}
