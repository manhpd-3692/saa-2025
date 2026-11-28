# Project Changelog

What each delivered phase changed, newest first. Phase scope and status live in
[`plans/261109-1626-saa-2025-website/plan.md`](../plans/261109-1626-saa-2025-website/plan.md);
current structure in [`system-architecture.md`](system-architecture.md).

## Phase 9: own and other Sunner profiles, F007 (commit `8073e25`, 2026-11-28)

- Added: `/profile` (own, from the avatar menu) and `/profile/[userId]` (teammate, from a card avatar): header
  with unit and collected icons, kudos / hearts counts, box figures and "Mở Secret Box" for the owner only,
  received / sent dropdown kept in `?filter=`, "Xem thêm" paging, send-kudo button preselecting the teammate.
  The own id on the teammate address redirects to `/profile`; unknown or malformed ids show Not found.
- Added: Go routes `GET /api/v1/users/{id}/profile` and `GET /api/v1/users/{id}/kudos?filter=&cursor=`
  (`wire_profile.go`, `internal/profile`); `kudo.ReadService.CardsFromRows` so the lists reuse the board's
  card assembly and sender masking; filter-tagged cursor (400 `invalid_cursor` for the other filter).
- Added: anonymous sends stay out of a teammate's sent list and count unless the viewer is the owner or an
  admin; spam is never listed or counted.
- Changed: header nav keeps Sun* Kudos selected on `/profile/<id>` (`NavItem.alsoUnder`); the own profile
  selects nothing.
- Added: Playwright spec `e2e/sunner-profiles.spec.ts`; Vitest for the list state and nav rule; Go integration
  tests for the endpoints.
- Docs: F007 section in `system-architecture.md`; profile route table in `backend/README.md`.

## Phase 8: hearts, hero badges, rules panel and secret box, F008 (commit `a9f3c68`, 2026-11-28)

- Added: heart toggle on every KudoCard with an optimistic weighted total, one shared state per kudo across
  Highlight, feed and detail, and a revert on failure; x2 campaign badge with a hover (name and window).
- Added: hero tier badges (New, Rising, Super, Legend) with hover, from `heroTier` inside each card.
- Added: rules panel ("Thể lệ") from the FAB; secret box window (box, revealed icon, n/6, congratulation box).
- Added: Go routes `GET /api/v1/campaigns/active` and `GET /api/v1/me/secret-boxes`
  (`wire_gamification_reads.go`); latest gift recipients now come from the gamification queries.
- Changed: secret box open is idempotent by `Idempotency-Key` (replay returns the stored answer); the
  completing open stores its `icons_completed` notice in the open's transaction (`notification.StoreInTx`,
  savepoint), so it is written exactly once.
- Changed: handlers log failures through `httpx.LogRequestFailure`: a caller-cancelled request is INFO, a
  server deadline or any other failure stays ERROR.
- Changed: seed adds 8 demo Sunners (24 users, 60 kudos) so every hero tier shows, a running x2 heart
  campaign (now - 1 day to now + 13 days) with campaign-weighted hearts, and opened boxes for the e2e user.
  The Go integration suite clears active campaigns, so reseed afterwards.
- Added: Playwright specs `e2e/like-kudos-and-secret-box.spec.ts` and `e2e/secret-box-open-and-retry.spec.ts`;
  Vitest for the heart store, toggle and open hook; Go tests for reads, cancellation logging and the notice.
- Docs: F008 section in `system-architecture.md`; gamification route table in `backend/README.md`.

## Phase 7: Kudos Live board and View Kudo, F006 (commit `2f44032`, 2026-11-28)

- Added: `/kudos` board: key visual, Highlight carousel (top 5 by weighted hearts, Hashtag and Phòng ban
  filters), Spotlight word cloud with search and ticker, All Kudos infinite feed and sidebar (own stats,
  latest gift recipients). Each section loads, empties, fails and retries on its own.
- Added: View Kudo as an overlay over the board (intercepted `@modal/(.)[id]` route) and as a direct page
  `/kudos/[id]`, with Copy Link; avatar hover card with "Gửi KUDO" preselecting the recipient.
- Added: Go routes `GET /api/v1/kudos`, `/kudos/highlight`, `/kudos/filter-options`, `/kudos/spotlight`,
  `/kudos/sidebar` and `GET /api/v1/users/{id}/hover-card`; opaque keyset cursor (400 `invalid_cursor`).
- Added: migration `20261128070000_kudo_board_read_indexes` (two partial indexes); 11 migrations in total.
- Changed: a missing, non-uuid or hidden kudo shows the root 404 in the minimal chrome inside the shell;
  `MinimalChrome` takes `bodyAs`, and the shell hides its own chrome under a `data-minimal-page`.
- Changed: `next.config.ts` allows the signed `kudo-images` Storage path for `next/image`.
- Changed: seed stores 16 demo kudo images through the local Storage API, so it needs `SUPABASE_URL` and
  `SUPABASE_SERVICE_KEY` and refuses a non-loopback Storage host; demo data is 16 users and 30 kudos.
- Added: dictionary namespace `kudos-board` (vi and en); Playwright specs `e2e/kudos-board.spec.ts` and
  `e2e/kudos-board-images-and-actions.spec.ts`; Vitest and Go tests for cursor, card builder and reads.
- Docs: Kudos Live board section in `system-architecture.md`; route table in `backend/README.md`.

## Phase 6: write, edit and send kudos, F005 (commit `7a31bbd`, 2026-11-28)

- Added: compose/edit modal (Tiptap) opened from the FAB: recipient combobox, mention suggestions, hashtag
  picker, link box, image grid, anonymous toggle, edit prefill. Dictionary namespace `kudo-compose`.
- Added: Go routes `GET /api/v1/users/search`, `GET /api/v1/hashtags`, `GET /api/v1/kudos/{id}/edit`,
  `PATCH /api/v1/kudos/{id}` (edit; going anonymous redacts notifications, none sent on edit) and
  `DELETE /api/v1/uploads/{uploadId}`.
- Added: upload state `pending_delete` with mark-then-delete cleanup; migration
  `20261128060000_kudo_uploads_unsaved_pending_delete`.
- Added: `cmd/purge-uploads` (manual only, `-dry-run`) for pending uploads older than 24 h and leftover
  `pending_delete` rows.
- Added: visible-text length vectors shared by Go and Vitest; Playwright spec `e2e/write-kudo.spec.ts`.
- Docs: `backend/README.md` lists the compose endpoints and states what `SUPABASE_SERVICE_KEY` is used for
  (Storage and the C08 `email_verified` check).

## Phase 5: Homepage, Awards, Community Standards, F004 (commit `0e5bd13`, 2026-11-28)

- Added: Homepage `/`. Hero, about text, six award cards and the Kudos block render at once; the event
  panel (ceremony countdown and event info) streams from a per-request Go read inside `Suspense`. With no
  event row, an error or no answer in 5 s it shows a fallback with a Retry button (`router.refresh()`).
- Added: `CeremonyCountdown`. Counts to `ceremonyAt` on server time with the shared `useCountdown`; never
  redirects, stops at `00`, resyncs `serverNow` on refocus.
- Added: `/awards` (six cards, sticky menu with hash anchors and scroll-spy, Kudos block) and
  `/community-standards` (ten rules and the security standards). Both signed-in only, static typed content
  (`award-catalog.ts`, `community-rules-content.ts`) cached per locale with `use cache`.
- Added: English falls back to Vietnamese where the design gave no English copy (`LocalizedText`,
  `pickLocalized`, `loadTranslator`). New dictionary namespaces `home`, `awards`, `standards`.
- Added: awards menu keeps the fragment in the address (Back returns), moves focus to the card, and scrolls
  instantly under `prefers-reduced-motion`.
- Added: `KeyVisualBackdrop` for the three pages.
- Added: Playwright specs `e2e/homepage-and-awards.spec.ts` and `e2e/awards-and-community-standards.spec.ts`;
  Vitest for event date format, ceremony countdown, award catalog and `pickActiveAward`.
- Docs: Phase 5 architecture in `system-architecture-homepage-awards.md`.

## Phase 4: countdown launch gate, F003 (commit `ed625fa`, 2026-11-28)

- Added: launch gate in `src/proxy.ts`, run in parallel with the session refresh and before the sign-in
  redirect. Before `start_at`, non-exempt pages get a 307 to `/countdown`; `/countdown`, `/login`,
  `/auth/callback` and `/_next` are exempt. Fails open on a Go error, no event row, or no answer in 1.5 s.
- Added: gate cache (60 s, successes only, one shared in-flight read); `/countdown` re-reads Go while the
  cached reading says upcoming, so the hand-over cannot loop.
- Added: `/countdown` page (bare route, fresh Go read, redirect to `/` once started, "Coming soon" when
  the event cannot be read) and dictionary namespace `countdown` (vi and en).
- Added: countdown on server time plus `performance.now()` (device clock ignored); hand-over to `/` at
  0 ms; resync on refocus. `CountdownDisplay` and `useCountdown` are shared for the Phase 5 ceremony.
- Added: events client `src/lib/events/events-api.ts` for `GET /api/v1/events/current`.
- Added: Playwright spec `e2e/countdown-prelaunch.spec.ts`; Vitest for the clock and the time split.
- Local use: `SEED_SCENARIO=prelaunch` shows the countdown, `live` restores the site; the gate may take
  up to 60 s to notice the change.

## Phase 3: app shell, Login, VN/EN switch, 403/404 (commit `01b620e`, 2026-11-27)

- Added: route-group chrome. `(shell)` full chrome (header nav, avatar menu with Admin item for admins,
  language switch, bell slot, footer, floating action button), `(minimal)` chrome for Login and error
  pages, admin layout with role gate and `AdminChrome`.
- Added: Login page with error reasons and an internal-only return path; localized 403 and 404 pages.
- Added: session summary from Go `/me` (`no-store`, 5 s) deciding the chrome; `MeRefresher` re-reads it
  on window focus.
- Added: language switch writing cookie `saa_locale`, then `router.refresh()`; dictionaries
  `shell`, `auth`, `errors` (vi and en).
- Changed: sign-out expires the `sb-*` session cookies itself when Supabase Auth is unreachable
  (waits at most 5 s). Browser calls to Go now time out after 5 s.
- Added: keyboard model for header menus (`use-dismissable-popover.ts`).
- Added: Playwright specs for shell, locale, Login, admin gate and menu keyboard. Playwright now runs
  one worker because the Windows to WSL relay drops requests under parallel load.
- Changed: ESLint ignores `logs/**`; dev server allows origin `[::1]`. Pages under `src/app/admin`
  must export `instant = false`.
- Design assets: low-resolution crops from `docs/figma-refs` in `public/images/`.

## Phase 2: end-to-end risk path (commit `bb599fd`, 2026-11-27)

- Go API: provision and `/me`, current event, signed kudo image uploads (magic-byte check, per-owner
  quota), kudo create and masked detail read, notification core, idempotent hearts and secret-box open,
  versioned spam/public moderation decisions.
- Frontend: minimal login, OAuth callback with safe `next`, `proxy.ts` session refresh, profile
  recovery helper.
- Tests: unit and integration per Go package, row-lock concurrency tests, Playwright CORS transport
  smoke, local-only test session script.

## Phase 1: foundation (commit `1ecb8cb`, 2026-11-27)

- Next.js frontend bootstrap with route-group layouts and i18n plumbing.
- Go API skeleton with JWKS auth, sqlc, Supabase migrations and seed scenarios.
- Figma reference images under `docs/figma-refs`.
