import { describe, expect, it } from "vitest";
import { localeCookieValue } from "./locale-config";

describe("localeCookieValue (F001 A7, § 4.6)", () => {
  it("writes a one-year, site-wide, SameSite=Lax cookie readable by the server", () => {
    expect(localeCookieValue("en", false)).toBe("saa_locale=en; Path=/; Max-Age=31536000; SameSite=Lax");
  });

  it("adds Secure on https", () => {
    expect(localeCookieValue("vi", true)).toBe("saa_locale=vi; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
  });
});
