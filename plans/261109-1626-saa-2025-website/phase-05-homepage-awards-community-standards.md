# Phase 05 — Homepage, awards information, community standards (F004)

## Context Links
- F004: `spec/homepage-awards-information-and-community-standards/{functional-spec.md, technical-spec.md}`; screens `SCR-HomepageSaa`, `SCR-AwardsInformation`, `SCR-CommunityStandards`
- `docs/screen-specs/{homepage-saa,he-thong-giai}.md` (visual evidence only)
- Contract: R08, R16, R17. Decisions: G13, AD04, AD14
- Figma: Homepage SAA `2167:9026`, Hệ thống giải `313:8436`, Community Standards `1161:8944`
- Verify reports: `reports/verify-homepage-saa.md`, `reports/verify-awards-system.md`, `reports/verify-community-standards.md`
- Review: `reports/reviewer-phase-05.md`

## Overview
- Priority: P1. Status: **complete (0e5bd13)**. Effort: 8h.
- Checklist: **Homepage SAA**, **Hệ thống giải** (+ Đa ngôn ngữ on these pages). Screen tracker: Homepage SAA PASS (1 fix round), Hệ thống giải PASS (1 fix round), Community Standards PASS (0 fix rounds).
- Homepage (hero, `CeremonyCountdown`, event info, six award cards, CTAs, static Kudos teaser), Awards page (sticky
  menu, anchors, scroll-spy, Signature dual prize), Community Standards page. Award catalog + rules are static typed content.

## Key Insights
- `CeremonyCountdown` targets `ceremonyAt`, never redirects, ignores `status`, stops at 00 (R08).
- Homepage dynamic (per-request Go call, no-store); awards/standards static per locale (tech-spec 5.3 #2 — confirm API in bundled docs).
- Vietnamese is master; missing English falls back to Vietnamese — do not invent translations (Codex checklist note).
- Event-info failure isolated: countdown + info blocks show fallback with retry; rest of page renders (SC-010).
- Starts after P4 step 2 (shared countdown files merged) and P3 (shell layout). Deletes scaffold `src/app/page.tsx`.
- Homepage and Awards link to `/kudos` (constant `KUDOS_BOARD_PATH`). These links 404 until the Kudos board (F006, phase 07) lands; re-verify them when it does.

## Requirements
- FR-001, FR-002, FR-101–FR-103, FR-201–FR-207, FR-301–FR-305, FR-351, FR-352, FR-401–FR-403, FR-601, BR-001–BR-003, ALG-001, US001–US005; SC-001–SC-011.

## Architecture
```
(shell)/page.tsx ── getEvent() no-store 5 s ──► EventInfoBlock + <CeremonyCountdown ceremonyAt serverNow/>
                 └─ AwardCard×6 (award-catalog.ts) + SunKudosPromoBlock → /kudos
(shell)/awards/page.tsx (static) → AwardsMenu (client: hash anchor, IntersectionObserver scroll-spy) + AwardCard list
(shell)/community-standards/page.tsx (static) → CommunityRuleList (content transcribed from 1161:8944)
```

## Related Code Files
Delete: `src/app/page.tsx` (scaffold)
Create
- `src/app/(shell)/page.tsx`, `src/app/(shell)/awards/page.tsx`, `src/app/(shell)/community-standards/page.tsx`
- `src/features/home/{home-hero.tsx, ceremony-countdown.tsx, event-info-block.tsx, event-fallback-retry.tsx}`
- `src/features/awards/{award-catalog.ts, award-card.tsx, awards-menu.tsx, sun-kudos-promo-block.tsx}` (as built: see Deviations 1–4)
- `src/features/community-standards/{community-rules-content.ts, community-rule-list.tsx}`
- `public/images/awards/*`, `public/images/home/*` (exported from Figma; backgrounds currently painted-out crops, see Open Items)
- `src/i18n/dictionaries/{vi,en}/{home,awards,standards}.json`
- Tests: `src/features/awards/award-catalog.test.ts`, `src/features/home/ceremony-countdown.test.ts` (as built), `e2e/homepage-and-awards.spec.ts`, `e2e/awards-and-community-standards.spec.ts`
Read-only reuse: `src/features/countdown/{countdown-display.tsx, use-countdown.ts}` (owned by P4)

## Implementation Steps
1. Typed award catalog (six awards, order, quantities, prize values; Signature dual prize per BR-002) + unit test.
2. AwardCard variants (standard, dual-prize), promo block.
3. Homepage: hero, event info, CeremonyCountdown, award grid, CTAs; fallback + retry.
4. Awards page: menu, anchors (`/awards#mvp`, unknown hash stays top), scroll-spy, keyboard focus.
5. Community Standards transcription from Figma `1161:8944` into typed content (VN; EN only if supplied).
6. Export artwork; verify at 1280 px.
7. Tests.

## Todo List
- [x] Award catalog + test
- [x] Cards + promo
- [x] Homepage + ceremony countdown + fallback
- [x] Awards page menu/anchors/scroll-spy
- [x] Community standards content
- [ ] Artwork export — **partial**: backgrounds are painted-out crops, not Figma exports (Open Item 3)
- [x] 1280 px check
- [x] Tests — vitest 185/185, e2e 58/58 on final code `0e5bd13`

## Success Criteria (test plan)
- Vitest: catalog order/values (SC-001, SC-002); CeremonyCountdown stops at 00, no navigation call (SC-008 unit part). **Met.**
- Playwright: SC-003, SC-004, SC-006 (unauth → Login), SC-005/SC-007 (`live`), SC-008 (`after-ceremony` + few-seconds-ahead), SC-009 refocus, SC-010 (no event row / stalled API), SC-011 (1280 px / narrower). **Met** (e2e 58/58). Reduced-motion scrolling is verified in code only (Open Item 9).
- Manual daily check: Homepage SAA and Hệ thống giải against Figma. **Not recorded** (Open Item 10).

## Scope Contract
- Changed: three pages, home/awards/standards features, assets, dictionaries.
- Impacted: `/` route (scaffold removed); shell nav active state.
- Will verify: Vitest for static data + countdown mode, Playwright for anchors/scroll/temporal seeds.
- Deliberately skipped: Go events (unchanged), shared countdown math (P4 tests own it).

## Deviations
| # | Deviation from plan | Reason | Cost |
|---|---|---|---|
| 1 | `award-card.tsx` split into `award-detail-card.tsx` and `award-summary-card.tsx` | Separate single-purpose components per card variant (development-rules file-size and composition rules) | Two files instead of one; no behavior change |
| 2 | Added `home-event-panel.tsx` | Suspense streaming: event info loads while the rest of Homepage renders (SC-010) | One extra file |
| 3 | Added `pick-active-award.ts` | Active-award selection kept as a pure helper outside components | One extra file |
| 4 | Added `key-visual-backdrop.tsx` | Shared hero backdrop | One extra file |
| 5 | Second e2e spec `awards-and-community-standards.spec.ts` | Standards coverage split from the Homepage/Awards spec | One more spec to maintain |
| 6 | Ceremony countdown unit test is `ceremony-countdown.test.ts` (plan: `.test.tsx`) | Test has no JSX | None at runtime |
| 7 | `/awards` and `/community-standards` use `'use cache'` per locale | Content is static per locale | Content edits need a cache refresh (redeploy) to show |
| 8 | Signature menu label follows FR-302 ("Signature 2025 - Creator") over the Figma PNG (two lines, no hyphen) | Spec is the precedence source over the PNG | Label differs visually from Figma |
| 9 | "Coming soon" wording per FR-202, not the Figma typo | Spec over design typo | Copy differs from Figma text |
| 10 | P4 live e2e assertion scoped to the launch countdown | Homepage has its own ceremony countdown (FR-102), so an unscoped assertion matches two countdowns | Touches a P4-owned test; assertion now depends on its scope selector |
| 11 | Environment incident: WSL hung about 07:13–10:08; `wsl --shutdown` recovered it, Supabase and Go API restarted, DB reseeded to `live` | Infrastructure, not scope | About 3 h of phase time lost; final checks re-run on final code |

## Risk Assessment
| Risk | L | I | Status | Mitigation |
|---|---|---|---|---|
| Copy drift from Figma (RISK-01) | M | M | Open, partly mitigated | Transcribed verbatim; Figma copy issues in Open Items 5 |
| Missing EN content | H | L | Open | VN fallback per AD04 (Open Item 2) |
| Artwork export quality/size | M | L | Realised (crops) | `next/image` fixed sizes in place; real exports pending (Open Item 3) |
| `/kudos` CTAs 404 until F006 | H | M | Open until phase 07 | Re-verify when board lands (Open Item 1) |
| Event venue/livestream seed placeholders | M | M | Open | Real values before launch (Open Item 4) |
| WSL/local environment hang | M | M | Closed | Recovered via `wsl --shutdown`; DB reseeded; checks re-run |

## Rollback
- Revert commits; restore scaffold `src/app/page.tsx` if needed.

## Open Items
| # | Item | Owner | Done when |
|---|---|---|---|
| 1 | `/kudos` CTAs 404 until F006 ships. Re-verify Homepage and Awards links to `KUDOS_BOARD_PATH`; add the matching note to phase-07 Key Insights | Orchestrator (main agent); phase-07 owner | Board route returns 200 from both CTAs in e2e |
| 2 | English copy not supplied; VN fallback in place (AD04) | Content owner (client) | EN dictionaries supplied and reviewed, or fallback accepted in writing |
| 3 | Backgrounds are painted-out crops | Orchestrator (UI implementer) | Figma exports replace `public/images/home/*` and `public/images/awards/*`; 1280 px check re-run |
| 4 | Event venue and livestream text are seed placeholders | Content owner; Admin campaign settings (P13) | Real values entered before launch |
| 5 | Figma copy issues: three awards share one homepage summary; trailing comma; personal Slack handle in community standards | Design owner | Figma corrected or decision logged in `clarifications.md`; handle keep/remove decided |
| 6 | Footer current-page marking | Phase 3 owner | Footer marks current page; e2e assertion passes |
| 7 | `[countdown]` log prefix in shared events helper | Phase 4 owner | Prefix renamed or confirmed intentional |
| 8 | FR-103 spam-warning link | Phase 10 owner | Link wired; P10 e2e covers it |
| 9 | Reduced-motion scrolling verified in code only | Tester | Playwright reduced-motion assertion runs in e2e |
| 10 | Manual daily check vs Figma not recorded | Orchestrator with designer | Sign-off recorded in a verify report or here |
