import { describe, expect, it } from "vitest";
import shared from "../../../backend/internal/kudo/testdata/visible_text_vectors.json";
import { validateKudoInput } from "./kudo-input-schema";
import { visibleText, visibleTextLength } from "./visible-text-length";

interface SharedVector {
  name: string;
  html: string;
  text: string;
  length: number;
  contentCode: string;
  repeat?: { token: string; with: string; times: number };
}

const vectors = shared.vectors as SharedVector[];

function expand(vector: SharedVector, value: string): string {
  return vector.repeat ? value.replaceAll(vector.repeat.token, vector.repeat.with.repeat(vector.repeat.times)) : value;
}

// F005 SC-004 / N07: the client counter and the Go validator read the same file
// (Go: visible_text_shared_vectors_test.go), so they agree at every boundary.
describe("visibleText — shared ALG-002 vectors (identical to Go)", () => {
  it("loads the shared file", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(30);
  });

  it.each(vectors.map((v) => [v.name, v] as const))("%s", (_name, vector) => {
    const html = expand(vector, vector.html);
    expect(visibleText(html)).toEqual({ text: expand(vector, vector.text), length: vector.length });
    expect(visibleTextLength(html)).toBe(vector.length);
  });

  it.each(vectors.map((v) => [v.name, v] as const))("content rule agrees with Go: %s", (_name, vector) => {
    const errors = validateKudoInput(
      { receiverId: "r", title: "t", contentHtml: expand(vector, vector.html), hashtags: ["a"], imageCount: 0 },
      "create",
    );
    const code = errors.find((e) => e.field === "contentHtml")?.code ?? "";
    expect(code).toBe(vector.contentCode);
  });
});

describe("visibleText — editor-only details", () => {
  it("keeps a lone '<' that starts no tag as text", () => {
    expect(visibleText("<p>a < b</p>")).toEqual({ text: "a < b", length: 5 });
  });

  it("leaves an unknown named entity as written", () => {
    expect(visibleText("<p>&bogus;</p>").text).toBe("&bogus;");
  });
});
