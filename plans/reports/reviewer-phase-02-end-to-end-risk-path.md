# Review: Phase 02 end-to-end risk path (uncommitted)

Plan: `plans/261109-1626-saa-2025-website/phase-02-end-to-end-risk-path.md`. Read-only review; nothing edited.
Not re-run (already green per caller): gofmt/build/vet/test/integration/sqlc, typecheck/lint/vitest/next build, Playwright smoke. `go` is not on this shell's PATH, so I could not run probes (see W1 caveat).

## Assessment
Solid, safe to commit. No critical findings. Auth chain, provision checks, safe `next`, R01 masking, lock order, CAS, idempotent open, and upload trust all hold up under a read of the code. Four warnings (input hardening, upload quota, provision email conflict, concurrency-test strength), all fixable without redesign.

Counts: critical 0, warning 4, suggestion 11.

## Critical
None.

## Warning

### W1. Title and hashtag input can turn into a 500 (NUL, oversized, index-row limit)
`backend/internal/kudo/kudo_input_validation.go:309-318` (title), `:336-351` (hashtags). Schema `supabase/migrations/20261110070238_...sql:62-68`.
- Hashtags have no length or character cap in Go, and the DB constraint only checks non-empty / lower / no `#`. A 3 KB hashtag exceeds the btree row limit on `hashtags.name unique`; a title or hashtag containing `\u0000` (valid JSON) is rejected by Postgres. Both fall into `default:` in `kudo_create_handler.go:217` and answer 500 for plain user input.
- `strings.ToLower` (Go) vs `lower()` (Postgres, locale-dependent) can disagree on some Unicode (e.g. `İ`), tripping `hashtags_name_normalized` the same way. Vietnamese `Đ/đ` is covered only if the DB ctype is UTF-8; no test uses non-ASCII hashtags.
- Content NUL: bluemonday uses the x/net tokenizer, which does not convert NUL by default; I could not run it to confirm. Treat as unproven, same fix covers it.
Fix: in `validateCreate`, strip/refuse control chars first and cap hashtags, returning 422 `validation_failed`:
```go
func hasControl(s string) bool { return strings.ContainsFunc(s, func(r rune) bool { return unicode.IsControl(r) && r != '\n' && r != '\t' }) }
const HashtagMaxChars = 50
// normalizeHashtags: after the empty check
if utf8.RuneCountInString(name) > HashtagMaxChars || hasControl(name) { tooLong = true; continue }
// checkTitle: reject hasControl(title) as fieldRequired/invalid; sanitizeContent: strings.ReplaceAll(raw, "\x00", "")
```
Add `{"đoàn kết", "İSTANBUL", 51-rune, "\x00"}` rows to `TestNormalizeHashtags` and one integration case against the real DB. A DB `check (char_length(name) <= 50)` belongs in a later migration (P2 left schema untouched).

### W2. Upload endpoint has no per-user cap and nothing reaps pending uploads
`backend/internal/upload/upload_handler.go:77-95`.
Any signed-in Sunner can mint unlimited signed upload URLs (each 5 MB write-once) and pending rows; abandoned objects stay in the private bucket forever. Cost and storage abuse, not a data leak.
Fix: refuse when the owner already has N pending rows (query `select count(*) from kudo_uploads where owner_id=$1 and state='pending' and created_at > now()-interval '1 day'`, N around 20, answer 429 `too_many_uploads`), and schedule the `pending` -> `pending_delete` sweeper in the phase that owns cleanup (record it in the plan; nothing in P2 does it).

### W3. Provision returns 500 forever when a `users` row owns the email under another id
`backend/db/queries/auth.sql:11-17`, `backend/internal/auth/profile_service.go:88-96`.
`ON CONFLICT (id)` only. If an auth user was deleted and recreated (same email, new `sub`), `users.email` unique raises 23505, which surfaces as `internal_error`. The user then loops through `profile_unavailable` (R22) with no diagnosis.
Fix: detect `pgconn.PgError{Code:"23505"}` on the email constraint in `Provision`, log `user_id` + email hash at Error, answer 409 `profile_conflict` (or 403 `domain_not_allowed` copy) so support can reconcile. Add one integration case to `profile_service_integration_test.go`.

### W4. Concurrency tests do not prove the locks
`backend/internal/gamification/gamification_fixtures_integration_test.go:138` (`startTogether`), `heart` / `box` / `kudo_create_service_integration_test.go:163-176`.
The plan (Key Insights, Risk table) asks for test-held row locks plus goroutines. Only `moderation_lock_order_integration_test.go:51-79` and `notification_anonymity_integration_test.go:76,130` do that. The heart-crossing-5, two-fifth-senders and concurrent-open tests release goroutines together and pass whenever the scheduler happens to serialize them, so removing `LockUserForBoxTopUp` or the receiver lock might not fail them.
Fix: for each, hold the relevant lock in a test tx (`select ... for no key update` on the sender/receiver/user row), start both goroutines, `time.Sleep`/poll `pg_stat_activity` until both wait, release, assert. Mutation check: comment out the lock query and confirm the test fails. Also run once with `-race -count=5` as the plan's Risk table requires (not evidenced in what I was given).

## Suggestion

S1. Defense in depth on provision: also require Google's hosted-domain claim. `supabase_identity_reader.go:224-240` ignores `identity_data.custom_claims.hd` (present per `e2e/support/create-local-test-session.ts:149`). Add `HostedDomain` and require `== "sun-asterisk.com"` in `profile_service.go:68`. The email suffix alone is sufficient per BR-003, `hd` is Google's recommended second check.

S2. `src/app/auth/callback/route.ts:41` signs out with `scope: "local"`: cookies go, but the refused account's refresh token stays valid at Supabase and the `auth.users` row remains. Go refuses every API call, so no access, but use `scope: "global"` for a refused non-company account (their only session) and consider a Supabase `before-user-created` hook later to stop the rows.

S3. Hosted Supabase checklist (README/E2E notes, not code): local `supabase/config.toml` has email signup on with `enable_confirmations = false` and Google `skip_nonce_check = true`. The API still rejects `provider != google` and any non-google entry in `providers` (`auth_context.go:157-161`), so this is not a bypass, but production should disable the email provider (or require confirmation) so nobody can pre-register a company address and force an unlinkable-identity 403 for the real owner.

S4. `UpsertProfileOnSignIn` only promotes (`auth.sql:17`): removing an address from `ADMIN_EMAILS` never demotes. Matches BR-001, but document the manual SQL demotion step in `backend/README.md`.

S5. `kudo_read_service.go:252`: `signImages` uses the raw request context while its doc says a Storage failure yields placeholders. Wrap in `context.WithTimeout(ctx, 2*time.Second)` so a slow Storage cannot hold a detail read for the 10 s client timeout (`storage_object_store.go:351`).

S6. `attachment_finalizer.go:170-181`: up to 5 uploads x 2 sequential Storage calls under one 10 s budget (`kudo_create_service.go:20`). Fine at 1-2 images; use `errgroup` over uploads if p95 for 5 images is near the budget.

S7. `box_grant.go:236` + `gamification.sql:352-357`: every heart add sums all hearts on all the sender's kudos under their lock. Linear in the author's heart count; fine for now, revisit (running total column) if a viral author appears.

S8. Heart on a spam kudo answers 409 `kudo_not_public` to any user (`heart_service.go:69-70`), while the detail read answers 404 (BR-006). Ids are v4 UUIDs, so practical oracle risk is nil, but returning 404 for non-sender non-admin viewers would make the two endpoints consistent. The plan text says "spam 409", so only change if the spec is amended.

S9. R01 residual (spec-level, not code): `hero_level_up` fires only when the distinct-sender count rises, so a receiver can infer that an anonymous kudo came from a sender who had not sent before. Decided by R10/N04; noting it so the contract owner knows.

S10. E2E session script: the loopback guard (`create-local-test-session.ts:61-67`, called at `:226-227`) is correct (exact hostname match, refuses `localhost.evil.com`, `127.0.0.1@evil.com`), nothing under `src/` imports it (grepped), and `supabase/signing_keys.json`, `playwright/.auth/` are git-ignored. Add an ESLint `no-restricted-imports` pattern for `**/e2e/**` in `src/` so that stays true; `SAA_DB_CONTAINER` is not validated (local docker exec only, low risk).

S11. `route.ts:23-24` builds redirects from `request.nextUrl.origin`; behind a reverse proxy that can be the internal host. Use a configured public origin (or verify `x-forwarded-host` handling) before deploy. The success path (session cookies set via `cookies()` appearing on the `NextResponse.redirect`) is only proven by the still-pending manual Google run.

## Edge cases turned up
- Same Idempotency-Key from another user: lookup is user-scoped, then `MarkSecretBoxOpened` hits the global unique, tx rolls back, 409 `idempotency_key_in_use`; no box consumed. Safe.
- Two admins with opposing decisions at the same version: second `LockKudoForModeration` re-reads under READ COMMITTED, CAS misses, 409 with current row. Same target at current version returns `changed:false`, no notice.
- Withdraw then re-heart under a bigger campaign changes that heart's weight, but the high-water mark stops box farming.
- Notification failure after commit loses `icons_completed` permanently (once-ever key, BR-006 accepts best-effort).
- `uuid.Parse` accepts braces / no-dash forms for the Idempotency-Key and path ids; harmless.
- Provision depends on Supabase admin API availability (5 s client timeout); down means 500 and fail-closed, correct.

## Checklist against the brief
- Auth bypass / provision: PASS. `IsEligible` (provider google, providers only google, domain case-insensitive) then identity re-read from `auth.identities` with `email_verified == true`, same email, allowed domain; user_metadata never trusted; role only from `users.role`; unavailable reader fails closed. Route classes: events PUBLIC, provision IDENTITY, everything else PROFILE, admin ADMIN with double check in handler.
- Safe `next`: PASS. `safeNext` refuses `//`, `/\`, `://`, backslash, control chars; applied at Login, `buildCallbackUrl`, callback and proxy.
- R01 leaks: PASS. `Sender=nil` for non-admin (all sender fields, tier, unit), `kudo_uploads.owner_id` never selected, opaque keys, notification `ActorID` never stored, sender params stripped under `for share` when anonymous.
- Lock order kudo -> receiver / deadlocks: PASS. Create locks receiver only; moderation kudo -> receiver; heart kudo -> sender user; box open user -> box. No path holds a user lock then waits on an existing kudo; `FOR NO KEY UPDATE` avoids FK KEY SHARE clashes.
- Heart/box/open idempotency and races: PASS by analysis (kudo lock serializes hearts, sender lock plus high-water serializes grants, user lock plus stored `open_result` serializes opens). Test strength is W4.
- CAS on `moderation_version`: PASS.
- Upload trust: PASS. Declared type/size only fast-fail; stored metadata plus 512 B sniff must agree; owner, state and `kudo_id IS NULL` rechecked under `FOR UPDATE` in id order; write-once signed URL; keys `kudo-images/{uuid}.{ext}`.
- Error leakage: PASS. All handlers log the cause and answer `WriteInternalError`; Storage/Supabase bodies appear only in logs.
- E2E script: PASS (S10).

## Done well
Fail-closed identity/storage readers; single `maskSender`; sender never read from body; role from DB every request; post-commit notifier with detached 2 s ctx and recover; CAS plus 409 returning the current row; uniform rejection-sampled icon draw from `crypto/rand`; tests cover the real DB, grants, and assembled router; `.gitignore` covers test sessions and keys.

## Actions in order
1. W1 input hardening (+ tests incl. Vietnamese).
2. W3 provision email-conflict handling.
3. W2 pending-upload cap; log the sweeper as owned work.
4. W4 deterministic lock-based concurrency tests; run `-race -count=5` once.
5. S1, S2, S5, S10 (cheap); S3/S4 into README; S11 before deploy.

## Numbers
- Type coverage: not measured (typecheck green per caller; no `any` seen in reviewed TS).
- Test coverage: not measured; plan SC list is represented by 40+ integration tests.
- Lint findings: 0 reported by caller; I added none.

## Still unresolved
- Manual real Google sign-in and C06 claim locations are not yet run (plan Next Steps); callback success-path cookies unproven until then.
- `-race -count=5` evidence for the concurrency suite.
- W1 content-NUL behaviour of bluemonday unconfirmed (no Go toolchain on this shell).
- Whether Phase 12/13 own the pending-upload sweeper (W2).
