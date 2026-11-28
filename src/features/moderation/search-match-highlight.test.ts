import { describe, expect, it } from "vitest";
import { splitSearchMatches } from "./search-match-highlight";

describe("splitSearchMatches (Figma A3 search state)", () => {
  it("marks every case-insensitive occurrence and keeps the original casing", () => {
    expect(splitSearchMatches("Phi thường, rất PHI THƯỜNG", "phi thường")).toEqual([
      { text: "Phi thường", match: true },
      { text: ", rất ", match: false },
      { text: "PHI THƯỜNG", match: true },
    ]);
  });

  it("leaves the text whole without a query or a match", () => {
    expect(splitSearchMatches("Cảm ơn", "")).toEqual([{ text: "Cảm ơn", match: false }]);
    expect(splitSearchMatches("Cảm ơn", "xyz")).toEqual([{ text: "Cảm ơn", match: false }]);
  });
});
