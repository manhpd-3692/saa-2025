# Shared spec context (handoff for feature-spec editors)

Rewritten 2026-11-10 for Codex R14. The earlier version described a Next.js-only backend with Postgres write/read functions; that architecture was superseded by G15–G19 and must not be used.

## Precedence (read this first)

When two sources disagree, the higher one wins:

1. `reports/codex-findings-resolution-contract.md` — how each Codex finding R01–R23 is resolved.
2. `spec/gap-resolution-log.md` — user decisions; later rows win (G15–G19 supersede G11; AD/X rows apply defaults and cross-spec fixes).
3. Reconciled feature specs under `spec/<feature>/` (functional, technical, screens).
4. `docs/SCREENFLOW.md` and `docs/screen-specs/*.md` — visual and flow evidence only. Their API mappings (`/api/awards`, `/api/users/me/language`, unversioned `/api/...` endpoints) are **historical**: awards are static content, locale is a cookie, and every backend call is Go `/api/v1/...`.

Paths in this file are relative to `plans/261109-1626-saa-2025-website/` unless they start with `docs/`, `backend/`, `supabase/` or `node_modules/`.

## Architecture (G15–G19, AD13)

- **Next.js 16 App Router at the repo root is the frontend only.** It renders UI, never touches the database and holds no database or Storage secrets. Server Components call the Go API server-side (5 s timeout via `AbortSignal.timeout`, R23); client components call it from the browser with `Authorization: Bearer <supabase access token>`. No BFF.
- **Go REST API in `backend/`** owns every business read/write and all authorization: stdlib `net/http` ServeMux (Go 1.22+ patterns), pgx + sqlc (`backend/cmd/api`, `backend/internal/...`, `backend/db/queries`). All endpoints are under `/api/v1`. Business rules (anonymous masking via one shared `maskSender(kudo, viewer)` helper, weighted hearts, box grants, tier transitions, notifications) run inside Go transactions. There are no Postgres write/read functions or `security definer` RPCs; mentions of them in older text are historical.
- **Supabase** provides Google OAuth (Next.js runs the flow; Go verifies the JWT against JWKS), Postgres and private Storage. Migrations via Supabase CLI in `supabase/migrations`; seeds in `backend/db/seeds/`.
- **No Redis.** The only cache is the 60 s in-process cache of the event lookup in `proxy.ts`.
- `proxy.ts` handles routing only: launch-gate redirect (F003), sign-in redirect and Supabase session-cookie refresh (F002). It makes no database call.

## Shared contracts editors must reuse

- **Identity and roles (F002, R05, R21, R22).** Role comes only from `users.role`, loaded by Go on every request through F002's shared auth context and `RequireAdmin` middleware. There is no `profiles` table. JWT: asymmetric keys (ES256/RS256) via JWKS, issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`. Google provider only; provisioning requires a verified `@sun-asterisk.com` Google identity. Go connects as Postgres role `saa_api`; RLS deny-all on business tables; `anon`/`authenticated` have no grants. On 403 `profile_not_provisioned` the frontend calls `POST /api/v1/me/provision` once, then signs out to `/login?error=profile_unavailable`.
- **Browser transport (F002, R06).** Go CORS middleware runs before auth: origins from `FRONTEND_ORIGINS`, `OPTIONS` answered 204 without JWT, methods GET/POST/PUT/PATCH/DELETE, headers `Authorization, Content-Type, Idempotency-Key`, exposes `Content-Disposition`, no credentials, max-age 600.
- **Layouts (F001, R07, R18).** Root `app/layout.tsx` holds only `<html>/<body>`, fonts and the locale provider. Route groups: `app/(shell)/` full chrome, `app/(minimal)/` Login and 403/404, `app/countdown/` bare, `app/admin/layout.tsx` admin chrome with F010's static nav config. Active links via a client `NavLinks` with `usePathname()`. The Forbidden page is a plain page (AD15) with visual acceptance only; HTTP 403 is asserted on Go endpoints only; `experimental.authInterrupts` stays off.
- **Deadlines (R23).** Go server: ReadHeaderTimeout 5 s, ReadTimeout 15 s, WriteTimeout 30 s; per-request DB context 5 s (exports 20 s). Next.js server fetches to Go: 5 s. Launch-gate lookup in `proxy.ts`: 1.5 s, then fail open. Post-commit notification work: its own detached 2 s context; failure is logged and never changes the mutation response.
- **Events and countdowns (F003, F004, R08, R16).** `events(start_at, ceremony_at, venue, livestream_note)`, read only through public `GET /api/v1/events/current` → `{ id, name, startAt, ceremonyAt, venue, livestreamNote, serverNow, status }`. Shared pure `CountdownDisplay` + `useCountdown(targetIso, serverNowIso)` (F003). `LaunchCountdown` (F003) targets `startAt` and redirects to `/` at 0 ms or on resync `status: active`. `CeremonyCountdown` (F004) targets `ceremonyAt`, never redirects, ignores `status`, stops at 00. Seed scenarios via `SEED_SCENARIO`: `prelaunch` (start +2 d, ceremony +20 d), `live` default (start −1 d, ceremony +14 d), `after-ceremony` (start −30 d, ceremony −1 d); demo activity within the last 14 days. AD03's 15 Dec 2025 18:00 date is the production placeholder, not the dev default.
- **Static content (F004).** Six-award catalog and community-standards copy are static, typed content in the Next.js app (no awards table, no awards API). Vietnamese is the master; missing English falls back to Vietnamese. Locale is a cookie handled by F001 (no language API).
- **Kudos and uploads (F005, R01, R03, R04, R20).** F005 owns `kudos`, `kudo_images`, `hashtags`, `kudo_hashtags` and `kudo_uploads(id, owner_id, object_path, mime, size_bytes, created_at, kudo_id, attached_at)`. Object keys are opaque: `kudo-images/{uploadId}.{ext}`, no user id anywhere in keys, URLs, DTOs, HTML or filenames. Private bucket with 5 MB limit and JPEG/PNG/WebP MIME list; signed upload URLs never upsert. Go finalizes attachments by `uploadId` (ownership, unattached, stored metadata, 512-byte magic-number sniff, 0–5 files) or answers 422 `invalid_attachment`. `DELETE /api/v1/uploads/{uploadId}` removes unattached own uploads (204) or answers 409. Content: sanitize, derive visible text, then required + max 1,000 code points.
- **Card DTO (F006, R15).** One `KudoCard` `{ id, createdAt, title, contentHtml, isAnonymous, sender | null, receiver, hashtags, images, heart: {total, viewerHearted, viewerCanHeart}, isOwn, status }`, where sender/receiver carry `{id, name, avatarUrl, unitCode, heroTier}`; lists return `{ items, nextCursor }` with an opaque keyset cursor. `units.code` holds the displayed unit code. Profile counts failure → `counts: null`, `countsUnavailable: true`. Anonymous DTOs carry no stable author identifier.
- **Gamification (F008, R09–R12).** `hearts` (weight and `campaign_id` fixed at heart time), `secret_boxes` (with `open_request_id` for idempotent opens), and `kudo_heart_state` — a **SQL view** `(kudo_id, heart_total = sum(weight))` read by Go, not a function. Campaign lookup failure inside the heart transaction → rollback, 500 `campaign_lookup_failed` (no weight-1 fallback). Hero tier transitions are computed before/after insert in the kudo transaction with the receiver row locked; box opens lock the user row; `Idempotency-Key` per opening intent.
- **Notifications (F009, R02, R19).** Table `notifications`; producers call Go `NotificationService.Create` after commit (best-effort, 2 s context). Exactly seven kinds: `kudo_received`, `heart_received`, `secret_box_received`, `hero_level_up`, `kudo_spam_warning`, `icons_completed`, `generic`. `review_requested` and the old `spam_warning` name are removed. Turning a kudo anonymous redacts sender fields in existing notification params; reads re-mask by the kudo's current `is_anonymous`.
- **Moderation (F011, R13).** Statuses `public` / `spam` only. `kudos.moderation_version` with `{ expectedVersion }` on `POST /api/v1/admin/kudos/{id}/spam|public`; stale version → 409 `stale_decision`.
- **Admin (F010, F012).** Every admin path uses F002 auth + `RequireAdmin`. F012 owns `campaigns` (integer multiplier 2–10, default 2); F008 owns the user-facing active-campaign lookup.

## Feature spec folders

| Feature | Folder |
|---|---|
| F001 App shell & i18n | `spec/app-shell-navigation-and-i18n/` |
| F002 Google auth, session & roles (+ `spec/system/permissions.md`) | `spec/google-sign-in-session-and-roles/` |
| F003 Countdown & launch gate (owns `events`) | `spec/event-countdown-and-launch-gate/` |
| F004 Homepage, awards, community standards | `spec/homepage-awards-information-and-community-standards/` |
| F005 Write/edit/send kudos | `spec/write-edit-and-send-kudos/` |
| F006 Live board & kudo detail | `spec/kudos-live-board-and-kudo-detail/` |
| F007 Profiles | `spec/own-and-other-sunner-profiles/` |
| F008 Hearts, hero badges, secret box | `spec/hearts-hero-badges-and-secret-box/` |
| F009 Notification center | `spec/notification-center/` |
| F010 Admin overview & users | `spec/admin-overview-and-user-directory/` |
| F011 Admin kudo moderation | `spec/admin-kudo-moderation/` |
| F012 Admin campaigns | `spec/admin-campaign-settings/` |

## Verified framework facts (Next.js 16.4.5 bundled docs, `node_modules/next/dist/docs`)

- `middleware` is renamed to `proxy` (`proxy.ts`, export `proxy`); proxy runtime is `nodejs` only. Source: `01-app/02-guides/upgrading/version-16.md` § "middleware to proxy".
- `forbidden()` / `unauthorized()` are experimental (`experimental.authInterrupts`); this project does not enable them (AD15, R18). Source: `01-app/03-api-reference/04-functions/forbidden.md`.
- Layout and route-group rules for R07: `01-app/03-api-reference/03-file-conventions/layout.md` and `route-groups.md`.
- Agents cannot read `node_modules/next/dist/docs` via Bash (ignore hook); use the Read/Grep tools on that path.

## Design facts confirmed from Figma

- Header nav labels: "About SAA 2025", "Awards Information", "Sun* Kudos".
- Footer 4th link label: "Tiêu chuẩn chung" (links to the Community Standards page).
- Release acceptance is desktop only: minimum viewport 1280 px, horizontal scroll below that; inherited mobile/tablet rows are marked "Out of release scope (AD01, R17)".
