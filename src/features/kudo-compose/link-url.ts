// "scheme:" not followed by a digit, so "localhost:3000" or "example.com:8080/x" read as host:port.
const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/**
 * The address typed in the "Thêm đường dẫn" box (FR-209) as an http(s) URL,
 * with https:// added when no scheme is given; null when it is not a valid
 * http(s) address. The Go sanitizer keeps no other scheme (ALG-001).
 */
export function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = EXPLICIT_SCHEME.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname ? url.href : null;
  } catch {
    return null;
  }
}
