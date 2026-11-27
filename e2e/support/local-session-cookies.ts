/**
 * LOCAL-ONLY: mints a short-lived Supabase-shaped session for one test, in memory, so a spec can
 * act as a user without touching the shared storage states in playwright/.auth/ (for example a
 * logout that GoTrue would otherwise revoke, or an identity that has no profile row on purpose).
 * Same token and cookie shape as `create-local-test-session.ts` (see e2e/support/README.md); each
 * minted session gets a fresh `session_id`. Never import this from `src/`.
 */
import { createPrivateKey, randomUUID, sign, type JsonWebKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Cookie } from "@playwright/test";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "http://127.0.0.1:54321").replace(/\/+$/, "");
const TOKEN_TTL_SECONDS = 3600;
const MAX_CHUNK_SIZE = 3180; // @supabase/ssr cookie chunk limit

export interface LocalTestIdentity {
  userId: string;
  email: string;
  name: string;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function signingKey(): { jwk: JsonWebKey; kid: string } {
  const host = new URL(SUPABASE_URL).hostname;
  if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Refusing to mint a session for ${host}`);
  const keys = JSON.parse(readFileSync(join("supabase", "signing_keys.json"), "utf8")) as (JsonWebKey & {
    kid?: string;
    alg?: string;
    key_ops?: string[];
  })[];
  const key = keys.find((k) => k.alg === "ES256" && k.d && (!k.key_ops || k.key_ops.includes("sign")));
  if (!key?.kid) throw new Error("No ES256 private key with a kid in supabase/signing_keys.json");
  return { jwk: key, kid: key.kid };
}

/** Playwright cookies holding an `@supabase/ssr` session for `identity` on `baseURL`'s host. */
export function mintLocalSessionCookies(identity: LocalTestIdentity, baseURL: string): Cookie[] {
  const { jwk, kid } = signingKey();
  const iat = Math.floor(Date.now() / 1000);
  const userMetadata = { email: identity.email, email_verified: true, full_name: identity.name, name: identity.name };
  const appMetadata = { provider: "google", providers: ["google"] };
  const claims = {
    iss: `${SUPABASE_URL}/auth/v1`,
    aud: "authenticated",
    exp: iat + TOKEN_TTL_SECONDS,
    iat,
    sub: identity.userId,
    email: identity.email,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
    role: "authenticated",
    aal: "aal1",
    session_id: randomUUID(),
    is_anonymous: false,
  };
  const input = `${b64url(JSON.stringify({ alg: "ES256", kid, typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
  const signature = sign("sha256", Buffer.from(input), {
    key: createPrivateKey({ key: jwk, format: "jwk" }),
    dsaEncoding: "ieee-p1363",
  });
  const session = {
    access_token: `${input}.${b64url(signature)}`,
    token_type: "bearer",
    expires_in: TOKEN_TTL_SECONDS,
    expires_at: claims.exp,
    refresh_token: `local-test-${randomUUID()}`,
    user: { id: identity.userId, aud: "authenticated", role: "authenticated", email: identity.email, app_metadata: appMetadata, user_metadata: userMetadata },
  };
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  const encoded = `base64-${b64url(JSON.stringify(session))}`;
  const chunks =
    encoded.length <= MAX_CHUNK_SIZE
      ? [{ name: storageKey, value: encoded }]
      : (encoded.match(new RegExp(`.{1,${MAX_CHUNK_SIZE}}`, "g")) ?? []).map((value, i) => ({ name: `${storageKey}.${i}`, value }));
  const domain = new URL(baseURL).hostname;
  return chunks.map((c) => ({ ...c, domain, path: "/", expires: claims.exp, httpOnly: false, secure: false, sameSite: "Lax" }));
}

/** Names of the Supabase session cookies present in a cookie list. */
export function supabaseSessionCookieNames(cookies: { name: string }[]): string[] {
  return cookies.map((c) => c.name).filter((name) => /^sb-.+-auth-token(\.\d+)?$/.test(name));
}
