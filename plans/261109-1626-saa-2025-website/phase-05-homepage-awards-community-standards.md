# Phase 05 — Homepage, awards information, community standards (F004)

## Context Links
- F004: `spec/homepage-awards-information-and-community-standards/{functional-spec.md, technical-spec.md}`; screens `SCR-HomepageSaa`, `SCR-AwardsInformation`, `SCR-CommunityStandards`
- `docs/screen-specs/{homepage-saa,he-thong-giai}.md` (visual evidence only)
- Contract: R08, R16, R17. Decisions: G13, AD04, AD14
- Figma: Homepage SAA `2167:9026`, Hệ thống giải `313:8436`, Community Standards `1161:8944`

## Overview
- Priority: P1. Status: pending. Effort: 8h.
- Checklist: **Homepage SAA**, **Hệ thống giải** (+ Đa ngôn ngữ on these pages).
- Homepage (hero, `CeremonyCountdown`, event info, six award cards, CTAs, static Kudos teaser), Awards page (sticky
  menu, anchors, scroll-spy, Signature dual prize), Community Standards page. Award catalog + rules are static typed content.

## Key Insights
- `CeremonyCountdown` targets `ceremonyAt`, never redirects, ignores `status`, stops at 00 (R08).
- Homepage dynamic (per-request Go call, no-store); awards/standards static per locale (tech-spec 5.3 #2 — confirm API in bundled docs).
- Vietnamese is master; missing English falls back to Vietnamese — do not invent translations (Codex checklist note).
- Event-info failure isolated: countdown + info blocks show fallback with retry; rest of page renders (SC-010).
- Starts after P4 step 2 (shared countdown files merged) and P3 (shell layout). Deletes scaffold `src/app/page.tsx`.

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
- `src/features/awards/{award-catalog.ts, award-card.tsx, awards-menu.tsx, sun-kudos-promo-block.tsx}`
- `src/features/community-standards/{community-rules-content.ts, community-rule-list.tsx}`
- `public/images/awards/*`, `public/images/home/*` (exported from Figma)
- `src/i18n/dictionaries/{vi,en}/{home,awards,standards}.json`
- Tests: `src/features/awards/award-catalog.test.ts`, `src/features/home/ceremony-countdown.test.tsx`, `e2e/homepage-and-awards.spec.ts`
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
- [ ] Award catalog + test
- [ ] Cards + promo
- [ ] Homepage + ceremony countdown + fallback
- [ ] Awards page menu/anchors/scroll-spy
- [ ] Community standards content
- [ ] Artwork + 1280 px check
- [ ] Tests

## Success Criteria (test plan)
- Vitest: catalog order/values (SC-001, SC-002); CeremonyCountdown stops at 00, no navigation call (SC-008 unit part).
- Playwright: SC-003, SC-004, SC-006 (unauth → Login), SC-005/SC-007 (`live`), SC-008 (`after-ceremony` + few-seconds-ahead), SC-009 refocus, SC-010 (no event row / stalled API), SC-011 (1280 px / narrower).
- Manual daily check: Homepage SAA and Hệ thống giải against Figma.

## Scope Contract
- Changed: three pages, home/awards/standards features, assets, dictionaries.
- Impacted: `/` route (scaffold removed); shell nav active state.
- Will verify: Vitest for static data + countdown mode, Playwright for anchors/scroll/temporal seeds.
- Deliberately skipped: Go events (unchanged), shared countdown math (P4 tests own it).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Copy drift from Figma (RISK-01) | M | M | Transcribe verbatim; P14 review |
| Missing EN content | H | L | VN fallback per AD04; listed as open item |
| Artwork export quality/size | M | L | next/image with fixed sizes |

## Security Considerations
- Pages require sign-in (FR-601) via proxy. Static content only; no user data.

## Rollback
- Revert commits; restore scaffold `src/app/page.tsx` if needed.

## Next Steps
- Open items: English versions of award/about/community copy (not supplied; VN fallback); Figma artwork export; exact award descriptions read from Figma.
