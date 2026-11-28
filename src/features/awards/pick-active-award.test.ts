import { describe, expect, it } from "vitest";
import { pickActiveAward } from "./pick-active-award";

const ORDER = ["a", "b", "c"] as const;

describe("pickActiveAward (F004 DEC-002, FR-402)", () => {
  it("marks the topmost award that is at least 30 % on screen", () => {
    expect(pickActiveAward(ORDER, { a: 0.29, b: 0.3, c: 1 }, "a")).toBe("b");
    expect(pickActiveAward(ORDER, { a: 0.8, b: 0.5, c: 0 }, "c")).toBe("a");
  });

  it("keeps the first award before any card is 30 % visible", () => {
    expect(pickActiveAward(ORDER, {}, "a")).toBe("a");
    expect(pickActiveAward(ORDER, { a: 0.1 }, "a")).toBe("a");
  });

  it("keeps the current award while no card reaches the threshold (e.g. on the Kudos block)", () => {
    expect(pickActiveAward(ORDER, { c: 0.2 }, "c")).toBe("c");
  });
});
