/**
 * Names of the `@supabase/ssr` browser session cookies in a `document.cookie`
 * string: `sb-<project ref>-auth-token`, its `.N` chunks and the PKCE
 * `-code-verifier`. Used to end the session locally when Supabase Auth does not
 * confirm a sign-out (F002 FR-402). Pure, so it is unit-tested.
 */
const SESSION_COOKIE = /^sb-[^=;\s]+-auth-token(?:\.\d+|-code-verifier)?$/;

export function supabaseSessionCookieNames(cookieHeader: string): string[] {
  return cookieHeader
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => SESSION_COOKIE.test(name));
}
