# Review — Phase 01 Foundation and bootstrap (uncommitted, branch feat/phase-01-foundation-bootstrap)

Score 8.5/10 · Critical 0 · Warnings 8 · Suggestions 10 · Status DONE_WITH_CONCERNS (no blocker; fix W1-W4 + W7 before commit)

## Scope
- Reviewed: `supabase/` (config.toml, 9 migrations, seed.sql), `backend/` (cmd/api, cmd/seed, internal/{auth,config,dbx,httpx,testkit}, db/queries, db/seeds, scripts, sqlc.yaml, go.mod), `src/i18n/**`, `src/lib/**`, root + route-group layouts, eslint/package/gitignore changes, `.env.example` files.
- Depth: full on every new file. Generated sqlc (`internal/db/*`) only spot-checked.
- Run by me (WSL Go 1.25, Supabase up): `go build ./... && go vet ./... && go test ./...` PASS; `go vet -tags integration` PASS; integration subset (browser-role denial on 12 tables + view, every-public-relation-is-listed/RLS/no-policy, saa_api bypassrls + GetProfileAuth, local JWKS only asymmetric + token signed by local Supabase verifies) PASS; `tsc --noEmit` clean; `eslint src` clean; `vitest run` 27/27; `next build` PASS (all routes dynamic). Not run: `with_tx` integration tests (they truncate local data), `supabase db reset` from empty.

## Assessment
Solid foundation. JWT acceptance, route classes, CORS, deny-all grants and seed loopback guard all match R06/R21/R23/N09 and are covered by tests that fail on the real bug (SC-008 matrix incl. alg none/HS256/ES384/unknown kid/forged key). No secret committed; no `any`; files all < 200 lines (generated models.go and config.toml exempt). The open items are hardening and hand-off hazards, not defects in the stated contracts.

## Critical
None.

## Warnings

W1 — JWKS/issuer URL may be plain http on any host. `backend/internal/config/config.go:98-108` (`parseHTTPURL`) accepts `http://` for SUPABASE_URL and SUPABASE_JWKS_URL regardless of host. A hosted deployment misconfigured with http lets a network attacker substitute the JWKS and mint any identity (full auth bypass, role still from DB but sub/email forged → admin email takeover via provision). Fix: in `Load`, for SupabaseURL and JWKSURL require `https` unless `dbx`-style loopback host (reuse `isLoopbackHost`, export it); add a config test (`http://supabase.example.com` rejected, `http://127.0.0.1:54321` accepted).

W2 — No panic recovery. `backend/cmd/api/router.go:45` wraps only CORS. A handler panic is recovered by net/http per connection, the client gets a dropped connection with no CORS headers (browser shows a CORS/network error, not a 500 envelope), and only the stdlib ErrorLog line is emitted. Fix: add `httpx.Recover` (defer/recover → `slog.Error` with stack, `WriteInternalError`) placed inside CORS, outside route classes; one test.

W3 — `email_verified` is read from `user_metadata`, which the signed-in user can overwrite (`auth.updateUser({data})`). `jwks_verifier.go:86-87,119`, `auth_context.go:36`. The `email` claim and `app_metadata.provider` are server-controlled, so exploitation needs a Google identity whose email Google reports unverified; narrow but it is exactly the R21 "email_verified = true" gate and it is client-forgeable. Fix options (pick one, record in spec): (a) accept as residual risk and say so in F002 § 4.4; (b) additionally require `app_metadata.providers` to contain only `google` and `amr` method `oauth`; (c) have provision query `auth.identities.identity_data->>'email_verified'` (needs a narrow grant/SECURITY DEFINER view for saa_api). Do not rely on the flag alone without a recorded decision.

W4 — Missing indexes the F011 spec marks `[EXPECTED]`: `kudos(created_at desc)` and `kudos(status, created_at desc)` (board + moderation list, ordered/filtered by status without sender/receiver). `supabase/migrations/20261110070238_kudos_uploads_images_hashtags.sql:25-26` only indexes sender/receiver. All schema is meant to ship in Phase 1 (phase Key Insights) so later phases do not race migrations. Fix: add `create index kudos_status_created_idx on public.kudos (status, created_at desc, id);` and `create index kudos_created_idx on public.kudos (created_at desc, id);` to migration 4 (pre-release: edit + `db reset`, per phase Rollback).

W5 — `SUPABASE_SERVICE_KEY` is required at boot but unused in Phase 1 (`config.go:61`), so the API cannot start without a secret nothing reads yet; and a `service_role`/secret key is broader than "Storage" (it also opens GoTrue admin: list/delete users). Deviation from phase file name (STORAGE_SERVICE_KEY) is correct — F002 § 4.6 outranks the phase file — but record it in the phase file/README. Fix: make it optional until F005 (validate when the upload service is constructed), and add a redacting `LogValue()`/`String()` on `Config` so `deps.Config` can never be logged with the key.

W6 — Wrong comment + hand-off hazard in server Supabase client. `src/lib/supabase/server-client.ts:9` says "session refresh happens in the browser client"; F002 A5 says `proxy.ts` refreshes and writes cookies. With `enable_refresh_token_rotation = true` (config.toml) and a no-op `setAll`, any server-side `getSession()` that finds an expiring token refreshes in memory and discards the rotated token; after the 10 s reuse window the cookie's refresh token is dead (or the family is revoked) and the user is logged out. No-op `setAll` itself is the right call for Server Components (cookie writes unsupported there) — judged OK. Fix now: correct the comment; Phase 2 must (1) refresh in `proxy.ts` and forward renewed cookies on the request seen by Server Components, (2) give `/auth/callback` its own cookie-writing client (this one cannot serve the route handler). Add both to the Phase 2 file.

W7 — Unrelated/unsafe files in the working tree that must not ride this commit: `.mcp.json` (remote MCP server plus `headersHelper` that runs `npx -y @momorph/cli` on session start — separate chore, deliberate decision) and `plans/261109-1626-saa-2025-website/spec/.claude/agent-memory/**` (agent memory; root `.gitignore` only has anchored `/.claude/`). Fix: stage explicitly (no `git add -A`), change `.gitignore` to `.claude/` (unanchored).

W8 — Route-class guard is convention only. `cmd/api/router.go:19-31`: a capability that calls `mux.Handle(p, h)` without `d.Routes.*` is silently PUBLIC; "new route defaults to Profile" is not enforced. Fix: add a test in `router_test.go` that mounts every `routeRegistrations` entry on a mux with real chains and asserts every `/api/v1/*` pattern except an explicit allow-list (`GET /api/v1/events/current`) answers 401 without a token (needs a way to enumerate patterns: wrap `*http.ServeMux` in a small recorder type passed to `routeRegistration`, or have `RouteClasses` expose `Handle(mux, pattern, class, h)`).

## Suggestions
S1 — `export const instant = false` (`src/app/layout.tsx:26`): judged acceptable. Verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`: `false` on the root layout is the documented opt-out of static-shell/instant validation; stable since 16.3, and `next build` passes. Cost: `<html lang>` needs cookie/header so every route is dynamic (`/` and `/_not-found` show `ƒ`), and the app loses instant-nav validation. Keep, but note it in docs/system-architecture and revisit when Login (public, static candidate) lands in Phase 3.
S2 — Go directive 1.25.0 (`go.mod:3`): fine if a dependency floor forces it (x/sync/x/text recent); otherwise lower to what is needed. README says "Go 1.22+ patterns"; state "1.25" in README toolchain section.
S3 — `@types/node ^22.20.5`: fine (Next 16 needs Node ≥ 20.9; dev machine is Node 26). Add `engines.node` to package.json so types and runtime agree.
S4 — `vitest.config.ts` triggers Vite's CJS/ESM warning; rename to `vitest.config.mts`. Also `include` is `*.test.ts` only; add `tsx` when component tests arrive.
S5 — Unmatched routes/405 are plain-text from ServeMux, not the error envelope. Add a catch-all `/` handler returning `{error:{code:"not_found"}}` behind CORS so the frontend `parseApiError` never sees `unknown_error`.
S6 — Defence in depth: `supabase/config.toml:14` exposes `public` via PostgREST though no table is granted; set `schemas = ["graphql_public"]` (or empty) since the product never uses the Data API. `skip_nonce_check = true` (line 363) is local-only; put a comment so nobody copies it to hosted.
S7 — Hosted `DATABASE_URL` via Supabase transaction pooler breaks pgx prepared-statement cache; README: use session pooler/direct, or `default_query_exec_mode=cache_describe`. Also consider `alter role saa_api set statement_timeout` / `idle_in_transaction_session_timeout` as a backstop to the 5 s context deadline.
S8 — `config.parseOrigins` (`config.go:124`): lowercase host (`u.Hostname()`) so `HTTP://LOCALHOST:3000` matches browser origins; trivial.
S9 — Seed guard (`dbx/loopback_guard.go`) cannot detect an SSH/`kubectl` tunnel on 127.0.0.1 to a hosted DB. Cheap extra: refuse when `auth.users` already holds any email not ending `.demo@sun-asterisk.com`-style demo ids (or require `SEED_CONFIRM_LOCAL=1`). Optional.
S10 — Migrations have no down path (Supabase CLI is forward-only). Red-flag list asks for a rollback strategy: the phase file's "pre-release revert + `db reset`" is enough now; add a one-line "after first real data: forward-only migrations" rule to backend/README. Also note FKs from `kudos`/`hearts`/`notifications` to `users` are NO ACTION, so deleting an `auth.users` row with activity fails; fine until a user-deletion story exists, document it.

## Edge cases turned up (scouting)
- Token with no `kid`: keyfunc v3 errors → 401 (not covered by a test; add one case to the SC-008 matrix).
- JWKS unreachable at boot: verified in keyfunc v3.9.1 source that `NoErrorReturnFirstHTTPReq` defaults true, so the code comment is correct; until the hourly refresh, an unknown `kid` retriggers one fetch per minute, so recovery is ≤ 1 min.
- Clock skew: no `WithLeeway`; a Go host slightly ahead of Supabase rejects a fresh token via `nbf`/`exp` edge. Consider 5-30 s leeway.
- `iat` not validated (fine); `role` claim not checked (anon-key JWTs lack `email`/`sub` so they already fail).
- Preflight from a disallowed origin returns bare 204 (no ACAO) — correct, browser blocks.
- Admin route with a deleted profile → 403 `profile_not_provisioned` (matches § 4.4 table), tested.
- `WithTxTimeout`: rollback runs on a fresh 2 s context after deadline; panic path rolls back; named-result `err` joined correctly.
- Seed runs both files in one tx via simple protocol (no args) — correct; `demo_activity` temp tables `on commit drop`.

## Contract check
| Item | Result |
|---|---|
| R06 CORS (exact origins, 204 preflight pre-auth, methods/headers/expose/max-age 600, no credentials) | Met, tested incl. assembled router |
| R21 JWT: ES256/RS256 allow-list, iss, aud, exp required, nbf, kid refresh | Met; `none`/HS256/ES384/foreign key rejected |
| R21 eligibility (verified, google, domain case-insens.) | Met, but flag is client-writable (W3); stricter than § 4.4 step 3 (applies per request) — acceptable |
| Role only from `users.role`, per request | Met; test with body/header/query role ignored |
| R21 DB: saa_api NOLOGIN in migration, no committed password, BYPASSRLS, RLS deny-all, anon/authenticated no grants incl. view | Met; integration verified. `service_role` revoke + default-privileges revoke = reasonable hardening beyond R21 (Storage uses its own DB role) — accept |
| R23 Go timeouts 5/15/30 s, DB ctx 5 s, exports 20 s const, graceful shutdown | Met (no `WithExportTx` helper yet — F010) |
| R23 Next fetch 5 s | Met (`go-api-server.ts`, AbortSignal.timeout, no-store; browser client has none, as designed) |
| R16 seeds (prelaunch/live/after-ceremony intervals, demo ≤ 14 d, loopback guard) | Met; intervals match spec exactly |
| N03 partial unique + unread-merge unique + once-ever needs dedupe check | Met, exact predicates |
| N09 route classes, CORS outermost | Met (enforcement gap W8) |
| Data models F002/F003/F005/F008/F009/F011/F012 (names, checks, FK rules, set null on heart.campaign_id, notification kind list) | Met; indexes missing W4 |
| Frontend: no secret in client; only NEXT_PUBLIC url + publishable key; `server-only` on server modules | Met |
| Locale cookie → Accept-Language (q-weights, q=0) → vi; vi key fallback | Met, unit-tested |
| File size < 200 / naming | Met (kebab-case TS, Go snake_case files) |

Deviations judged: SUPABASE_SERVICE_KEY — accept (spec precedence), see W5. service_role revoked — accept. go 1.25 — accept (S2). `instant=false` — accept (S1). setAll no-op — accept for Server Components, comment wrong (W6). `@types/node` 22 — accept (S3).

## Done well
- Verifier is built from `jwt.WithValidMethods` + required exp + issuer + audience; failures all wrap one sentinel, 401 body never says why, debug-only log without token.
- Fail-closed `RequireAdmin` (logs misuse), typed context keys, role never from claims.
- Integration test that fails when a new public relation is not listed/RLS'd — protects the deny-all invariant for later phases.
- Passwords by psql variable with length gate; `.env*` ignored with `!.env.example`; signing_keys.json ignored.
- `wire_<capability>.go` + per-capability sqlc/i18n files remove shared append points; conflict test.
- Config reports all problems at once; seed refuses non-loopback including fallbacks.

## Actions in order
1. W1 https-only for non-loopback SUPABASE_URL/JWKS (+test).
2. W7 stage explicitly; drop `.mcp.json` and `spec/.claude/` from the commit; unanchor `.claude/` ignore.
3. W4 add the two kudos indexes to migration 4; `db reset`.
4. W2 recover middleware (+test); W8 route-class enforcement test.
5. W3 decide and record the email_verified policy in F002 spec.
6. W5 optional service key + redacting Config; W6 fix comment and write Phase 2 notes.
7. Suggestions S1-S10 as time allows (S5, S7, S10 are one-liners).

## Numbers
- Type coverage: strict TS, no `any`, `tsc` 0 errors (not measured as %).
- Test coverage: not measured; Go unit pass, integration subset pass, vitest 27 tests.
- Lint findings: eslint 0, go vet 0, gofmt 0.

## Still unresolved
- `supabase db reset` from empty and the full `-tags integration` run (with_tx, truncating) were not executed by me.
- Hosted-Supabase BYPASSRLS acceptance (phase open item) remains unconfirmed; fallback policies documented only.
- Whether `service_role` revoke interferes with any future Storage/Auth admin call from Go (it should not; verify in Phase 5 upload work).
