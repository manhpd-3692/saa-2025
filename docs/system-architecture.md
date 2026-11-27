# System Architecture

State after Phase 1 (foundation and bootstrap). Items marked **planned (Phase N)** do not exist in
code yet. Backend detail lives in [`backend/README.md`](../backend/README.md).

## Components

```
Browser ──> Next.js (src/)  ──Bearer──> Go API (backend/, /api/v1) ──saa_api──> Postgres (supabase/)
   │                                          │
   └── Supabase Auth (Google OAuth) <── JWKS ─┘
```

- **Next.js 16** is frontend only. It never connects to the database.
- **Go API** owns every business read/write and all authorization.
- **Supabase** provides Google OAuth, Postgres and private Storage (`kudo-images` bucket).

## Request flow

1. The user signs in with Google through Supabase Auth (the login screen is
   **planned (Phase 3)**; `/auth/callback` and `proxy.ts` session refresh are **planned (Phase 2)**,
   per comments in `src/lib/supabase/server-client.ts`).
2. Server code calls `goApiServer(path)` (`src/lib/api/go-api-server.ts`): reads the access token from
   the Supabase cookie session, sends `Authorization: Bearer <token>` to `API_BASE_URL`, 5 s timeout,
   `cache: "no-store"`.
3. Client code calls `goApiBrowser(path)` (`go-api-browser.ts`): same, against `NEXT_PUBLIC_API_BASE_URL`.
4. Both go through `requestGoApi` (`go-api-request.ts`): paths must start with a single `/`; any non-2xx,
   timeout, network failure or non-JSON body rejects with `ApiError` (`api-error.ts`). The Go error
   body is `{ "error": { "code", "message" } }`.
5. The frontend forwards the token but never trusts it. The Go API verifies it.

## Go API route classes

CORS (exact origins from `FRONTEND_ORIGINS`, no credentials) wraps `Recover` and the mux. Each route is
in exactly one class (`internal/httpx`, helpers `d.Routes.*`):

| Class | Chain | Failures |
|---|---|---|
| PUBLIC | none | none |
| IDENTITY | bearer, JWT, verified Google `@sun-asterisk.com` | 401 `unauthorized`, 403 `domain_not_allowed` |
| PROFILE | IDENTITY + `users` row | 403 `profile_not_provisioned` |
| ADMIN | PROFILE + `RequireAdmin` | 403 `forbidden` |

A new route defaults to PROFILE. The role comes only from `users.role`, never from claims, body,
headers or query. Routes register per capability in `cmd/api/wire_<capability>.go`; a Go test fails if
an `/api/v1/*` route answers anything other than 401 without a token (except listed public routes).

## JWT / JWKS rules

- Keys: Supabase publishes ES256 keys at `/auth/v1/.well-known/jwks.json`
  (`SUPABASE_JWKS_URL`, derived from `SUPABASE_URL` when unset). ES256 and RS256 tokens accepted;
  tokens without a `kid` are rejected. Checks: issuer, audience, `exp`/`nbf`.
- `SUPABASE_URL` and `SUPABASE_JWKS_URL` must be `https` unless the host is loopback.
- Eligibility uses only server-controlled claims: `email` domain, `app_metadata.provider == google`,
  `providers` only Google. `user_metadata.email_verified` is client-writable and ignored.

## Database

- Schema in `supabase/migrations` (also the sqlc schema source); `supabase/seed.sql` seeds `units`.
  Demo data comes from `go run ./cmd/seed` (local only; refuses non-loopback hosts).
- The Go API connects as role `saa_api` (`DATABASE_URL`): created NOLOGIN by migration, given a login
  locally by `backend/scripts/dev-db-role.sql`. It has `BYPASSRLS` and DML on business tables.
- RLS is enabled on business tables with no policies (deny-all); `anon`, `authenticated` and
  `service_role` hold no grants. A new table needs RLS, the revoke and the `saa_api` grant in its
  migration.
- Per-request DB deadline 5 s (exports 20 s). Server timeouts: header 5 s, read 15 s, write 30 s.

Migrations (`supabase/migrations`, in order):

| File suffix | Content |
|---|---|
| `roles_and_base_grants` | roles, base grants |
| `users_units` | users, units |
| `events` | events |
| `kudos_uploads_images_hashtags` | kudos, uploads, images, hashtags |
| `campaigns` | campaigns |
| `hearts_secret_boxes_heart_state` | hearts, secret boxes, heart state |
| `notifications` | notifications |
| `kudos_moderation_columns` | kudo moderation columns |
| `rls_deny_all_and_grants` | RLS deny-all and grants |

## Frontend structure

| Path | Role |
|---|---|
| `src/app/layout.tsx` | Root layout: `<html lang>`, fonts, `LocaleProvider`. No per-user data. |
| `src/app/(shell)/layout.tsx` | Main shell skeleton (chrome planned, Phase 3) |
| `src/app/(minimal)/layout.tsx` | Chrome-less pages such as Login (chrome planned, Phase 3) |
| `src/app/admin/layout.tsx` | `/admin/*` skeleton (chrome and role gate planned, Phase 3) |
| `src/lib/supabase/` | Browser and server Supabase clients (publishable key only; server client is read-only for cookies) |
| `src/lib/api/` | Go API clients (above) |
| `src/i18n/` | Locale resolution and dictionaries |

Tests: Vitest (`npm test`).

## Locale resolution

Supported: `vi`, `en` (`src/i18n/locale-config.ts`). Order, in `resolveLocale`:

1. Cookie `saa_locale` if it is a supported value (written by the browser; the LocaleSwitcher that
   writes it is **planned (Phase 3)**; max-age 1 year).
2. `Accept-Language`: first supported language by q-weight, region ignored (`en-US` to `en`), `q=0`
   excluded.
3. `vi` (master language and last fallback).

`getRequestLocale()` reads cookies and headers; dictionaries load per namespace from
`src/i18n/dictionaries/{locale}/{namespace}.json` (namespace `common` today).

## Rendering decision: `instant = false`

The root layout needs the request locale for `<html lang>`, which is runtime data. It therefore
exports `instant = false` so the whole app may block instead of prerendering a static shell: all
routes are dynamic. Streaming is added per route with `<Suspense>` / `loading.tsx` where it helps.

## Planned (not yet in code)

| Item | Phase |
|---|---|
| End-to-end risk path through Next.js, Go and Supabase | 2 |
| Auth callback, session refresh proxy | 2 |
| Login, app shell chrome, LocaleSwitcher, 403/404 pages | 3 |
| Feature routes and screens | 4 to 13 |
| Final integration, E2E, docs | 14 |

Source of truth for phases: `plans/261109-1626-saa-2025-website/plan.md`.
