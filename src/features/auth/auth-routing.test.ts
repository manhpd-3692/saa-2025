import { describe, expect, it } from "vitest";
import {
  buildCallbackUrl,
  decideRouteAccess,
  isCompanyEmail,
  loginErrorReason,
  safeNext,
} from "./auth-routing";

describe("safeNext (BR-002)", () => {
  it("keeps internal paths with their query", () => {
    expect(safeNext("/kudos?tab=all")).toBe("/kudos?tab=all");
    expect(safeNext("/")).toBe("/");
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["kudos"],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/redirect?to=https://evil.example"],
    ["/a\\b"],
    ["/\t/evil.example"],
    ["/\n/evil.example"],
  ])("replaces %j with /", (value) => {
    expect(safeNext(value)).toBe("/");
  });
});

describe("isCompanyEmail (BR-003 fast path)", () => {
  it("accepts the company domain case-insensitively", () => {
    expect(isCompanyEmail("An.Nguyen@Sun-Asterisk.com")).toBe(true);
  });

  it.each([
    "someone@gmail.com",
    "x@sun-asterisk.com.evil.example",
    "x@evil.sun-asterisk.com",
    "@sun-asterisk.com",
    "",
    undefined,
  ])("refuses %j", (email) => {
    expect(isCompanyEmail(email)).toBe(false);
  });
});

describe("loginErrorReason (A1)", () => {
  it("keeps the four reason keys and maps anything else to failed", () => {
    for (const key of ["cancelled", "domain_not_allowed", "failed", "profile_unavailable"]) {
      expect(loginErrorReason(key)).toBe(key);
    }
    expect(loginErrorReason("<script>")).toBe("failed");
    expect(loginErrorReason(undefined)).toBeNull();
  });
});

describe("buildCallbackUrl (A2)", () => {
  it("carries a safe next through the callback", () => {
    expect(buildCallbackUrl("http://localhost:3000", "/kudos?x=1")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fkudos%3Fx%3D1",
    );
    expect(buildCallbackUrl("http://localhost:3000", "https://evil.example")).toBe(
      "http://localhost:3000/auth/callback?next=%2F",
    );
  });
});

describe("decideRouteAccess (A6)", () => {
  const anonymous = { signedIn: false, hasErrorParam: false };
  const signedIn = { signedIn: true, hasErrorParam: false };

  it("DEC-001: sends an anonymous visitor of a protected path to Login with the return path", () => {
    expect(decideRouteAccess({ pathname: "/kudos", search: "?tab=1", ...anonymous })).toEqual({
      redirect: "/login?next=%2Fkudos%3Ftab%3D1",
    });
    expect(decideRouteAccess({ pathname: "/", search: "", ...anonymous })).toEqual({ redirect: "/login" });
  });

  it("keeps public paths reachable without a session", () => {
    for (const pathname of ["/login", "/countdown", "/auth/callback"]) {
      expect(decideRouteAccess({ pathname, search: "", ...anonymous })).toBeNull();
    }
  });

  it("DEC-002: sends a signed-in visitor away from Login unless an error is shown (R22)", () => {
    expect(decideRouteAccess({ pathname: "/login", search: "", ...signedIn })).toEqual({ redirect: "/" });
    expect(
      decideRouteAccess({ pathname: "/login", search: "?error=profile_unavailable", signedIn: true, hasErrorParam: true }),
    ).toBeNull();
  });

  it("lets a signed-in visitor through protected paths (roles are checked elsewhere)", () => {
    expect(decideRouteAccess({ pathname: "/admin", search: "", ...signedIn })).toBeNull();
  });

  it("does not treat look-alike prefixes as public", () => {
    expect(decideRouteAccess({ pathname: "/login-history", search: "", ...anonymous })).toEqual({
      redirect: "/login?next=%2Flogin-history",
    });
  });
});
