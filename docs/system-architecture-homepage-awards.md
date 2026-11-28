# Homepage, Awards and Community Standards (F004)

Part of [`system-architecture.md`](system-architecture.md). Covers the three Phase 5 pages: `/` (Homepage),
`/awards` and `/community-standards`. All three sit in the `(shell)` group (full chrome) and export
`instant = false`. `/awards` and `/community-standards` need a session (proxy, FR-601); `/` is the landing
page once the event has started (the launch gate sends it to `/countdown` before).

| Route | Page file | Feature code |
|---|---|---|
| `/` | `src/app/(shell)/page.tsx` | `src/features/home/` |
| `/awards` | `src/app/(shell)/awards/page.tsx` | `src/features/awards/` |
| `/community-standards` | `src/app/(shell)/community-standards/page.tsx` | `src/features/community-standards/` |

## Homepage: static content, streamed event panel

`HomePage` reads the locale and the `home` and `awards` namespaces (`getRequestTranslator`), then renders
`HomeHero`, `HomeAboutSection`, `HomeAwardsSection` and `SunKudosPromoBlock` at once. The one dynamic part,
`HomeEventPanel`, sits inside `<Suspense fallback={<HomeEventPanelPlaceholder />}>` as the hero's
`eventPanel`, so a slow Go never holds back the rest of the page.

`HomeEventPanel` (`home-event-panel.tsx`):

1. `await connection()`: the read happens per request, never at build time.
2. `getCurrentEventForPage()` (`src/lib/events/events-api.ts`) runs in parallel with the translator load.
   Same read as `/countdown`: Go `GET /api/v1/events/current`, no-store, 5 s budget; returns `null` on no
   row (404), error or timeout (anything but a 404 is logged).
3. Event present: "Coming soon" (`countdown.comingSoon`), `CeremonyCountdown` and `EventInfoBlock`.
   `CeremonyCountdown` is keyed on `event.serverNow`, so a soft refresh with a new server time remounts it
   and re-anchors the clock.
4. `null`: `EventFallbackRetry` replaces the countdown and event info (`role="status"`, message
   `home.event.unavailable`, button `common.retry`). Retry runs `router.refresh()` in a transition
   (button disabled and `aria-busy` while pending), which repeats the server read.

The placeholder and the fallback both reserve `min-h-[262px]`, so the layout does not jump.

## CeremonyCountdown (R08)

`src/features/home/ceremony-countdown.tsx`, a client component that counts to `ceremonyAt` with the F003
`useCountdown` and `CountdownDisplay` (see "Reuse" in the Launch gate section of the main page).

- Never navigates and never reads the event `status`: the site is open while the ceremony is still ahead,
  so there is no redirect at zero, unlike `LaunchCountdown`.
- At zero every unit reads `00` and the clock stops ticking. A ceremony already in the past renders `00`
  from the first paint.
- Resync: on `visibilitychange` (when visible) and window `focus` it calls `getCurrentEventFromBrowser()`
  and keeps only `serverNow`. A failed read is swallowed and counting continues on the existing offset. The
  listeners are removed once the countdown has stopped.

## Static typed content

No Go call and no database for the award and community copy; it ships with the app.

| Module | Content |
|---|---|
| `src/features/awards/award-catalog.ts` | `AWARDS`: six awards. Per award: `slug` (URL fragment and card element id), `name`, `menuLabel`, `summary`, `description`, `quantity`, `unit`, `prizes` (VND value and note), `image`. Array order is display order. |
| `src/features/community-standards/community-rules-content.ts` | `COMMUNITY_STANDARDS`: `lead`, `rulesIntro`, ten `rules`, and `security` (`intro`, `points`, `contact`). |

The catalog is read by the Homepage cards (`/awards#<slug>` links) and by `/awards`, so the order and
prizes are defined once. Only copy taken from the design goes in; nothing is invented.

## `use cache` per locale

`AwardsPageContent` and `CommunityRuleList` start with `"use cache"` and take `locale` as an argument, so
the cache key is the locale. The page files read the request locale (`getRequestLocale()`) and pass it in.
Inside the cached scope they use `loadTranslator(locale, ...namespaces)` (`src/i18n/load-translator.ts`),
which reads no request data, instead of `getRequestTranslator`. Requires `cacheComponents: true`
(`next.config.ts`). Namespaces: `awards` + `home` for Awards, `standards` + `home` for Community Standards.

A fragment such as `/awards#mvp` never reaches the server, so the cached page serves every award link.

## Vietnamese fallback for missing English copy

Two layers, both falling back to Vietnamese (the master language):

- Dictionary keys: `loadDictionary` in `src/i18n/load-dictionary.ts` layers the locale over the Vietnamese
  master (`withMasterFallback`), so a missing English key shows the Vietnamese text. `translate()` returns
  the key itself only when the key is absent from both.
- Typed content: `LocalizedText { vi: string; en?: string }` and `pickLocalized(text, locale)`
  (`src/i18n/localized-text.ts`) return `text[locale] ?? text.vi`. The award catalog and community
  rules carry no English description or rule text, so English shows the Vietnamese text there.

New dictionary namespaces this phase: `home`, `awards`, `standards` (`DICTIONARY_NAMESPACES` in
`locale-config.ts`, files under `src/i18n/dictionaries/{vi,en}/`).

## Awards menu

`src/features/awards/awards-menu.tsx` (client), a sticky `<nav>` beside the six cards.

- **Hash anchors.** Items are real `<a href="#slug">` links, so they work before hydration. A plain click
  scrolls to the card with `scrollIntoView`, moves focus to it (`preventScroll`), and calls
  `history.pushState` with the fragment unless it is already the hash, so Back returns. Clicks with
  Meta, Ctrl, Shift or Alt are left to the browser.
- **Scroll-spy.** An `IntersectionObserver` (root margin offsets the 80 px sticky header; thresholds
  0, 0.3, 1) feeds `pickActiveAward` (`pick-active-award.ts`): the topmost card in catalog order that is at
  least 30 % visible is active; if none is, the current item stays. The active item has `aria-current`.
- **During a menu click** the target stays marked, and the observer does not change the highlight, until
  `scrollend` (or a 1200 ms timeout where `scrollend` is unsupported), then the rule above applies again.
- **Reduced motion.** `prefers-reduced-motion: reduce` makes the scroll `behavior: "auto"` (instant)
  instead of `"smooth"`.

## Key visual backdrop

`src/components/key-visual-backdrop.tsx`: decorative, `aria-hidden` artwork behind the top of each page
(`home`, `awards`, `communityStandards`), painted as a CSS background at natural size, with a side-edge fade
on windows wider than the art and an optional bottom fade (`fadeFrom`, Homepage). The crops are derived
from the Figma references with the copy removed.

## Tests

| File | Covers |
|---|---|
| `e2e/homepage-and-awards.spec.ts` | Homepage live state, refocus resync, ceremony reaching `00`, after-ceremony, no-event fallback and retry, stalled read (5 s), card to `/awards#slug` |
| `e2e/awards-and-community-standards.spec.ts` | Catalog order and prizes, anchors, menu scroll and Back, focus outline, scroll-spy, community rules, signed-out redirect, English fallback, 1280 px layout |
| `src/features/home/*.test.ts`, `src/features/awards/*.test.ts` | Unit tests: event date format, ceremony countdown, award catalog, `pickActiveAward` |
