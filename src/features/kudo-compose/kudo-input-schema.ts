import { isGoSpace, visibleTextLength } from "./visible-text-length";

/**
 * Client mirror of the Go kudo rules (F005 § 4.4, `kudo_input_validation.go`)
 * for instant feedback only — Go stays authoritative and answers 422 with the
 * same field names and codes. BR-001 (self kudo) is not checked here: the
 * recipient search never offers the caller and Go refuses it.
 */

export const CONTENT_MAX_CHARS = 1000; // BR-004, code points of visible text (ALG-002)
export const TITLE_MAX_CHARS = 100; // BR-004 (D010)
export const HASHTAGS_MAX = 5; // BR-002
export const HASHTAG_MAX_CHARS = 50; // Go HashtagMaxChars
export const IMAGES_MAX = 5; // BR-003
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // BR-003 (D008)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type KudoField = "receiverId" | "title" | "contentHtml" | "hashtags" | "images";
export type FieldCode = "required" | "invalid" | "too_long" | "too_many" | "self_kudo" | "unavailable";

export interface FieldError {
  field: KudoField;
  code: FieldCode;
}

export interface KudoInput {
  receiverId: string | null;
  title: string;
  contentHtml: string;
  hashtags: readonly string[];
  imageCount: number;
}

const codePoints = (s: string) => [...s].length;
const isSpace = (ch: string) => isGoSpace(ch.codePointAt(0) ?? 0);
const isHashOrSpace = (ch: string) => ch === "#" || isSpace(ch);

/** Go `strings.TrimLeftFunc` / `TrimRightFunc` over code points. */
function trimWhile(value: string, drop: (ch: string) => boolean, side: "start" | "end"): string {
  const chars = [...value];
  if (side === "start") {
    let i = 0;
    while (i < chars.length && drop(chars[i])) i++;
    return chars.slice(i).join("");
  }
  let end = chars.length;
  while (end > 0 && drop(chars[end - 1])) end--;
  return chars.slice(0, end).join("");
}

/** Go `unicode.IsControl` anywhere in the value (C0, DEL, C1). */
function hasControl(value: string): boolean {
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/** Go `strings.TrimSpace`. */
export function trimGoSpace(value: string): string {
  return trimWhile(trimWhile(value, isSpace, "start"), isSpace, "end");
}

/** Go `strings.ToLower`: simple per-code-point mapping (no final-sigma rule). */
function goToLower(value: string): string {
  return [...value]
    .map((ch) => {
      if (ch === "İ") return "i";
      const lower = ch.toLowerCase();
      return codePoints(lower) === 1 ? lower : ch;
    })
    .join("");
}

/** BR-002 for one name: leading `#`/spaces stripped, trailing spaces trimmed, lower-cased. */
export function normalizeHashtag(raw: string): string {
  return goToLower(trimWhile(trimWhile(raw, isHashOrSpace, "start"), isSpace, "end"));
}

/** BR-002 for a list: normalized, empties dropped, first occurrence kept; a bad name refuses the list. */
export function normalizeHashtags(raw: readonly string[]): { names: string[]; code: FieldCode | null } {
  const names: string[] = [];
  for (const value of raw) {
    const name = normalizeHashtag(value);
    if (name === "") continue;
    if (hasControl(name)) return { names: [], code: "invalid" };
    if (codePoints(name) > HASHTAG_MAX_CHARS) return { names: [], code: "too_long" };
    if (!names.includes(name)) names.push(name);
  }
  return { names, code: null };
}

/** Every refused field, in Go's order (receiver, title, content, hashtags), then images. */
export function validateKudoInput(input: KudoInput, mode: "create" | "edit"): FieldError[] {
  const errors: FieldError[] = [];
  if (mode === "create" && !input.receiverId) errors.push({ field: "receiverId", code: "required" });

  const title = trimGoSpace(input.title);
  if (title === "") errors.push({ field: "title", code: "required" });
  else if (hasControl(title)) errors.push({ field: "title", code: "invalid" });
  else if (codePoints(title) > TITLE_MAX_CHARS) errors.push({ field: "title", code: "too_long" });

  const length = visibleTextLength(input.contentHtml);
  if (length === 0) errors.push({ field: "contentHtml", code: "required" });
  else if (length > CONTENT_MAX_CHARS) errors.push({ field: "contentHtml", code: "too_long" });

  const hashtags = normalizeHashtags(input.hashtags);
  if (hashtags.code) errors.push({ field: "hashtags", code: hashtags.code });
  else if (hashtags.names.length === 0) errors.push({ field: "hashtags", code: "required" });
  else if (hashtags.names.length > HASHTAGS_MAX) errors.push({ field: "hashtags", code: "too_many" });

  if (input.imageCount > IMAGES_MAX) errors.push({ field: "images", code: "too_many" });
  return errors;
}

/** Why one picked file is refused before upload (A4 fast feedback), or null. */
export function imageFileProblem(file: { type: string; size: number }): "type" | "size" | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) return "size";
  return null;
}
