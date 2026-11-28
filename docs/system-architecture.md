# System Architecture

State after Phase 5 (Homepage, Awards and Community Standards on top of the Phase 4 launch gate and Phase 3
shell). Items marked **planned (Phase N)** do not exist in code yet. Backend detail lives in [`backend/README.md`](../backend/README.md).

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
   refreshes the session cookies, applies the launch gate (below) and sends anonymous visitors of protected paths to Login.
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
| `src/app/countdown/page.tsx` | Prelaunch countdown: bare route (no header or footer), reads Go fresh per request |
| `src/features/countdown/` | Shared countdown: clock store, `useCountdown`, `CountdownDisplay`; launch wrapper `LaunchCountdown` |
| `src/app/(shell)/page.tsx`, `awards/`, `community-standards/` | Homepage, Awards, Community Standards ([details](system-architecture-homepage-awards.md)) |
| `src/features/home/`, `awards/`, `community-standards/` | Feature code for those pages: ceremony countdown, award catalog and menu, community rules |
| `src/components/key-visual-backdrop.tsx` | Decorative key-visual artwork behind the top of those three pages |
| `src/lib/events/` | Events client and launch gate (below) |
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
`src/i18n/dictionaries/{locale}/{namespace}.json` (namespaces `common`, `shell`, `auth`, `errors`, `countdown`, `home`, `awards`, `standards`; the root layout sends `common` and `shell` to the client). A key missing in `en` shows the `vi` text; typed content (award catalog, community rules) uses `pickLocalized` with the same fallback (see [Homepage, Awards and Community Standards](system-architecture-homepage-awards.md)).

## Rendering decision: `instant = false`

The root layout needs the request locale for `<html lang>`, which is runtime data. It therefore
exports `instant = false` so the whole app may block instead of prerendering a static shell: all
routes are dynamic. The `(shell)`, admin and Login layouts and pages repeat it because they block on
Go `/me`. **Every page under `src/app/admin` needs `export const instant = false`** (see
`src/app/admin/page.tsx`), or instant-navigation validation fails. Streaming is added per route with
`<Suspense>` / `loading.tsx` where it helps.

Dev only: `next.config.ts` sets `allowedDevOrigins: ["[::1]"]` so the IPv6 loopback origin reaches HMR.

## Launch gate (F003)

Before the event start (`events.start_at`), every page except the exempt ones goes to `/countdown`. It is
a convenience, not access control. Go is the only reader of the event: public route
`GET /api/v1/events/current` (`backend/internal/events/events_handler.go`: 200 event, 404 no row,
500 on error or deadline, never cached). Client: `src/lib/events/events-api.ts`.

**In `src/proxy.ts`.** `refreshProxySession` and `launchGateRedirect(pathname)` run in parallel
(`Promise.all`). The gate answer wins: it is checked before the sign-in rule, and the redirect keeps the
refreshed session cookies (`redirectWithSession`).

| Rule | Behaviour (`launch-gate.ts`) |
|---|---|
| Upcoming, non-exempt path | 307 to `/countdown` |
| Exempt paths | `/countdown`, `/login`, `/auth/callback`, `/_next` (exact, or as prefix followed by `/`) pass |
| Static files | Never reach the proxy: its `matcher` excludes them by extension |
| Fail open | No event row, Go error, invalid body, or no answer within 1.5 s: the request passes and the failure is logged |

**Cache (`launch-gate-cache.ts`).** Per process, 60 s (`LAUNCH_GATE_CACHE_TTL_MS`).
- Keeps only successful reads (`startAt`, `serverNow`); a failure is never stored, so the next request retries.
- One lookup in flight at a time; concurrent requests share it.
- "Now" is the cached server time plus the process time elapsed since the request was sent, so the Next.js clock never decides alone.
- With several instances, each may lag a start-time change by up to 60 s.
- On `/countdown` the gate calls `recheckIfUpcoming()`: while the cached reading says upcoming it reads Go again. The page redirects to `/` once started; a stale "upcoming" would send the visitor straight back.

**`/countdown` page.** `instant = false` and `connection()`: a fresh Go read per request (5 s budget),
before any markup. `active` redirects to `/` (307); `upcoming` shows the title and `LaunchCountdown`; no
row, error or timeout shows "Coming soon" without digits. Language: saved choice, else `vi`.

**Browser clock (`countdown-clock.ts`, `use-countdown.ts`).** The server's `serverNow` is taken as "now"
at the first client read and advanced by `performance.now()`, never `Date.now()`, so a wrong or stepped
device clock changes nothing. It ticks every 1000 ms; the last tick is scheduled for the exact zero
moment. Server render and hydration use the server's own remaining time.

**Hand-over and resync (`launch-countdown.tsx`).** At 0 ms remaining (not when the digits first read
zero) it calls `router.replace("/")` once, without a full reload. When the window gains focus or the tab
becomes visible it calls the events route from the browser (5 s): `active` hands over at once; `upcoming`
replaces the start time and server time; a failure keeps counting on the existing offset.

**Reuse.** `CountdownDisplay` (pure: days, hours, minutes boxes plus a polite live region) and
`useCountdown(targetIso, serverNowIso)` (returns `remainingMs` and the parts; never navigates) know nothing
about redirects or event status. The Homepage `CeremonyCountdown` reuses them (it stops at 00, never
redirects). Only `LaunchCountdown` navigates.

## Homepage, Awards, Community Standards (F004)

The Homepage streams its Go event read (countdown and event info) inside `<Suspense>` with a fallback and
retry; `/awards` and `/community-standards` are static typed content cached per locale with `use cache`;
the awards menu uses hash anchors and a scroll-spy. See
[`system-architecture-homepage-awards.md`](system-architecture-homepage-awards.md).

Tests: `e2e/countdown-prelaunch.spec.ts` with `e2e/support/launch-gate-fixtures.ts` switches the event
row between seed scenarios and restores `live`; the 60 s cache makes step order matter.

## Planned (not yet in code)

| Item | Phase |
|---|---|
| Feature routes and screens | 6 to 13 |
| Final integration, E2E, docs | 14 |

Source of truth for phases: `plans/261109-1626-saa-2025-website/plan.md`.
