import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pickLocalized } from "@/i18n/localized-text";
import { AWARDS, awardSlugFromHash, formatAwardQuantity, formatVnd } from "./award-catalog";

describe("award catalog (F004 FR-001, BR-001, SC-001)", () => {
  it("holds the six awards once, in the fixed display order", () => {
    expect(AWARDS.map((award) => award.slug)).toEqual([
      "top-talent",
      "top-project",
      "top-project-leader",
      "best-manager",
      "signature-2025-creator",
      "mvp",
    ]);
  });

  it("uses the design names for cards and the menu (FR-302)", () => {
    expect(AWARDS.map((award) => pickLocalized(award.name, "vi"))).toEqual([
      "Top Talent",
      "Top Project",
      "Top Project Leader",
      "Best Manager",
      "Signature 2025 - Creator",
      "MVP (Most Valuable Person)",
    ]);
    expect(AWARDS.map((award) => pickLocalized(award.menuLabel, "vi"))).toEqual([
      "Top Talent",
      "Top Project",
      "Top Project Leader",
      "Best Manager",
      "Signature 2025 - Creator",
      "MVP",
    ]);
  });

  it("carries the quantities, units and prize values of the configuration (§ 13)", () => {
    const rows = AWARDS.map(({ slug, quantity, unit, prizes }) => ({
      slug,
      quantity,
      unit,
      prizes: prizes.map((prize) => [prize.valueVnd, prize.note]),
    }));
    expect(rows).toEqual([
      { slug: "top-talent", quantity: 10, unit: "individual", prizes: [[7_000_000, "each"]] },
      { slug: "top-project", quantity: 2, unit: "team", prizes: [[15_000_000, "each"]] },
      { slug: "top-project-leader", quantity: 3, unit: "individual", prizes: [[7_000_000, "each"]] },
      { slug: "best-manager", quantity: 1, unit: "individual", prizes: [[10_000_000, null]] },
      {
        slug: "signature-2025-creator",
        quantity: 1,
        unit: "individualOrTeam",
        prizes: [
          [5_000_000, "individual"],
          [8_000_000, "team"],
        ],
      },
      { slug: "mvp", quantity: 1, unit: "individual", prizes: [[15_000_000, null]] },
    ]);
  });

  it("gives Signature 2025 - Creator, and only it, two prize values (BR-002, SC-002)", () => {
    const dual = AWARDS.filter((award) => award.prizes.length > 1).map((award) => award.slug);
    expect(dual).toEqual(["signature-2025-creator"]);
    expect(AWARDS.every((award) => award.prizes.length >= 1)).toBe(true);
  });

  it("ships an image file for every award", () => {
    for (const award of AWARDS) {
      expect(award.image).toBe(`/images/awards/award-${award.slug}.webp`);
      expect(existsSync(join(process.cwd(), "public", award.image)), award.image).toBe(true);
    }
  });

  it("shows Vietnamese copy where English is missing (FR-002, D004)", () => {
    for (const award of AWARDS) {
      expect(pickLocalized(award.description, "en")).toBe(pickLocalized(award.description, "vi"));
      expect(pickLocalized(award.description, "vi").length).toBeGreaterThan(100);
      expect(pickLocalized(award.summary, "vi")).toMatch(/^Vinh danh /);
    }
  });
});

describe("formatVnd / formatAwardQuantity (design copy)", () => {
  it.each([
    [5_000_000, "5.000.000 VNĐ"],
    [7_000_000, "7.000.000 VNĐ"],
    [15_000_000, "15.000.000 VNĐ"],
  ])("%i -> %s", (value, expected) => {
    expect(formatVnd(value)).toBe(expected);
  });

  it.each([
    [1, "01"],
    [2, "02"],
    [10, "10"],
  ])("quantity %i -> %s", (value, expected) => {
    expect(formatAwardQuantity(value)).toBe(expected);
  });
});

describe("awardSlugFromHash (FR-102, BR-003)", () => {
  it("reads a known award anchor", () => {
    expect(awardSlugFromHash("#mvp")).toBe("mvp");
    expect(awardSlugFromHash("#best-manager")).toBe("best-manager");
  });

  it.each(["", "#", "#unknown", "#MVP", "mvp", "#%E0%A4%A"])("ignores %j", (hash) => {
    expect(awardSlugFromHash(hash)).toBeNull();
  });
});
