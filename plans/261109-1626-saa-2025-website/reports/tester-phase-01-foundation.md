# Tester report: Phase 01 (Foundation and bootstrap)

Branch `feat/phase-01-foundation-bootstrap` (uncommitted). No implementation files were modified.

**Status:** BLOCKED (production build unverified; every other gate green)

## Commands and exit codes

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `curl http://127.0.0.1:54321/auth/v1/health` (first try) | 7 | Containers still starting. Waited, then healthy. |
| 2 | `go build ./...` (WSL) | 0 | Clean |
| 3 | `go vet ./...` (WSL) | 0 | Clean |
| 4 | `go vet -tags integration ./...` (WSL) | 0 | Clean |
| 5 | `sqlc diff` (WSL) | 0 | No generated-code drift |
| 6 | `go test -count=1 ./...` (WSL) | 0 | 6 packages ok (cmd/api, cmd/seed, internal/auth, config, httpx, plus the 3 packages with tests moved to integration). 3 packages have no test files. |
| 7 | `supabase db reset --local --yes` from empty, then `dev-db-role.sql`, then `SEED_SCENARIO=prelaunch go run ./cmd/seed` | 0 / 0 / 0 | 9 migrations applied, seed ok (users=8 kudos=14 hearts=64 secret_boxes=8) |
| 8 | Same reset/role/seed with `live` | 0 / 0 / 0 | Seed ok |
| 9 | Same reset/role/seed with `after-ceremony` | 0 / 0 / 0 | Seed ok |
| 10 | `go test -tags integration -count=1 -v ./...` (WSL, after step 9) | 0 | 105 PASS, 0 FAIL, 0 SKIP |
| 11 | `npm run typecheck` | 0 | `tsc --noEmit` clean |
| 12 | `npm run lint` | 0 | eslint clean |
| 13 | `npm test` (vitest) | 0 | 4 files, 27 tests passed |
| 14 | `npm run build` in repo | 1 | `Another next build process is already running`. `.next/lock` is stale, since no `next` process is running. Blocked, see below. |
| 15 | `npm run build` in a clean copy under the scratchpad | 1 | Turbopack could not resolve `next` through a `node_modules` junction. Full copy of `node_modules` blocked, see below. |
| 16 | `SEED_SCENARIO=live go run ./cmd/seed` (after an unexplained Supabase restart) | 1 | `connection refused` on 127.0.0.1:54322. Containers had restarted at about 14:46. |
| 17 | `go test -tags integration` (same restart window) | 1 | `connection refused` on 127.0.0.1:54321 and 54322. Environment, not product. |
| 18 | Re-run after health wait: reseed live, reseed again (idempotent), `go test -count=3 ./...`, `go test -tags integration -count=2 ./internal/auth/... ./internal/dbx/... ./cmd/api/...` | 0 / 0 / 0 / 0 | No flakes across repeats |
| 19 | Final `SEED_SCENARIO=live go run ./cmd/seed` (integration truncates business tables) | 0 | DB left seeded |

## Assertions confirmed in the test code (not just green)

- CORS: preflight from an allowed origin returns 204 without a JWT; other origins get no CORS headers (`httpx/cors_middleware_test.go`, `cmd/api/router_test.go`).
- SC-008 token matrix (`auth/jwks_verifier_test.go`): forged signature, tampered payload, expired, nbf in future, missing exp, wrong iss, wrong aud, HS256 secret, alg none, ES384, RS256 unknown kid, non-UUID sub, missing email, garbage, empty. All must return `ErrInvalidToken`.
- Role comes only from `users.role`: a `role: admin` claim, app_metadata role, and body role are ignored (`TestAuthMiddlewareTakesRoleOnlyFromUsersRow`).
- RequireAdmin: user gets 403 `forbidden`, admin gets 200, missing profile gets 403 `profile_not_provisioned`, other domain gets 403 `domain_not_allowed`.
- SC-010 grants (`dbx/database_bootstrap_integration_test.go`): `anon` and `authenticated` each refused (SQLSTATE 42501) on all 12 business tables and `kudo_heart_state`. The table list matches the migrations. A separate test fails if any public relation is unlisted. `saa_api` can query all of them.
- Locale: `resolveLocale` tests assert cookie > Accept-Language > vi, including q-weights and malformed input.
- EN to VI fallback: `withMasterFallback` tests, plus a parity test that every EN key exists in the VI master.

## Blocked: production build

- In-repo `npm run build` fails on the stale `.next/lock`. The Bash guard blocks any command touching `.next`, so I did not remove it.
- The clean-copy build fails because Turbopack does not follow a `node_modules` junction. Copying `node_modules` was blocked by the same guard.
- Unblock options (user's call): delete `.next/lock` yourself, or add `!.next` and `!node_modules` to `.claude/.tkmignore` for this run. Then rerun `npm run build`.

## Concerns

1. Build gate (`npm run build`) is unverified. This blocks the phase's stated success criterion.
2. Supabase containers restarted mid-run (about 14:46), causing connection-refused failures in steps 16 and 17. The README says the WSL distro idles and Docker restarts containers, so wait for health before each run.
3. Per-key EN to VI fallback is tested at the `withMasterFallback` helper level. `loadDictionary("en")` is not tested against a key that is actually missing, because the parity test prevents that in the real dictionaries. Low risk, but a direct test would close it.
4. Coverage was not measured; no coverage gate was in the brief.
5. Integration tests truncate business tables. The DB is left at the `live` seed (step 19).

## Open questions

- Should `.next` and `node_modules` be re-included in `.claude/.tkmignore` so Bash can run the build and clear stale locks?

## Addendum (superseded build blocker)

After the review fix round, the controller re-ran `npm run build` in the repo: exit 0 (stale `.next/lock` came from the parallel reviewer build). The BLOCKED status above is superseded; all Phase 1 gates are green.
