import { describe, expect, it } from "vitest";
import { supabaseSessionCookieNames } from "./session-cookie-names";

describe("supabaseSessionCookieNames (sign-out fallback, FR-402)", () => {
  it("finds the session cookie, its chunks and the PKCE verifier", () => {
    const header =
      "saa_locale=en; sb-127-auth-token.0=base64-abc; sb-127-auth-token.1=def; sb-127-auth-token-code-verifier=x; theme=dark";
    expect(supabaseSessionCookieNames(header)).toEqual([
      "sb-127-auth-token.0",
      "sb-127-auth-token.1",
      "sb-127-auth-token-code-verifier",
    ]);
    expect(supabaseSessionCookieNames("sb-abcdefgh-auth-token=base64-x")).toEqual(["sb-abcdefgh-auth-token"]);
  });

  it("leaves every other cookie alone", () => {
    expect(supabaseSessionCookieNames("")).toEqual([]);
    expect(supabaseSessionCookieNames("saa_locale=vi; sb-127-other=1; my-sb-127-auth-token=1")).toEqual([]);
  });
});
