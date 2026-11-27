# Project Changelog

What each delivered phase changed, newest first. Phase scope and status live in
[`plans/261109-1626-saa-2025-website/plan.md`](../plans/261109-1626-saa-2025-website/plan.md);
current structure in [`system-architecture.md`](system-architecture.md).

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
