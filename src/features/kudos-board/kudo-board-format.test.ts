import { describe, expect, it } from "vitest";
import { formatCount, formatKudoTime, normalizeSearchText } from "./kudo-board-format";

describe("kudo board formats (F006 FR-002, BR-004)", () => {
  it("prints the card time as HH:mm - MM/dd/yyyy in the event time zone", () => {
    expect(formatKudoTime("2025-10-30T03:00:00Z")).toBe("10:00 - 10/30/2025");
    expect(formatKudoTime("2025-10-30T17:05:00Z")).toBe("00:05 - 10/31/2025"); // past midnight in Hà Nội
  });

  it("groups heart counts per locale", () => {
    expect(formatCount(1000, "vi")).toBe("1.000");
    expect(formatCount(1000, "en")).toBe("1,000");
  });

  it("matches Spotlight names without case or Vietnamese accents", () => {
    expect(normalizeSearchText("Nguyễn Hoàng Linh")).toContain(normalizeSearchText("nguyen"));
    expect(normalizeSearchText("Vũ Đức Khang")).toContain(normalizeSearchText("DUC"));
    expect(normalizeSearchText("Lê Kiều Trang")).not.toContain(normalizeSearchText("linh"));
  });
});
