# System Architecture

State after Phase 3 (app shell, Login, locale switch, 403/404). Items marked **planned (Phase N)** do
not exist in code yet. Backend detail lives in [`backend/README.md`](../backend/README.md).

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

1. The user signs in with Google through Supabase Auth on `/login`. `/auth/callback`
   (`src/app/auth/callback/route.ts`) exchanges the code and provisions the profile in Go; `src/proxy.ts`
   refreshes the session cookies and sends anonymous visitors of protected paths to Login.
2. Server code calls `goApiServer(path)` (`src/lib/api/go-api-server.ts`): reads the access token from
   the Supabase cookie session, sends `Authorization: Bearer <token>` to `API_BASE_URL`, 5 s timeout,
   `cache: "no-store"`.
3. Client code calls `goApiBrowser(path)` (`go-api-browser.ts`): same, against `NEXT_PUBLIC_API_BASE_URL`,
   with the same 5 s timeout (`BROWSER_API_TIMEOUT_MS`; a slower call rejects with code `timeout`).
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
| `src/app/layout.tsx` | Root layout: `<html lang>`, Montserrat font, `LocaleProvider`. No chrome, no per-user data. |
| `src/app/(shell)/layout.tsx` | Full chrome: `SiteHeader`, `SiteFooter`, `FloatingActionButton`, `MeRefresher`, `ShellActionsProvider` |
| `src/app/(minimal)/layout.tsx` | `MinimalChrome` (language switch and copyright, no Go call) for Login |
| `src/app/admin/layout.tsx` | Role gate plus `AdminChrome`; nav items in `src/features/admin/admin-nav-items.ts` |
| `src/app/not-found.tsx` | Localized 404 in the minimal chrome (`src/components/errors/`) |
| `src/components/shell/` | Header, avatar and language menus, nav links, FAB, footer, bell slot |
| `src/features/auth/` | Login button and messages, sign-out, profile recovery, route decisions |
| `src/lib/auth/` | Session summary (`session-summary.ts`, server read in `get-session-summary.ts`) |
| `src/lib/supabase/` | Browser and server Supabase clients (publishable key only; server client is read-only for cookies) |
| `src/lib/api/` | Go API clients (above) |
| `src/i18n/` | Locale resolution and dictionaries |
| `public/images/` | Low-resolution crops from `docs/figma-refs` (brand, login, errors) |

Tests: Vitest (`npm test`); browser tests in `e2e/` ([`e2e/README.md`](../e2e/README.md)).

## Session summary and chrome

`getSessionSummary()` (server) calls Go `GET /api/v1/me` with the cookie session token, `no-store`,
5 s; no session cookie means no call. Outcome (`resolveSessionSummary`):

| Go answer | Summary | Chrome |
|---|---|---|
| 200 | `signed-in` (name, avatar, role) | avatar menu and bell; Admin item when `role` is `admin` |
| 401, or no cookie | `signed-out` | links and language only |
| 403 `profile_not_provisioned` | provision once, retry once; on failure `profile-missing` | `ProfileRecoveryRedirect` only: signs out, opens Login |
| timeout, network, 5xx, bad body | `unavailable` | links and language only; the admin layout shows a service-unavailable notice |

- `MeRefresher` re-reads `/me` from the browser when the window regains focus, so a role change shows
  without a reload. A new server render replaces its state.
- The admin layout is a cosmetic gate: admin shows `AdminChrome`; any other answer shows the Forbidden
  page in the minimal chrome. Go `RequireAdmin` still guards every `/api/v1/admin/*` call.
- `endBrowserSession()` (`sign-out-action.ts`): Supabase `signOut({ scope: "local" })`, waits at most
  5 s; if Auth fails or is silent, it expires the `sb-*-auth-token` cookies itself
  (`session-cookie-names.ts`). Then a full load of `/login`.
- Menus use `use-dismissable-popover.ts`: outside press, Escape (focus back to the trigger) or focus
  leaving closes the panel; with `menu: true` it adds focus on open, ArrowUp/ArrowDown (wrapping),
  Home and End.
- `shell-actions-context.tsx` lets later features register FAB openers (`rules`, `compose`) and lock the
  language switch while a form is open.

## Locale resolution

Supported: `vi`, `en` (`src/i18n/locale-config.ts`). Order, in `resolveLocale`:

1. Cookie `saa_locale` if it is a supported value (written by the browser in `LocaleSwitcher`, which
   then calls `router.refresh()`; max-age 1 year).
2. `Accept-Language`: first supported language by q-weight, region ignored (`en-US` to `en`), `q=0`
   excluded.
3. `vi` (master language and last fallback).

`getRequestLocale()` reads cookies and headers; dictionaries load per namespace from
`src/i18n/dictionaries/{locale}/{namespace}.json` (namespaces `common`, `shell`, `auth`, `errors`; the root layout sends `common` and `shell` to the client).

## Rendering decision: `instant = false`

The root layout needs the request locale for `<html lang>`, which is runtime data. It therefore
exports `instant = false` so the whole app may block instead of prerendering a static shell: all
routes are dynamic. The `(shell)`, admin and Login layouts and pages repeat it because they block on
Go `/me`. **Every page under `src/app/admin` needs `export const instant = false`** (see
`src/app/admin/page.tsx`), or instant-navigation validation fails. Streaming is added per route with
`<Suspense>` / `loading.tsx` where it helps.

Dev only: `next.config.ts` sets `allowedDevOrigins: ["[::1]"]` so the IPv6 loopback origin reaches HMR.

## Planned (not yet in code)

| Item | Phase |
|---|---|
| Launch-gate redirect in `proxy.ts` | 4 |
| Feature routes and screens | 4 to 13 |
| Final integration, E2E, docs | 14 |

Source of truth for phases: `plans/261109-1626-saa-2025-website/plan.md`.
