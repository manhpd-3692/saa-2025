# Review: Phase 5 (F004 Homepage, Awards, Community Standards), uncommitted

## Scope
- Files: 3 routes, `src/features/{home,awards,community-standards}/*`, `key-visual-backdrop.tsx`, `src/i18n/{localized-text,load-translator,locale-config}.ts`, 6 dictionaries, `public/images/{home,awards,community-standards}`, 2 e2e specs + fixtures, the one-assertion change in `countdown-prelaunch.spec.ts`, `e2e/README.md`.
- Depth: full read of app code and both e2e specs. Ran `tsc --noEmit` (clean), `eslint src e2e` (0 findings), `vitest run` (19 files / 185 tests pass). `next build` and Playwright NOT run (build blocked by the `.next` ignore hook; e2e needs the WSL stack).
- All files under 200 lines (max 141, `award-catalog.ts`), kebab-case.

## Assessment
Ready to commit after the small fixes below. No critical findings. The Next 16 caching, auth and countdown contracts hold. The warnings are a stale-offset edge in the ceremony countdown, reduced-motion handling, and a cache-key test gap.

## Critical
None.

## Warnings

**W1. `CeremonyCountdown` freezes its `serverNow` state after a soft refresh** - `src/features/home/ceremony-countdown.tsx:18`, `home-event-panel.tsx:32`.
`useState(props.serverNow)` reads the prop once. A later `router.refresh()` (language switch, MeRefresher, or an admin changing `ceremonyAt`) re-renders the server panel with a fresh `serverNow` and `ceremonyAt`, but the state keeps the old `serverNow`. `useCountdown` memoizes on `[targetIso, serverNowIso]`: if `ceremonyAt` changes, the clock re-anchors on the *old* server time, so the digits are off by the time elapsed since first load. Fix: remount on each server read, `<CeremonyCountdown key={event.serverNow} ... />` in `home-event-panel.tsx:32` (cheapest), or sync state from props.

**W2. Menu scroll ignores `prefers-reduced-motion`** - `src/features/awards/awards-menu.tsx:60`.
`scrollIntoView({ behavior: "smooth" })` is unconditional, and no reduced-motion rule exists anywhere in `src` (grep). WCAG 2.3.3 / user preference violated. Fix:
```ts
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
if (reduce) settle(); // no scrollend will follow an instant jump
```

**W3. Per-locale `use cache` isolation is not proven by any test** - `e2e/awards-and-community-standards.spec.ts:122-136`.
Code is correct: `locale` is a prop (validated `vi|en` by `resolveLocale`, so key space is bounded), `loadTranslator` reads no request data, no user data inside. But the only en/vi pair that differs is `/community-standards` (h1 "Community Standards" vs "Tiêu chuẩn cộng đồng"), and the en test runs after the vi tests, so a vi→en leak would fail but an en→vi leak would pass unnoticed. Fix: in the English test, after the en assertions, set cookie `saa_locale=vi`, reload `/community-standards`, and assert h1 "Tiêu chuẩn cộng đồng" (and `/awards` menu label stays Vietnamese-keyed).

## Suggestions

**S1. Listener and timer not cleaned on unmount** - `awards-menu.tsx:58-59`. The `scrollend` listener (`once`) and the 1.2 s timeout survive unmount; harmless (React ignores late `setActive`) but sloppy. Keep both in a ref and clear them in the effect cleanup at `:44`.

**S2. Ceremony unit test is partly vacuous** - `src/features/home/ceremony-countdown.test.ts:10-11,43-48`. The component never imports `next/navigation`, so "router never called" cannot fail. Effects never run under `renderToString`, so the resync listeners and their cleanup are untested at unit level (e2e SC-009 covers the resync, not cleanup). Either drop the mock test, or render with `@testing-library/react`/jsdom and assert `removeEventListener` runs on unmount and at zero.

**S3. Duplicate region names on Home** - `home-hero.tsx:18-20` (region named by h1 "ROOT FURTHER") and `home-about-section.tsx:13` (`aria-label` = same string). Two landmarks with one name confuse screen-reader landmark lists. Give the about section its own key (e.g. `home.about.label`) or drop the `aria-label` (no heading, so a plain `<section>` is not a landmark).

**S4. `role="status"` wraps a button** - `event-fallback-retry.tsx:17`. The live region will read the button label too. Put `role="status"` on the `<p>` only.

**S5. Key-visual art loaded as CSS background, not preloaded** - `key-visual-backdrop.tsx:43`. A 113 KB hero found only after CSS parse is a late LCP candidate on `/`. Consider `next/image` with `preload`/`priority` or `<link rel=preload>`. Also: the comment says the crops are "painted out" Figma PNGs to be replaced; track the real export swap in the plan (provenance/licence of derived art).

**S6. Magic numbers duplicated** - `HEADER_OFFSET_PX = 80` (`awards-menu.tsx:8`) vs `scroll-mt-24` (`award-detail-card.tsx:35`) vs `top-24` (`awards-menu.tsx:66`). If the header height changes, three places drift. Export one constant or a CSS variable.

**S7. Log tag** - `events-api.ts:86` still logs `[countdown]` though the Homepage is now a caller; use `[events]`. Test flakiness: `waitForTimeout` at `homepage-and-awards.spec.ts:122`, `awards-and-community-standards.spec.ts:58,91` could be replaced with polls.

## Focus items, verdicts
- **`use cache`**: OK. Cache key = `locale` argument; request APIs (`cookies`/`headers`) read in the page, outside the cached scope; no user-specific data cached; children (`AwardsMenu`, `AwardImage`) are client components fed serializable props. See W3 for test gap.
- **Homepage streaming (SC-010)**: OK. `connection()` + 5 s Go read sit inside `<Suspense>`, static content streams first; placeholder and fallback share `min-h-[262px]` (no layout shift); retry uses `router.refresh()` in a transition with disabled/`aria-busy`; no-row, error and timeout all collapse to `null` -> fallback. Real e2e for no-row and a table-lock stall.
- **Ceremony countdown (R08)**: OK. Targets `ceremonyAt`, never reads `status`, no router use, clock schedules no timer once 0 (unit-asserted `getTimerCount() === 0`), resync listeners removed on cleanup and skipped when stopped, overlapping `visibilitychange`+`focus` de-duplicated by `resyncing`, failed read keeps counting. Edge: W1.
- **Awards menu**: IntersectionObserver is disconnected in cleanup; scroll-spy rule is a pure, tested function (DEC-002); real `#slug` anchors work pre-hydration; modifier-click left to the browser; unknown hash finds no element, stays at top (asserted, with no page errors); focus moves to the card. Edge: W2, S1. Brief highlight of "Top Talent" until the first IO callback on `/awards#mvp` (SSR state), not worth fixing.
- **Accessibility**: heading order sound (Home h1 image-alt, h2 awards, h3 cards, h2 Kudos; Awards h1, h2 per card; Standards h1, h2). Decorative images have `alt=""` with an adjacent name; logo alt is "ROOT FURTHER"; backdrop is `aria-hidden`. See S3, S4.
- **XSS**: no `dangerouslySetInnerHTML` in `src`; venue/livestream note from Go rendered as text; dynamic `import()` path uses the validated `Locale` union only.
- **FR-601 / no login bypass**: `/`, `/awards`, `/community-standards` are not in `PUBLIC_PATHS`, proxy matcher covers them, and e2e asserts `307 /login` (with safe `next`) for all three while signed out. Launch gate runs first for each.
- **`instant = false`** present on all three pages.
- **E2E quality**: real assertions against an independent oracle (`homepage-fixtures.ts` does not import the catalog); covers drift/skew, resync, 75 s run-to-zero, after-ceremony, stalled DB, hash, Back, scroll-spy order, widths. Gaps: W3.
- **P4 spec change**: still proves F003 SC-003/FR-102. The 307 status, `Location: /`, and body-has-no-`data-unit` assertions on the `/countdown` response are untouched; the DOM check now excludes only the ceremony block and a positive `toHaveCount(3)` proves the ceremony countdown is present. The `:not([...] [data-unit])` complex selector is valid in Chromium. Line 128 (`/countdown`, no row) is unaffected.

## Done well
- Pure, tested seams: `pickActiveAward`, `formatEventDate`, award catalog invariants; shared `useCountdown`/`CountdownDisplay` reused, not forked.
- Server-clock discipline (monotonic anchor) and no-redirect contract enforced in code and test.
- Namespaced dictionaries with `vi` fallback; `LocalizedText` typed fallback instead of invented translations.
- Fixtures drive the real seed SQL; `after-ceremony` scenario added minimally.

## Actions in order
1. W1: add `key={event.serverNow}` at `home-event-panel.tsx:32`.
2. W2: reduced-motion branch at `awards-menu.tsx:60`.
3. W3: add the en->vi reload assertion to the English e2e.
4. S1, S3, S4 (small, same files).
5. S2, S5-S7 as time allows.
6. Run `next build` (cacheComponents prerender validation) and the two e2e specs on the WSL stack before commit.
7. At close: tick the phase-05 Todo list (all 7 items unchecked), update roadmap/changelog per `documentation-management.md`.

## Numbers
- Type check: clean. Lint findings: 0. Unit tests: 185/185 pass. Coverage % not measured.

## Still unresolved
- `next build` not run by me (hook blocked `.next`); cacheComponents "uncached data outside Suspense" validation is therefore unconfirmed (pages rely on `instant = false` and the layout already awaiting cookies).
- Playwright suites not run (need Supabase/Go/WSL).
- Confirm the painted-out Figma crops are acceptable to ship.

**Status:** DONE
**Summary:** No critical issues; auth, `use cache` keying, SC-010 streaming, R08 countdown and the P4 spec edit all hold. Four fixes advised before commit (stale countdown offset, reduced motion, locale-leak test, plus cheap a11y/cleanup items).
**Counts:** critical 0 / warning 3 / suggestion 7
