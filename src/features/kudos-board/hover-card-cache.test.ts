import { describe, expect, it } from "vitest";
import { hoverCardsFor } from "./hover-card-cache";
import type { HoverCardData } from "./kudo-card-types";

const card = (sentCount: number): HoverCardData => ({
  id: "p1", name: "Nguyễn Hoàng Linh", avatarUrl: null, unitCode: "CECV2", unitName: "Đơn vị CECV2",
  heroTier: null, receivedCount: 3, sentCount, isSelf: false,
});

describe("hover card cache (F006 A9, BR-002, review W3)", () => {
  it("keeps cards per viewer, so another viewer never sees a richer sent count", () => {
    const admin = { role: "admin" };
    const sunner = { role: "user" };
    hoverCardsFor(admin)!.set("p1", card(5)); // admin count includes anonymous kudos
    expect(hoverCardsFor(admin)!.get("p1")?.sentCount).toBe(5);
    expect(hoverCardsFor(sunner)!.has("p1")).toBe(false);
  });

  it("does not cache without a known viewer", () => {
    expect(hoverCardsFor(null)).toBeNull();
  });
});
