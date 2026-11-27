/**
 * F003 ALG-001: remaining milliseconds split into whole days, hours and minutes.
 * Each unit is floored (BR-002), the input is clamped at 0 so the parts are
 * never negative, and seconds are dropped. Days are not capped (D005).
 * Shared by the launch countdown (F003) and the Homepage ceremony countdown (F004).
 */

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export interface RemainingTimeParts {
  days: number;
  hours: number;
  minutes: number;
}

export function splitRemainingTime(remainingMs: number): RemainingTimeParts {
  const r = Math.max(0, Math.floor(remainingMs));
  return {
    days: Math.floor(r / MS_PER_DAY),
    hours: Math.floor((r % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((r % MS_PER_HOUR) / MS_PER_MINUTE),
  };
}

/** FR-202: two digits with a leading zero ("07"); 100+ days keep every digit (D005). */
export function padUnit(value: number): string {
  return String(value).padStart(2, "0");
}
