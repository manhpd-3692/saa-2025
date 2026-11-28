import { describe, expect, it } from "vitest";
import { BOARD_PATHS, parseKudoIdParam } from "./kudos-board-api";

const ID = "0b9e8d36-2c1a-4bd7-9f61-6c3f0e1c2a11";

describe("kudo detail id (F006 SC-006, review W1)", () => {
  it("accepts a uuid, also behind the interception markers Next.js may prepend", () => {
    expect(parseKudoIdParam(ID)).toBe(ID);
    expect(parseKudoIdParam(`(.)(.)(.)${ID}`)).toBe(ID);
    expect(parseKudoIdParam(ID.toUpperCase())).toBe(ID.toUpperCase());
  });

  it("refuses anything else before a Go URL is built, so dot segments never reach it", () => {
    for (const param of ["..", ".", "%2e%2e", "../me", `${ID}/..`, "not-a-uuid", "", `(.)..`, `${ID}x`]) {
      expect(parseKudoIdParam(param), param).toBeNull();
    }
    expect(BOARD_PATHS.kudo(parseKudoIdParam(`(.)${ID}`)!)).toBe(`/api/v1/kudos/${ID}`);
  });
});
