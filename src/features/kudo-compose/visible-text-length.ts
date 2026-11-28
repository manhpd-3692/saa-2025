/**
 * Client mirror of ALG-002 (F005, Codex R20, N07), held to the same vectors as
 * the Go validator (`backend/internal/kudo/testdata/visible_text_vectors.json`):
 * walk the HTML in document order, join text with no separator (entities
 * decoded, a mention counts as its shown `@Name`), add one "\n" for every
 * `<br>` and each open/close of `p`, `li`, `blockquote`, then collapse every
 * whitespace run to one space and trim. Length = Unicode code points (an emoji
 * surrogate pair counts once).
 *
 * It reads the editor's HTML, never the editor's own text export, which uses
 * other separators. Whitespace is Go's `unicode.IsSpace` set (NEL is space,
 * BOM is not), not JavaScript's `\s`. `script`/`style` content is skipped like
 * the Go sanitizer drops it, so pasted markup counts the same on both sides.
 */

const BLOCK_TAGS = new Set(["p", "li", "blockquote"]);
const SKIPPED_CONTENT = new Set(["script", "style"]);
// A start or end tag; quoted attribute values may contain ">".
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:[^>"']|"[^"]*"|'[^']*')*>/y;
const ENTITY = /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g;
const NBSP = String.fromCharCode(0xa0);
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
const NAMED_ENTITIES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: NBSP };

/** Go `unicode.IsSpace` (written as code points so no editor can turn them into look-alikes). */
export function isGoSpace(codePoint: number): boolean {
  return (
    (codePoint >= 0x09 && codePoint <= 0x0d) ||
    codePoint === 0x20 ||
    codePoint === 0x85 ||
    codePoint === 0xa0 ||
    codePoint === 0x1680 ||
    (codePoint >= 0x2000 && codePoint <= 0x200a) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    codePoint === 0x202f ||
    codePoint === 0x205f ||
    codePoint === 0x3000
  );
}

/** Go `strings.Fields` joined by one space: every whitespace run -> " ", trimmed. */
export function collapseGoSpace(value: string): string {
  const words: string[] = [];
  let word = "";
  for (const ch of value) {
    if (isGoSpace(ch.codePointAt(0) ?? 0)) {
      if (word) words.push(word);
      word = "";
    } else {
      word += ch;
    }
  }
  if (word) words.push(word);
  return words.join(" ");
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY, (whole, body: string) => {
    if (body[0] !== "#") return NAMED_ENTITIES[body] ?? whole;
    const hex = body[1] === "x" || body[1] === "X";
    const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
    const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
    return valid ? String.fromCodePoint(code) : REPLACEMENT_CHARACTER;
  });
}

/** Index just past the end tag closing a skipped element opened before `from`. */
function skipElementContent(html: string, name: string, from: number): number {
  const close = html.toLowerCase().indexOf(`</${name}`, from);
  if (close === -1) return html.length;
  const end = html.indexOf(">", close);
  return end === -1 ? html.length : end + 1;
}

export interface VisibleText {
  text: string;
  /** Unicode code points of `text`. */
  length: number;
}

export function visibleText(html: string): VisibleText {
  let buffer = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      buffer += decodeEntities(html.slice(i));
      break;
    }
    buffer += decodeEntities(html.slice(i, lt));
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    TAG.lastIndex = lt;
    const tag = TAG.exec(html);
    if (!tag) {
      buffer += "<"; // a "<" that starts no tag is text
      i = lt + 1;
      continue;
    }
    i = TAG.lastIndex;
    const closing = tag[1] === "/";
    const name = tag[2].toLowerCase();
    if (!closing && SKIPPED_CONTENT.has(name)) i = skipElementContent(html, name, i);
    else if (name === "br" || BLOCK_TAGS.has(name)) buffer += "\n";
  }
  const text = collapseGoSpace(buffer);
  return { text, length: [...text].length };
}

/** The 0/1,000 counter value (FR-203). */
export function visibleTextLength(html: string): number {
  return visibleText(html).length;
}
