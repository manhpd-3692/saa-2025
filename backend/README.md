# SAA 2025 — Go API (`backend/`)

The Go REST API owns every business read/write and all authorization (`/api/v1`). Next.js (repo
root) is frontend only and never touches the database (G15–G19). Supabase provides Google OAuth
(Go verifies the access token against the JWKS), Postgres and private Storage.

```
cmd/api/            main.go (config, pool, server timeouts, graceful shutdown), router.go, wire_<capability>.go
cmd/seed/           SEED_SCENARIO runner (local only)
cmd/purge-uploads/  manual purge of abandoned kudo images (no scheduler)
db/queries/         sqlc queries, one file per capability (auth.sql, events.sql, ...)
db/seeds/           prelaunch.sql | live.sql | after-ceremony.sql + demo_activity.sql (embedded)
internal/auth/      JWKS verifier, auth middleware (IDENTITY/PROFILE chains), RequireAdmin, AuthContext
internal/config/    environment loading and validation
internal/db/        sqlc output — generated, do not edit
internal/dbx/       WithTx + per-request deadlines (5 s, exports 20 s), loopback guard
internal/httpx/     CORS, route classes, JSON + error envelope
internal/testkit/   in-process ES256 JWKS issuer; DB helpers (integration builds)
scripts/            dev-db-role.sql (local saa_api login)
```

Schema lives in `../supabase/migrations` (Supabase CLI) and is the sqlc schema source.

## Toolchain (WSL)

Go, the Supabase CLI, sqlc and Docker run inside WSL Ubuntu. From Windows, run commands through a
login shell so `PATH` is set, e.g.
`wsl bash -lc 'cd /mnt/c/<repo>/backend && go test ./...'`. For anything with `$VARS`, write a small
script and run `wsl bash -l /mnt/c/<path>/script.sh` (the outer shell expands `$` otherwise).

The WSL distro stops when idle, and Docker restarts the Supabase containers on the next `wsl`
call (restart policy `unless-stopped`). Wait for health before running tests:
`curl -fsS http://127.0.0.1:54321/auth/v1/health`.

## Local Supabase (first time)

All commands from the repo root unless noted.

1. Signing key — asymmetric ES256, published at `/auth/v1/.well-known/jwks.json` (Codex R21).
   `supabase/signing_keys.json` is gitignored; create it once per machine:
   ```sh
   echo '[]' > supabase/signing_keys.json
   supabase gen signing-key --algorithm ES256    # answer Y to overwrite the empty file
   ```
2. Google OAuth (only sign-in method): copy `supabase/.env.example` to `supabase/.env` and fill the
   client id/secret. Authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.
3. `supabase start` — applies the 11 migrations, seeds `units` from `supabase/seed.sql`, creates the
   private `kudo-images` bucket (5 MB, JPEG/PNG/WebP).
4. Copy `backend/.env.example` to `backend/.env` (gitignored) and fill it. Local values:
   `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_SERVICE_KEY` = `SECRET_KEY` from
   `supabase status -o env`, `LOCAL_OWNER_DATABASE_URL` = the `DB_URL` from the same output,
   `DATABASE_URL` = the same host/db with user `saa_api` and your `SAA_API_DB_PASSWORD`.
5. Give `saa_api` a login (the migration creates it NOLOGIN; no password is ever committed):
   ```sh
   set -a; . backend/.env; set +a
   docker exec -i supabase_db_saa-2025 psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
     -v saa_api_password="$SAA_API_DB_PASSWORD" < backend/scripts/dev-db-role.sql
   ```
   `supabase db reset` recreates the cluster: re-run step 5 after every reset.
6. Seed: `cd backend && set -a && . ./.env && set +a && go run ./cmd/seed`
   (`SEED_SCENARIO=prelaunch|live|after-ceremony`, default `live`). Re-runnable; it replaces the
   event row and the demo Sunners' activity (24 users, 60 kudos with hearts and boxes in the last
   14 days: three Live board feed pages, a clear Highlight top 5, ten gift recipients) and
   stores 16 demo kudo images (a Figma-cropped team photo, `db/seeds/kudo-images/`) at fixed
   opaque keys through the Storage API, so it also needs `SUPABASE_URL` and
   `SUPABASE_SERVICE_KEY`. It refuses a non-loopback database or Storage host.

## Run and verify

```sh
cd backend && set -a && . ./.env && set +a
go run ./cmd/api                         # :8080, GET /healthz
go build ./... && go vet ./... && go test ./...
go vet -tags integration ./... && go test -tags integration ./...   # needs local Supabase + .env
sqlc generate                            # after changing db/queries or migrations
```

Integration tests use `DATABASE_URL` (as `saa_api`) and `LOCAL_OWNER_DATABASE_URL` (fixtures,
grant checks). `testkit.TruncateBusinessTables` wipes local business data — re-seed afterwards.

## Request pipeline (F002 § 4.4, Codex R06, N09)

`CORS` wraps the whole mux and runs first: exact origins from `FRONTEND_ORIGINS`, preflight `OPTIONS`
answered 204 without a JWT, methods `GET, POST, PUT, PATCH, DELETE`, headers
`Authorization, Content-Type, Idempotency-Key`, exposes `Content-Disposition`, no credentials,
max-age 600. Behind it every route is in exactly one class:

| Class | Helper | Chain | Example |
|---|---|---|---|
| PUBLIC | `d.Routes.Public(h)` | none | `GET /api/v1/events/current` |
| IDENTITY | `d.Routes.Identity(h)` | bearer → JWT (ES256/RS256, iss, aud, exp/nbf) → verified Google `@sun-asterisk.com` | `POST /api/v1/me/provision` |
| PROFILE | `d.Routes.Profile(h)` | IDENTITY + `users` row (`GetProfileAuth`) → `auth.FromContext` | every other `/api/v1/*` |
| ADMIN | `d.Routes.Admin(h)` | PROFILE + `RequireAdmin` | `/api/v1/admin/*` |

Failures: 401 `unauthorized`; 403 `domain_not_allowed`, `profile_not_provisioned`, `forbidden`.
Provision answers 409 `profile_conflict` when another `users` row already owns the email (logged
with `user_id` and `email_sha256` for support to reconcile). `POST /api/v1/uploads/kudo-images`
answers 429 `upload_quota_exceeded` past 20 pending uploads created by the caller in 24 h.
Every error body is `{ "error": { "code": "...", "message": "..." } }` (`httpx.WriteError`). The role
comes only from `users.role`; JWT claims, body, headers and query never set it. A new route defaults
to PROFILE; putting one in PUBLIC or IDENTITY is a contract change made in the F002 spec first.

## Adding routes — `wire_<capability>.go`

Each capability registers its own routes in its own file, so phases never edit a shared list:

```go
// backend/cmd/api/wire_events.go
package main

func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		h := events.NewHandler(events.NewService(d.Queries))
		mux.Handle("GET /api/v1/events/current", d.Routes.Public(h))
	})
}
```

`CORS` wraps `Recover` (panic → logged stack + 500 `internal_error` envelope, CORS headers kept).

`apiDeps` carries `Config`, `Logger`, `Pool`, `Queries` and `Routes`. Use Go 1.22+ method patterns.
`TestRegisteredCapabilitiesDoNotConflict` mounts every registration on one mux, so a duplicate
pattern fails in `go test`, not at server start. `TestEveryRegisteredAPIRouteRequiresAToken` calls every
`/api/v1/*` pattern without a token and fails unless it answers 401, so a route that skips
`d.Routes.*` is caught; the only exemptions are listed in `publicAPIRoutes` (`route_class_guard_test.go`). `wire_health.go` (`GET /healthz`) is the reference.

## Deadlines (Codex R23)

Server: ReadHeaderTimeout 5 s, ReadTimeout 15 s, WriteTimeout 30 s, graceful shutdown on
SIGINT/SIGTERM. Database: `dbx.WithTx(ctx, pool, func(ctx, tx) error)` and `dbx.RequestContext`
bound each request to 5 s (`dbx.ExportTimeout` 20 s for CSV exports); use the ctx passed to the
callback for every query.

## Database access (Codex R21)

`saa_api` has `BYPASSRLS` and DML on every business table plus `select` on `kudo_heart_state`.
RLS is on with no policies (deny-all) and `anon`, `authenticated`, `service_role` hold no grants.
A new table needs RLS enabled, the revoke and the `saa_api` grant in its migration, and an entry in
`testkit.BusinessTables` (the integration suite fails on an unlisted public relation). Hosted
fallback if `BYPASSRLS` is refused: `create policy ... to saa_api using (true) with check (true)`.

## Configuration notes

- `SUPABASE_URL` and `SUPABASE_JWKS_URL` must be `https` unless the host is loopback (`127.0.0.1`,
  `::1`, `localhost`): they decide whose tokens are trusted.
- `SUPABASE_SERVICE_KEY` is optional at boot (the API starts without it); when set it must not contain
  whitespace. `config.Config` redacts it and the `DATABASE_URL` password when logged
  (`slog.LogValuer`, `String`). It is used for two things: Storage object I/O (uploads, upload delete,
  edit cleanup, `purge-uploads`) and the Supabase Auth admin read of `auth.identities` that
  `POST /api/v1/me/provision` uses to check `email_verified` (C08). Without it the API still boots,
  but provisioning fails closed with 500 (`profile provisioning disabled` is logged), image operations
  answer 503 `storage_unavailable`, and `purge-uploads` refuses to run.
- Eligibility per request uses only server-controlled claims (`email` domain,
  `app_metadata.provider == google`, `providers` only Google). `user_metadata.email_verified` is
  client-writable and ignored; `POST /api/v1/me/provision` checks `email_verified` from
  `auth.identities` through the service key (gap log C08). Tokens without a `kid` header are rejected.

## Kudo compose endpoints (F005, `wire_kudo_compose.go`)

All are PROFILE routes.

| Route | Purpose | Notable answers |
|---|---|---|
| `GET /api/v1/users/search?q=&limit=` | Recipient and mention search (name or email, case-insensitive) | `q` cut at 100 chars; `limit` default 10, max 20 |
| `GET /api/v1/hashtags?q=` | Shared hashtag list | at most 50 rows |
| `GET /api/v1/kudos/{id}/edit` | Edit prefill | 403 `not_kudo_author`; 409 `kudo_spam_locked`; 404 missing or hidden |
| `PATCH /api/v1/kudos/{id}` | Edit a kudo (content, hashtags, images, anonymity) | 200 `{kudo_id}`; 422 `validation_failed` or invalid attachment; 403, 409, 404 as above; sends no notification; going anonymous redacts the existing notifications |
| `DELETE /api/v1/uploads/{uploadId}` | Remove one of the caller's unsaved uploads | 204; 404 `upload_not_found` (missing or foreign); 409 `upload_attached` (attached or already `pending_delete`) |

## Kudo board read endpoints (F006, `wire_kudo_board.go`)

All are PROFILE routes, reads only. Cards are `KudoCard`s: sender masked per viewer, weighted heart total,
Go-signed image URLs.

| Route | Answer | Notable errors |
|---|---|---|
| `GET /api/v1/kudos?cursor=&limit=` | `{items, nextCursor}`, public kudos newest first; `limit` default 10, max 50 | 400 `invalid_cursor` |
| `GET /api/v1/kudos/highlight?hashtagId=&unitId=` | `{items (at most 5), nextCursor: null}`; `unitId` is the receiver's unit; empty means all | 400 `invalid_filter` (not a uuid) |
| `GET /api/v1/kudos/filter-options` | `{hashtags: [{id, name}], units: [{id, name, code}]}` | |
| `GET /api/v1/kudos/spotlight` | `{total, names: [{userId, name, count}], recent: [{receiverId, receiverName, createdAt}]}`; up to 100 names, 6 recent | |
| `GET /api/v1/kudos/sidebar` | `{stats: {kudosReceived, kudosSent, heartsReceived, boxesOpened, boxesUnopened}, latestRecipients}` (10 rows); stats are the caller's own | |
| `GET /api/v1/users/{id}/hover-card` | `{id, name, avatarUrl, unitCode, unitName, heroTier, receivedCount, sentCount, isSelf}`; `sentCount` counts anonymous kudos only for an admin or the user | 404 `user_not_found` (unknown or non-uuid id) |

`GET /api/v1/kudos/{id}` (detail) answers 404 `kudo_not_found` for a missing, non-uuid or non-viewable id.
`nextCursor` is opaque (base64url of the last row's `created_at|id`): pass it back unchanged. Migration
`20261128070000_kudo_board_read_indexes` adds partial indexes for public kudos per receiver and for the
latest opened secret box per user.

## Gamification endpoints (F008, `wire_gamification.go`, `wire_gamification_reads.go`)

All are PROFILE routes. The caller always comes from the token; no user id is accepted.

| Route | Answer | Notable errors |
|---|---|---|
| `PUT` / `DELETE /api/v1/kudos/{id}/heart` | `{heartTotal, viewerHearted}`; idempotent setters; the weight is the highest active campaign multiplier, else 1 | 403 `cannot_heart_own_kudo`; 409 `kudo_not_public`; 404 `kudo_not_found`; 500 `campaign_lookup_failed` (nothing written, R09) |
| `GET /api/v1/campaigns/active` | `{name, multiplier, startsAt, endsAt}` or `null` | 500 `campaign_lookup_failed` (the client only hides the badge) |
| `GET /api/v1/me/secret-boxes` | `{unopened, opened, collectedIcons, totalIcons: 6, completed}`; icons in enum order | |
| `POST /api/v1/me/secret-boxes/open` | `{boxId, icon, summary: {unopened, opened, distinctIcons}}`; header `Idempotency-Key` (uuid); a repeated key replays the stored body | 400 `invalid_idempotency_key`; 409 `no_unopened_box`; 409 `idempotency_key_in_use` |

Hero tiers reach the browser inside every `KudoCard` (`heroTier`) and the latest gift recipients inside
`GET /api/v1/kudos/sidebar`. The open that completes the icon set stores its `icons_completed` notice in
the same transaction as `users.icons_completed_at` (under a savepoint, so a notice failure never undoes
the open) and also hands it to the post-commit notifier, which the once-ever dedupe makes a no-op.
Handlers log through `httpx.LogRequestFailure`: a request the caller abandoned is INFO, a server deadline
or any other failure is ERROR. The `live` seed runs an x2 heart campaign ("Ngày x2 tim – lan tỏa gấp đôi yêu
thương!", now - 1 day to now + 13 days); the integration suite clears active campaigns, so reseed afterwards.

## Upload lifecycle and cleanup

`kudo_uploads.state`: `pending` (uploaded, not in a kudo) -> `attached` (saved with a kudo). Removing
an upload (delete endpoint, an image dropped in an edit, or the purge) uses mark-then-delete:

1. Under the row lock, set `pending_delete` (short transaction, no Storage I/O under the lock).
2. After commit, delete the Storage object, then the row.
3. If the object delete fails the row stays `pending_delete`; the next purge retries it, so no object
   is left without a row.

A `pending_delete` row of a never-attached upload keeps `kudo_id` and `attached_at` null; an
attachment removed in an edit keeps both. Migration `20261128060000_kudo_uploads_unsaved_pending_delete`
relaxed the two state check constraints to allow this.

`cmd/purge-uploads` is manual only (no scheduler). It removes pending uploads older than 24 h
(`OrphanUploadAge`) and every leftover `pending_delete` upload; attached uploads are never touched.
It reads the same environment as the API (load it as in "Run and verify") and needs
`SUPABASE_SERVICE_KEY`:

```sh
go run ./cmd/purge-uploads -dry-run   # counts purgeable uploads, deletes nothing
go run ./cmd/purge-uploads            # exits 1 if any upload could not be purged
```
