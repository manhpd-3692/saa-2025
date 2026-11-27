import { describe, expect, it } from "vitest";
import { resolveLocale } from "./resolve-locale";

describe("resolveLocale", () => {
  it("prefers a supported cookie over Accept-Language", () => {
    expect(resolveLocale({ cookie: "en", acceptLanguage: "vi,en;q=0.5" })).toBe("en");
    expect(resolveLocale({ cookie: "vi", acceptLanguage: "en-US" })).toBe("vi");
  });

  it("ignores an unsupported or malformed cookie and uses Accept-Language", () => {
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
    expect(resolveLocale({ cookie: "EN", acceptLanguage: "en" })).toBe("en");
    expect(resolveLocale({ cookie: "", acceptLanguage: "en" })).toBe("en");
  });

  it("falls back to vi when the cookie is unsupported and there is no usable header", () => {
    expect(resolveLocale({ cookie: "fr" })).toBe("vi");
    expect(resolveLocale({ cookie: "fr", acceptLanguage: "ja,fr;q=0.8" })).toBe("vi");
  });

  it("falls back to vi when nothing is provided", () => {
    expect(resolveLocale({})).toBe("vi");
    expect(resolveLocale({ cookie: null, acceptLanguage: null })).toBe("vi");
    expect(resolveLocale({ acceptLanguage: "" })).toBe("vi");
  });

  it("matches the primary language subtag", () => {
    expect(resolveLocale({ acceptLanguage: "en-GB" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "vi-VN" })).toBe("vi");
  });

  it("orders Accept-Language entries by q-weight, then by position", () => {
    expect(resolveLocale({ acceptLanguage: "vi;q=0.4,en;q=0.9" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "en;q=0.8,vi;q=0.8" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "fr,en;q=0.7,vi;q=0.3" })).toBe("en");
  });

  it("skips q=0 and unparsable q values", () => {
    expect(resolveLocale({ acceptLanguage: "en;q=0,vi;q=0.1" })).toBe("vi");
    expect(resolveLocale({ acceptLanguage: "en;q=abc" })).toBe("vi");
    expect(resolveLocale({ acceptLanguage: "en;q=0" })).toBe("vi");
  });

  it("ignores wildcard and garbage entries", () => {
    expect(resolveLocale({ acceptLanguage: "*" })).toBe("vi");
    expect(resolveLocale({ acceptLanguage: ",,;;q=1, en " })).toBe("en");
  });
});
