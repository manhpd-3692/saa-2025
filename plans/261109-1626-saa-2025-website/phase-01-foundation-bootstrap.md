# Phase 01 — Foundation and bootstrap

## Context Links
- Contract: `reports/codex-findings-resolution-contract.md` R06, R16, R21, R23; Addendum N09
- Decisions: `spec/gap-resolution-log.md` G15–G19, AD01, AD13, AD15, C05
- Architecture handoff: `reports/shared-spec-context-for-wave-2.md` (§ Architecture, § Shared contracts)
- F002 bootstrap: `spec/google-sign-in-session-and-roles/technical-spec.md` § 4.2, § 4.6 "Auth and database bootstrap contract"
- F003 seeds: `spec/event-countdown-and-launch-gate/technical-spec.md` § 4.2 (seed scenarios)
- Data models: technical-spec § 4.2 of F002, F003, F005, F008, F009, F011, F012
- Next.js 16 guides (Read/Grep only): `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{layout,route-groups,proxy}.md`

## Overview
- Priority: P1 (blocks everything). Status: pending. Effort: 10h.
- Features: system, F001/F002 plumbing. Checklist: none directly; enables Đa ngôn ngữ (i18n plumbing) and all others.
- Stand up local Supabase, the Go module skeleton with transport/auth middleware, the full schema, sqlc, seed
  scenarios, Next.js root + route-group layout skeletons, i18n plumbing and the Go API client.

## Key Insights
- All schema ships here in dependency order so later phases never race on migrations (Codex top-5 #2).
- Route classes PUBLIC / IDENTITY-ONLY / PROFILE / ADMIN wrap per route; CORS wraps the whole mux (N09, R06).
- `users.id` = Supabase `auth.users.id` (FK, on delete cascade) → demo seed users need `auth.users` rows (local only).
- `saa_api` needs BYPASSRLS; hosted Supabase may refuse granting it → fallback: explicit `to saa_api using (true)` policies.
- `src/app/page.tsx` (scaffold) stays until Phase 5 creates `(shell)/page.tsx` (route conflict otherwise).
- Shared append points designed out: one `backend/cmd/api/wire_<capability>.go` per phase capability (package-main `init` appends to a
  registration slice; no per-package routes file), sqlc file per capability, i18n JSON per namespace loaded by dynamic import.

## Requirements
Functional
- F002 FR-601, FR-604 (A0 transport + route classes); SC-008 token rejection matrix; SC-010 bootstrap.
- R21: JWKS ES256/RS256 only, issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`, exp/nbf checked.
- R23: ReadHeaderTimeout 5 s, ReadTimeout 15 s, WriteTimeout 30 s; DB ctx 5 s (exports 20 s).
- R16: `SEED_SCENARIO` = `prelaunch` | `live` (default) | `after-ceremony`; demo activity within last 14 days.
- F001 FR-001/FR-002 (A0), FR-401 + BR-001/BR-003 (locale: cookie → Accept-Language → `vi`, `vi` key master, AD01).
Non-functional
- Secrets (DB URL, Storage service key) only in Go env (R21). Files < 200 lines. Go 1.22+ ServeMux patterns.

## Architecture
```
browser ──Bearer──► Go mux ─ CORS ─┬─ PUBLIC      (no JWT)
                                   ├─ IDENTITY    (JWT verify)
                                   ├─ PROFILE     (JWT + users row → AuthContext{userId, role})
                                   └─ ADMIN       (PROFILE + RequireAdmin)
Go ──pgx pool as saa_api──► Postgres (RLS deny-all; anon/authenticated no grants)
Next server ──fetch 5 s, Bearer from cookie session──► Go     Next never touches DB
```
Migrations (create via `supabase migration new`, in this order):
1. `roles_and_base_grants` — role `saa_api` (NOLOGIN in migration; local login password set by `backend/scripts/dev-db-role.sql` from env, never committed).
2. `users_units` (F002) — `units(id,name,code unique)`, `users(id→auth.users, email unique, name, avatar_url, role, unit_id, last_login_at, created_at)`.
3. `events` (F003) — `start_at`, `ceremony_at`, `venue`, `livestream_note`.
4. `kudos_uploads_images_hashtags` (F005) — `kudos`, `kudo_uploads(state enum pending|attached|pending_delete)`, `kudo_images(upload_id unique, position)`, `hashtags`, `kudo_hashtags`; indexes `(receiver_id, created_at desc, id)`, `(sender_id, created_at desc, id)`.
5. `campaigns` (F012) — checks `ends_at > starts_at`, `multiplier between 2 and 10 default 2`, name 1–100.
6. `hearts_secret_boxes_heart_state` (F008) — `hearts(unique kudo_id,user_id; weight; campaign_id on delete set null)`, `secret_boxes(seq, open_request_id uuid unique null, open_result jsonb)`, view `kudo_heart_state`, `users.icons_completed_at` (C05).
7. `notifications` (F009) — indexes incl. permanent partial unique `(recipient_id, dedupe_key) where kind in ('hero_level_up','icons_completed')` (N03).
8. `kudos_moderation_columns` (F011) — `moderation_version int default 0`, `moderated_by`, `moderated_at`.
9. `rls_deny_all_and_grants` — enable RLS on every business table, revoke `anon`/`authenticated` (incl. view), grant DML to `saa_api`.

## Related Code Files
Create (frontend, repo root)
- `supabase/config.toml` (Google provider only, asymmetric signing keys, bucket `kudo-images` private, 5 MB, jpeg/png/webp)
- `supabase/migrations/*_{1..9}.sql` (above), `supabase/seed.sql` (units name + code)
- `.env.example` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_API_BASE_URL, API_BASE_URL)
- `src/i18n/locale-config.ts`, `src/i18n/resolve-locale.ts`, `src/i18n/load-dictionary.ts`, `src/i18n/locale-provider.tsx`
- `src/i18n/dictionaries/{vi,en}/common.json`
- `src/lib/supabase/browser-client.ts`, `src/lib/supabase/server-client.ts`
- `src/lib/api/go-api-server.ts` (5 s AbortSignal.timeout, no-store, Bearer), `src/lib/api/go-api-browser.ts`, `src/lib/api/api-error.ts`
- `src/app/(shell)/layout.tsx`, `src/app/(minimal)/layout.tsx`, `src/app/admin/layout.tsx` (structural skeletons: render children; chrome in P3)
- `vitest.config.ts`
Modify: `src/app/layout.tsx` (html lang from locale, fonts, LocaleProvider only), `src/app/globals.css` (token block skeleton), `package.json` (deps `@supabase/ssr`, `@supabase/supabase-js`, `vitest`; scripts `test`)
Create (backend)
- `backend/go.mod`, `backend/sqlc.yaml` (schema = `../supabase/migrations`, queries = `db/queries`, out = `internal/db`, no interface), `backend/README.md`, `backend/.env.example`
- `backend/cmd/api/main.go` (config, pool, server timeouts, graceful shutdown), `backend/cmd/api/router.go` (mux, CORS wrap, iterate registrations)
- `backend/internal/config/config.go` (DATABASE_URL, SUPABASE_URL, FRONTEND_ORIGINS, ADMIN_EMAILS, STORAGE_SERVICE_KEY)
- `backend/internal/httpx/{cors_middleware.go, route_classes.go, json_response.go, error_envelope.go}`
- `backend/internal/auth/{jwks_verifier.go, auth_middleware.go, require_admin.go, auth_context.go}`
- `backend/internal/dbx/with_tx.go` (tx helper + 5 s ctx), `backend/internal/db/` (sqlc output)
- `backend/db/queries/auth.sql` (`GetProfileAuth`)
- `backend/cmd/seed/main.go`, `backend/db/seeds/{prelaunch,live,after-ceremony}.sql`, `backend/db/seeds/demo_activity.sql`
- `backend/scripts/dev-db-role.sql`, `backend/internal/testkit/{test_jwks_issuer.go, test_database.go}`
Delete: none.

## Implementation Steps
1. `supabase init` → edit `config.toml`: disable email/magic link, enable Google, asymmetric JWT keys, bucket config. `supabase start`.
2. Write migrations 1–9 in order; `supabase db reset` must apply cleanly from empty.
3. `go mod init`, add pgx/v5, a JWKS lib (e.g. `MicahParks/keyfunc` + `golang-jwt/jwt/v5`); write config + server with R23 timeouts.
4. CORS middleware exactly per R06 (204 preflight without JWT, methods, headers, expose `Content-Disposition`, max-age 600, no credentials).
5. JWT verifier (alg allow-list, iss, aud, exp/nbf) → AuthContext; PROFILE class loads `users.role` via `GetProfileAuth`; 403 `profile_not_provisioned` when missing; `RequireAdmin` → 403.
6. `route_classes.go` helpers `Public/Identity/Profile/Admin(handler)`; `router.go` wraps mux in CORS; `wire_<capability>.go` pattern documented in `backend/README.md`.
7. sqlc config + `sqlc generate`; `dbx.WithTx`.
8. Seed runner: `SEED_SCENARIO` picks SQL file; demo activity inserts `auth.users` + `users` + kudos/hearts/boxes dated within 14 days; units from `supabase/seed.sql`.
9. testkit: in-process ES256 JWKS server for tests (config `SUPABASE_JWKS_URL` override); DB truncation helper for `-tags integration`.
10. Frontend: Supabase browser/server clients (publishable key only); Go API clients; locale resolver + dictionary loader (`import(\`./dictionaries/${locale}/${ns}.json\`)`, `vi` fallback per key); root layout; route-group skeletons.
11. Vitest config + first unit tests (resolve-locale, dictionary fallback).

## Todo List
- [ ] Supabase config + `db reset` clean
- [ ] 9 migrations in dependency order
- [ ] Go server, config, timeouts
- [ ] CORS + route classes + JWT + RequireAdmin
- [ ] sqlc + tx helper
- [ ] Seed runner + 3 scenarios + demo activity
- [ ] testkit (JWKS issuer, DB helper)
- [ ] Next root/route-group skeletons, Supabase clients, Go API clients
- [ ] i18n plumbing + Vitest

## Success Criteria
- `supabase db reset && go run ./cmd/seed` works for each scenario; `go build ./...`, `go vet ./...`, `npm run build`, `npm run lint` pass.
- Go unit tests: CORS preflight 204 w/o JWT; F002 SC-008 matrix (forged, expired, nbf, wrong iss/aud, HS256, `alg: none` → 401; body `role: admin` ignored).
- Integration (`-tags integration`): F002 SC-010 — `anon` direct read of every business table + view refused; `saa_api` can query.
- Vitest: cookie → Accept-Language → `vi` order; missing EN key falls back to VN.

## Scope Contract
- Changed: new `supabase/`, `backend/` skeleton, i18n + API client modules, root/route-group layouts.
- Impacted: every later phase (schema, auth chain, client helpers).
- Will verify: Go unit (middleware/JWT), integration (grants/RLS), Vitest (locale), build/lint. Safety-critical (auth, migrations, config) → run in full.
- Deliberately skipped: UI visuals (none yet); E2E (no flows yet).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| BYPASSRLS grant refused on hosted Supabase | M | M | Fallback `saa_api` policies; local first |
| Local Supabase signs HS256 by default | M | H | Configure asymmetric signing keys; SC-008 rejects HS256 |
| Schema mistake discovered later | M | M | Pre-release: edit + `db reset`; after data exists: forward-only migration |
| auth.users seeding diverges from real tokens | L | M | Seeds only for demo; real flow tested in P2/P14 |

## Security Considerations
- Secrets only in `backend/.env` (gitignored); `.env.example` carries names only. No service key in Next.
- Deny-all RLS + no browser grants is defence in depth; Go is the only data path.

## Rollback
- Pre-release: revert phase commits, `supabase db reset`. Nothing user-facing changes.

## Next Steps
- Phase 2 builds the risk path on this skeleton.
- Open items: confirm BYPASSRLS behaviour on target host (no hosting target in specs).
