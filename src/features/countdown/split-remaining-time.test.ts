import { describe, expect, it } from "vitest";
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  padUnit,
  splitRemainingTime,
} from "./split-remaining-time";

describe("splitRemainingTime (ALG-001, BR-002)", () => {
  it("splits into days, hours and minutes and drops the seconds", () => {
    const ms = 7 * MS_PER_DAY + 12 * MS_PER_HOUR + 35 * MS_PER_MINUTE + 59_999;
    expect(splitRemainingTime(ms)).toEqual({ days: 7, hours: 12, minutes: 35 });
  });

  it("floors: the last minute before the start reads 00 00 00, never rounds up", () => {
    expect(splitRemainingTime(59_999)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(splitRemainingTime(MS_PER_DAY - 1)).toEqual({ days: 0, hours: 23, minutes: 59 });
  });

  it("is never negative once the target has passed", () => {
    expect(splitRemainingTime(-5 * MS_PER_HOUR)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("does not cap days at two digits (D005)", () => {
    expect(splitRemainingTime(123 * MS_PER_DAY + MS_PER_HOUR).days).toBe(123);
  });
});

describe("padUnit (FR-202, D005)", () => {
  it.each([
    [0, "00"],
    [7, "07"],
    [35, "35"],
    [99, "99"],
    [100, "100"],
  ])("%i -> %s", (value, expected) => {
    expect(padUnit(value)).toBe(expected);
  });
});
