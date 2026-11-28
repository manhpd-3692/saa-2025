import { describe, expect, it } from "vitest";
import { formatNotificationDateTime, formatRelativeTime } from "./notification-time";

const NOW = new Date("2026-11-28T10:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime: the largest whole unit that fits (ALG-001, FR-202)", () => {
  it("reads like the design in Vietnamese", () => {
    const rel = (ms: number) => formatRelativeTime(ago(ms), NOW, "vi", "Vừa xong");
    expect(rel(15 * MIN)).toBe("15 phút trước");
    expect(rel(2 * HOUR)).toBe("2 giờ trước");
    expect(rel(DAY)).toBe("1 ngày trước");
    expect(rel(29 * DAY)).toBe("29 ngày trước");
    expect(rel(95 * DAY)).toBe("3 tháng trước");
    expect(rel(400 * DAY)).toBe("1 năm trước");
  });

  it("uses the English wording for en", () => {
    expect(formatRelativeTime(ago(15 * MIN), NOW, "en", "Just now")).toBe("15 minutes ago");
    expect(formatRelativeTime(ago(DAY + HOUR), NOW, "en", "Just now")).toBe("1 day ago");
  });

  it("shows just now under a minute and for a time slightly in the future (clock difference)", () => {
    expect(formatRelativeTime(ago(30_000), NOW, "vi", "Vừa xong")).toBe("Vừa xong");
    expect(formatRelativeTime(ago(-90_000), NOW, "vi", "Vừa xong")).toBe("Vừa xong");
  });
});

describe("formatNotificationDateTime: the absolute time of the detail window", () => {
  it("prints the event time zone in the reader's format", () => {
    expect(formatNotificationDateTime("2026-11-12T07:05:00Z", "vi")).toBe("14:05 12/11/2026");
    expect(formatNotificationDateTime("2026-11-12T07:05:00Z", "en")).toBe("11/12/2026, 14:05");
  });
});
