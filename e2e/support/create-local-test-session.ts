/**
 * LOCAL-ONLY test session factory for Playwright. Never import this from `src/`.
 *
 * Signs a Supabase-shaped ES256 access token with the local signing key
 * (`supabase/signing_keys.json`, gitignored) and writes the `@supabase/ssr` session cookie as a
 * Playwright storage state, so e2e tests skip the Google OAuth screen:
 *   playwright/.auth/user.json   regular user: sunner01.demo@sun-asterisk.com (demo seed)
 *   playwright/.auth/admin.json  admin: saa.admin.e2e@sun-asterisk.com (created here)
 *
 * The Go API still verifies the token through the JWKS and loads the role from `users`; nothing in
 * the app is bypassed. The admin role comes from ADMIN_EMAILS in backend/.env via the real
 * POST /api/v1/me/provision call.
 *
 * Run (repo root, Windows or Linux; Docker must reach the Supabase DB container):
 *   node e2e/support/create-local-test-session.ts
 * Re-run after `supabase db reset` or a reseed. Env: SUPABASE_URL (default http://127.0.0.1:54321,
 * must be loopback), API_BASE_URL (default http://localhost:8080), SAA_DB_CONTAINER.
 */
import { createPrivateKey, randomBytes, sign, type JsonWebKey } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "http://127.0.0.1:54321").replace(/\/+$/, "");
const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const DB_CONTAINER = process.env.SAA_DB_CONTAINER ?? "supabase_db_saa-2025";
const TOKEN_TTL_SECONDS = 7 * 24 * 3600; // local only, so long-lived
const COOKIE_TTL_SECONDS = 400 * 24 * 3600; // @supabase/ssr default maxAge
const MAX_CHUNK_SIZE = 3180; // @supabase/ssr chunker limit
const AUTH_DIR = join("playwright", ".auth");

interface TestUser {
  id: string;
  email: string;
  name: string;
  sessionId: string;
  file: string;
  /** Needs an auth.users + auth.identities row created here (the demo seed has sunner01). */
  createIdentity: boolean;
}

const USERS: TestUser[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    email: "sunner01.demo@sun-asterisk.com",
    name: "Nguyễn Văn An",
    sessionId: "e2e50000-0000-4000-8000-000000000001",
    file: "user.json",
    createIdentity: false,
  },
  {
    id: "e2e00000-0000-4000-8000-000000000001",
    email: "saa.admin.e2e@sun-asterisk.com",
    name: "SAA Admin E2E",
    sessionId: "e2e50000-0000-4000-8000-000000000002",
    file: "admin.json",
    createIdentity: true,
  },
];

function assertLoopback(raw: string): URL {
  const url = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error(`Refusing to run: SUPABASE_URL host "${url.hostname}" is not 127.0.0.1/localhost.`);
  }
  return url;
}

const q = (s: string) => `'${s.replaceAll("'", "''")}'`;

/** Idempotent local DB setup as postgres: admin identity + one auth.sessions row per user. */
function buildSetupSql(): string {
  const parts = ["begin;"];
  for (const u of USERS) {
    if (u.createIdentity) {
      const meta = { email_verified: true, full_name: u.name, name: u.name };
      parts.push(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           last_sign_in_at, confirmation_token, recovery_token, email_change_token_new, email_change,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
         values ('00000000-0000-0000-0000-000000000000', ${q(u.id)}, 'authenticated', 'authenticated',
           ${q(u.email)}, '', now(), now(), '', '', '', '',
           '{"provider":"google","providers":["google"]}', ${q(JSON.stringify(meta))}::jsonb, now(), now())
         on conflict (id) do nothing;`,
        `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values (${q(`google-${u.id}`)}, ${q(u.id)},
           ${q(JSON.stringify({ ...meta, sub: `google-${u.id}`, email: u.email, provider_id: `google-${u.id}` }))}::jsonb,
           'google', now(), now(), now())
         on conflict (provider_id, provider) do update set identity_data = excluded.identity_data;`,
      );
    }
    // GoTrue rejects a token whose session_id has no auth.sessions row (getUser), so keep one.
    parts.push(
      `insert into auth.sessions (id, user_id, created_at, updated_at, aal, refreshed_at)
       values (${q(u.sessionId)}, ${q(u.id)}, now(), now(), 'aal1', now())
       on conflict (id) do update set updated_at = now(), refreshed_at = now();`,
    );
  }
  parts.push("commit;");
  return parts.join("\n");
}

function runSetupSql(sql: string): void {
  const docker = process.platform === "win32" ? ["wsl", "docker"] : ["docker"];
  const args = [...docker, "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"];
  // `wsl` can time out on a cold start (its own errors come back as UTF-16), so retry briefly.
  let failure = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = spawnSync(args[0], args.slice(1), { input: sql, encoding: "utf8" });
    if (res.status === 0) return;
    failure = `${res.stderr}${res.stdout}`.replaceAll("\0", "").trim() || String(res.error);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }
  throw new Error(`psql in container "${DB_CONTAINER}" failed (is Supabase running and the demo seed applied?):\n${failure}`);
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

interface SigningKey {
  jwk: JsonWebKey;
  kid: string;
}

function loadSigningKey(): SigningKey {
  const keys = JSON.parse(readFileSync(join("supabase", "signing_keys.json"), "utf8")) as (JsonWebKey & { kid?: string; alg?: string; key_ops?: string[] })[];
  const key = keys.find((k) => k.alg === "ES256" && k.d && (!k.key_ops || k.key_ops.includes("sign")));
  if (!key?.kid) throw new Error("No ES256 private key with a kid in supabase/signing_keys.json");
  return { jwk: key, kid: key.kid };
}

async function assertKidPublished(kid: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  const jwks = (await res.json()) as { keys: { kid: string }[] };
  if (!jwks.keys.some((k) => k.kid === kid)) {
    throw new Error(`kid ${kid} is not in the local JWKS; restart Supabase so it loads supabase/signing_keys.json.`);
  }
}

/** Mirrors the claim shape of a GoTrue access token after Google sign-in. */
function signAccessToken(u: TestUser, key: SigningKey, iat: number) {
  const userMetadata = {
    iss: "https://accounts.google.com",
    sub: `google-${u.id}`,
    email: u.email,
    email_verified: true,
    full_name: u.name,
    name: u.name,
    provider_id: `google-${u.id}`,
    custom_claims: { hd: "sun-asterisk.com" },
  };
  const appMetadata = { provider: "google", providers: ["google"] };
  const claims = {
    iss: `${SUPABASE_URL}/auth/v1`,
    aud: "authenticated",
    exp: iat + TOKEN_TTL_SECONDS,
    iat,
    sub: u.id,
    email: u.email,
    phone: "",
    app_metadata: appMetadata,
    user_metadata: userMetadata,
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "oauth", timestamp: iat }],
    session_id: u.sessionId,
    is_anonymous: false,
  };
  const signingInput = `${b64url(JSON.stringify({ alg: "ES256", kid: key.kid, typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: createPrivateKey({ key: key.jwk, format: "jwk" }),
    dsaEncoding: "ieee-p1363",
  });
  const iso = new Date(iat * 1000).toISOString();
  const user = {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: iso,
    phone: "",
    confirmed_at: iso,
    last_sign_in_at: iso,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
    identities: [],
    created_at: iso,
    updated_at: iso,
    is_anonymous: false,
  };
  return { accessToken: `${signingInput}.${b64url(signature)}`, exp: claims.exp, user };
}

/** @supabase/ssr cookie value: "base64-" + base64url(session JSON), chunked as `<name>.<n>`. */
function sessionCookies(storageKey: string, session: object, now: number) {
  const encoded = `base64-${b64url(JSON.stringify(session))}`; // base64url is URI-safe: length is the encoded length
  const chunks =
    encoded.length <= MAX_CHUNK_SIZE
      ? [{ name: storageKey, value: encoded }]
      : (encoded.match(new RegExp(`.{1,${MAX_CHUNK_SIZE}}`, "g")) ?? []).map((value, i) => ({ name: `${storageKey}.${i}`, value }));
  return ["localhost", "127.0.0.1"].flatMap((domain) =>
    chunks.map((c) => ({
      ...c,
      domain,
      path: "/",
      expires: now + COOKIE_TTL_SECONDS,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
}

async function provision(accessToken: string, email: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/me/provision`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) console.log(`provision ${email}: HTTP ${res.status}`);
    else if (res.status === 404) console.warn(`provision ${email}: HTTP 404, POST /api/v1/me/provision is not implemented yet. admin.json was written; re-run this script once the endpoint exists so the users row (role admin) is created.`);
    else throw new Error(`provision ${email}: HTTP ${res.status} ${await res.text()}`);
  } catch (err) {
    if (err instanceof TypeError) console.warn(`provision ${email}: Go API not reachable at ${API_BASE_URL} (${err.message}); start it and re-run.`);
    else throw err;
  }
}

async function main(): Promise<void> {
  const supabaseUrl = assertLoopback(SUPABASE_URL);
  assertLoopback(API_BASE_URL);
  const storageKey = `sb-${supabaseUrl.hostname.split(".")[0]}-auth-token`;
  const key = loadSigningKey();
  await assertKidPublished(key.kid);
  runSetupSql(buildSetupSql());

  const iat = Math.floor(Date.now() / 1000);
  mkdirSync(AUTH_DIR, { recursive: true });
  for (const u of USERS) {
    const { accessToken, exp, user } = signAccessToken(u, key, iat);
    const session = {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: TOKEN_TTL_SECONDS,
      expires_at: exp,
      refresh_token: `local-test-${randomBytes(9).toString("base64url")}`,
      user,
    };
    const state = { cookies: sessionCookies(storageKey, session, iat), origins: [] };
    writeFileSync(join(AUTH_DIR, u.file), `${JSON.stringify(state, null, 2)}\n`);
    console.log(`wrote ${join(AUTH_DIR, u.file)} (${u.email}, cookie ${storageKey}, ${state.cookies.length / 2} chunk(s))`);
    if (u.createIdentity) await provision(accessToken, u.email);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
