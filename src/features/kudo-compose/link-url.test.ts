import { describe, expect, it } from "vitest";
import { normalizeLinkUrl } from "./link-url";

describe("normalizeLinkUrl (FR-209, ALG-001)", () => {
  it.each<[string, string | null]>([
    ["https://example.com/saa", "https://example.com/saa"],
    ["http://example.com", "http://example.com/"],
    ["example.com/saa", "https://example.com/saa"],
    ["  example.com  ", "https://example.com/"],
    ["localhost:3000/kudos", "https://localhost:3000/kudos"],
    ["example.com:8080/x", "https://example.com:8080/x"],
    ["javascript:alert(1)", null],
    ["mailto:someone@sun-asterisk.com", null],
    ["data:text/html,<b>x</b>", null],
    ["", null],
    ["   ", null],
  ])("%s", (raw, expected) => {
    expect(normalizeLinkUrl(raw)).toBe(expected);
  });
});
