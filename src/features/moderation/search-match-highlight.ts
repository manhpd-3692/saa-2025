/** One run of text, marked when it is an occurrence of the search text. */
export interface TextRun {
  text: string;
  match: boolean;
}

/**
 * Splits `text` around every case-insensitive occurrence of `query` (Figma A3
 * 832:13197 marks the searched phrase in the Content cell). Without a query,
 * or when lower-casing changes the length (so offsets would drift), the text
 * is one unmarked run.
 */
export function splitSearchMatches(text: string, query: string): TextRun[] {
  const needle = query.trim().toLocaleLowerCase();
  const haystack = text.toLocaleLowerCase();
  if (!needle || haystack.length !== text.length) return [{ text, match: false }];
  const runs: TextRun[] = [];
  let from = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, from)) {
    if (at > from) runs.push({ text: text.slice(from, at), match: false });
    runs.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < text.length) runs.push({ text: text.slice(from), match: false });
  return runs.length ? runs : [{ text, match: false }];
}
