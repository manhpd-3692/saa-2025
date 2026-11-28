import { describe, expect, it } from "vitest";
import { formatBadgeDuration, formatLastLogin, shortUserId } from "./admin-table-format";
import { parseUserDirectoryQuery, userDirectorySearch, usersPageHref, ADMIN_REPORT_PATHS } from "./admin-reports-api";
import { addMonths, monthGrid, pickDay, quickRange, quickRangeOf, reportToday } from "./report-dates";

describe("report days (D009, D001, D012)", () => {
  it("reads today in Ho Chi Minh City", () => {
    expect(reportToday(new Date("2026-11-27T18:30:00Z"))).toBe("2026-11-28");
    expect(reportToday(new Date("2026-11-27T16:59:59Z"))).toBe("2026-11-27");
  });

  it("builds the quick ranges ending today; last 30 days is the default range", () => {
    expect(quickRange("last7", "2026-11-28")).toEqual({ from: "2026-11-22", to: "2026-11-28" });
    expect(quickRange("last30", "2026-11-28")).toEqual({ from: "2026-10-30", to: "2026-11-28" });
    expect(quickRange("thisMonth", "2026-03-05")).toEqual({ from: "2026-03-01", to: "2026-03-05" });
    expect(quickRangeOf("2026-10-30", "2026-11-28", "2026-11-28")).toBe("last30");
    expect(quickRangeOf("2026-11-01", "2026-11-08", "2026-11-28")).toBe("custom");
  });

  it("lays a month out in six Monday-first weeks", () => {
    const days = monthGrid({ year: 2026, month: 10 }); // November 2026 starts on a Sunday
    expect(days).toHaveLength(42);
    expect(days[0]).toBe("2026-10-26");
    expect(days[6]).toBe("2026-11-01");
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -13)).toEqual({ year: 2024, month: 11 });
  });

  it("moves idle → start → range and refuses an end before the start (SM-001, BR-006)", () => {
    const start = pickDay({ start: null, end: null }, "2026-11-08");
    expect(start).toEqual({ start: "2026-11-08", end: null });
    expect(pickDay(start, "2026-11-01")).toBe(start);
    const range = pickDay(start, "2026-11-08");
    expect(range).toEqual({ start: "2026-11-08", end: "2026-11-08" });
    expect(pickDay(range, "2026-11-01")).toEqual({ start: "2026-11-01", end: null });
  });
});

describe("user directory address (BR-005)", () => {
  it("keeps valid filters and drops unknown values", () => {
    const query = parseUserDirectoryQuery({
      unit: "D0000000-0000-4000-8000-000000000001", level: "Legend", role: "admin", q: " an ", page: "3",
    });
    expect(query).toEqual({ unit: "d0000000-0000-4000-8000-000000000001", level: "Legend", role: "admin", q: "an", page: 3 });
    expect(parseUserDirectoryQuery({ unit: "x", level: "Mythic", role: "root", page: "-2" }))
      .toEqual({ unit: null, level: null, role: null, q: "", page: 1 });
  });

  it("builds the page, list, suggestion and export addresses", () => {
    const query = { unit: null, level: "New" as const, role: "user" as const, q: "50%_", page: 2 };
    expect(userDirectorySearch(query)).toBe("level=New&role=user&q=50%25_&page=2");
    expect(usersPageHref({ ...query, page: 1 })).toBe("/admin/users?level=New&role=user&q=50%25_");
    expect(ADMIN_REPORT_PATHS.users(query, 8)).toBe("/api/v1/admin/users?level=New&role=user&q=50%25_&page=2&pageSize=8");
    expect(ADMIN_REPORT_PATHS.usersExport(query)).toBe("/api/v1/admin/users/export?level=New&role=user&q=50%25_");
    expect(ADMIN_REPORT_PATHS.overviewExport("2026-11-01", "2026-11-08")).toBe("/api/v1/admin/overview/export?from=2026-11-01&to=2026-11-08");
  });
});

describe("user table cells (D010, DEC-003, E17)", () => {
  const t = (key: string) => ({
    "admin.users.duration.days": "{d}d {h}h {m}m",
    "admin.users.duration.hours": "{h}h {m}m",
    "admin.users.duration.minutes": "{m}m",
  })[key] ?? key;

  it("formats the time to six badges like the CSV", () => {
    expect(formatBadgeDuration(2 * 86400 + 5 * 3600 + 7 * 60 + 30, t)).toBe("2d 5h 7m");
    expect(formatBadgeDuration(3 * 3600 + 12 * 60, t)).toBe("3h 12m");
    expect(formatBadgeDuration(45 * 60 + 59, t)).toBe("45m");
  });

  it("shows the last login in the report time zone and the short id", () => {
    expect(formatLastLogin("2026-11-20T03:04:00Z")).toEqual({ date: "20/11/2026", time: "10:04" });
    expect(shortUserId("1234abcd-0000-4000-8000-000000000001")).toBe("1234abcd");
  });
});
