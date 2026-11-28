import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "@/features/admin/admin-nav-items";
import { findActiveNavHref, MAIN_NAV_ITEMS } from "./nav-active-item";

describe("findActiveNavHref: header items (F001 FR-101, SC-008)", () => {
  it.each([
    ["/", "/"],
    ["/awards", "/awards"],
    ["/awards/top-talent", "/awards"],
    ["/kudos", "/kudos"],
    ["/kudos/0b9e8d36-2c1a-4bd7-9f61-6c3f0e1c2a11", "/kudos"],
    // A teammate's profile is reached from Sun* Kudos cards (Figma 362:5097 highlights it); F007.
    ["/profile/d0000000-0000-4000-8000-000000000002", "/kudos"],
  ])("on %s selects exactly %s", (pathname, expected) => {
    expect(findActiveNavHref(MAIN_NAV_ITEMS, pathname)).toBe(expected);
  });

  // The own profile (Figma 362:5037) highlights nothing.
  it.each(["/profile", "/profilex/1", "/community-standards", "/kudosx", "/awardsx/1"])(
    "selects nothing on %s (no look-alike prefix match)",
    (pathname) => {
      expect(findActiveNavHref(MAIN_NAV_ITEMS, pathname)).toBeNull();
    },
  );
});

describe("findActiveNavHref: admin items (F010 DEC-001)", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/review", "/admin/review"],
    ["/admin/review/abc", "/admin/review"],
    ["/admin/users", "/admin/users"],
    ["/admin/settings", "/admin/settings"],
  ])("on %s selects exactly %s", (pathname, expected) => {
    expect(findActiveNavHref(ADMIN_NAV_ITEMS, pathname)).toBe(expected);
  });

  it("does not select Overview on a deeper admin page that has no item", () => {
    expect(findActiveNavHref(ADMIN_NAV_ITEMS, "/admin/unknown")).toBeNull();
  });
});
