import { describe, expect, it } from "vitest";
import { formatEventDate } from "./format-event-date";

describe("formatEventDate (F004 FR-203)", () => {
  it.each([
    ["2025-12-26T11:00:00Z", "26/12/2025"],
    ["2025-12-25T18:30:00Z", "26/12/2025"], // 01:30 in Vietnam: already the next day
    ["2025-12-26T17:30:00+00:00", "27/12/2025"],
    ["2026-12-12T00:02:12.279681+07:00", "12/12/2026"],
  ])("%s -> %s (dd/MM/yyyy, Vietnam time)", (iso, expected) => {
    expect(formatEventDate(iso)).toBe(expected);
  });
});
