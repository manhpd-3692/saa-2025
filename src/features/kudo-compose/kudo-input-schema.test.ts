import { describe, expect, it } from "vitest";
import {
  imageFileProblem,
  normalizeHashtags,
  validateKudoInput,
  type FieldError,
  type KudoInput,
} from "./kudo-input-schema";

const base = (): KudoInput => ({ receiverId: "r", title: "Cảm ơn", contentHtml: "<p>hi</p>", hashtags: ["a"], imageCount: 0 });

// Mirrors backend/internal/kudo/kudo_input_validation_test.go TestNormalizeHashtags (BR-002, W1).
describe("normalizeHashtags mirrors Go normalizeHashtags", () => {
  it.each<[string, string[], string[], string | null]>([
    ["BR-002 rules", [" #Teamwork", "teamwork", "##KAIZEN ", "#", "  ", "Sun* Spirit"], ["teamwork", "kaizen", "sun* spirit"], null],
    ["Vietnamese", ["#TiếngViệt", "tiếngviệt", "ĐOÀN KẾT"], ["tiếngviệt", "đoàn kết"], null],
    ["hash after space", ["# #Kaizen", " # # "], ["kaizen"], null],
    ["50 runes", ["Đ".repeat(50)], ["đ".repeat(50)], null],
    ["51 runes", ["ok", "đ".repeat(51)], [], "too_long"],
    ["NUL", ["ok", "a\u0000b"], [], "invalid"],
    ["tab inside", ["a\tb"], [], "invalid"],
    ["C1 control", ["bad\u009btag"], [], "invalid"],
    ["simple lower-casing like Go", ["İSTANBUL", "ΣΟΦΙΑΣ", "ǅUNGLA"], ["istanbul", "σοφιασ", "ǆungla"], null],
  ])("%s", (_name, input, names, code) => {
    expect(normalizeHashtags(input)).toEqual({ names, code });
  });
});

// Mirrors TestValidateCreateReportsEveryField and TestValidateCreateHardensUserInput.
describe("validateKudoInput mirrors the Go 422 field rules", () => {
  it("reports every refused field at once, in Go's order", () => {
    const errors = validateKudoInput(
      { receiverId: null, title: "t".repeat(101), contentHtml: "<p> </p>", hashtags: ["a", "b", "c", "d", "e", "f"], imageCount: 0 },
      "create",
    );
    expect(errors).toEqual<FieldError[]>([
      { field: "receiverId", code: "required" },
      { field: "title", code: "too_long" },
      { field: "contentHtml", code: "required" },
      { field: "hashtags", code: "too_many" },
    ]);
  });

  it("accepts 100 code points of title after trimming, and normalizes hashtags", () => {
    expect(validateKudoInput({ ...base(), title: `  ${"é".repeat(100)} `, hashtags: ["#A"] }, "create")).toEqual([]);
    expect(validateKudoInput({ ...base(), title: "\tThanks team\n" }, "create")).toEqual([]);
  });

  it.each<[string, Partial<KudoInput>, FieldError]>([
    ["NUL in title", { title: "Thanks\u0000 team" }, { field: "title", code: "invalid" }],
    ["DEL in title", { title: "Thanks\u007f" }, { field: "title", code: "invalid" }],
    ["newline inside title", { title: "Thanks\nteam" }, { field: "title", code: "invalid" }],
    ["blank title", { title: "   " }, { field: "title", code: "required" }],
    ["NUL in hashtag", { hashtags: ["ok", "bad\u0000tag"] }, { field: "hashtags", code: "invalid" }],
    ["51-rune hashtag", { hashtags: ["ệ".repeat(51)] }, { field: "hashtags", code: "too_long" }],
    ["only empty hashtags", { hashtags: [" # "] }, { field: "hashtags", code: "required" }],
    ["content over 1,000", { contentHtml: `<p>${"a".repeat(1001)}</p>` }, { field: "contentHtml", code: "too_long" }],
    ["empty content", { contentHtml: "<p>&nbsp;</p>" }, { field: "contentHtml", code: "required" }],
    ["six images", { imageCount: 6 }, { field: "images", code: "too_many" }],
  ])("%s", (_name, change, error) => {
    expect(validateKudoInput({ ...base(), ...change }, "create")).toEqual([error]);
  });

  it("does not ask for a recipient in edit mode (the recipient is locked)", () => {
    expect(validateKudoInput({ ...base(), receiverId: null }, "edit")).toEqual([]);
  });
});

describe("imageFileProblem (A4 fast feedback)", () => {
  it.each<[string, { type: string; size: number }, "type" | "size" | null]>([
    ["png", { type: "image/png", size: 10 }, null],
    ["webp at 5 MB", { type: "image/webp", size: 5 * 1024 * 1024 }, null],
    ["gif", { type: "image/gif", size: 10 }, "type"],
    ["over 5 MB", { type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }, "size"],
    ["empty file", { type: "image/jpeg", size: 0 }, "size"],
  ])("%s", (_name, file, problem) => {
    expect(imageFileProblem(file)).toBe(problem);
  });
});
