# Phase 08 — Hearts, hero badges, secret box (F008)

## Context Links
- F008: `spec/hearts-hero-badges-and-secret-box/{functional-spec.md, technical-spec.md}`; screens `SCR-hero-badge-and-campaign-hover`, `SCR-rules-panel`, `SCR-secret-box-modal`
- Contract: R09–R12; Addendum N10, N12. Decisions: G06–G09, G12, G14, AD08, X02, X04, X07, C02, C04
- Figma: Hover campaign `3241:15021`; heart control on cards / View Kudo; Thể lệ panel, Secret Box, hero badge hovers (SCREENFLOW)
- Built on P2: `backend/internal/gamification/*` (heart, campaign lookup, box grant, open); P7 slots

## Overview
- Priority: P2 (Like Kudos part treated as P1 per Codex). Status: pending. Effort: 10h.
- Checklist: **Like Kudos** (heart + x2 campaign badge); outside categories: hero badges, rules panel, Secret Box.
- Add the remaining reads (active campaign, secret-box summary, latest recipients, tier read) and all F008 UI:
  HeartButton (optimistic), HeroBadge + hover, CampaignBadge + hover, RulesPanel (FAB), SecretBoxModal (idempotent retry).

## Key Insights
- Heart is an idempotent setter: PUT/DELETE; sender 403, spam 409; recipient allowed (G06, G07).
- Failed `GET /campaigns/active` only hides the badge; failed lookup inside heart tx → 500, control reverts (R09).
- Modal holds one `Idempotency-Key` per opening intent and reuses it on Retry (R12); replay = stored `open_result` (N12).
- Boxes accrue to the **sender** via high-water mark; do not "fix" toward profile "hearts received" metric (contract note).
- No hero badge in the profile header (N10, F007 D006). Rules-panel copy kept verbatim from design.

## Requirements
- FR-001–FR-003, FR-101–FR-103, FR-201–FR-207, FR-401–FR-409, FR-601–FR-604, BR-001–BR-010, ALG-001–ALG-004, INT-001, US001–US009; SC-001–SC-014 (backend SCs proven in P2 re-run here; SC-008 with P7 Highlight).

## Architecture
```
KudoCard.HeartSlot → HeartButton (optimistic) → PUT|DELETE /kudos/{id}/heart → {total, viewerHearted}
KudoCard.HeroBadgeSlot → HeroBadge(tier from DTO) + hover (thresholds from gamification-config)
CampaignBadge ← GET /campaigns/active (error → hidden)
FAB "Thể lệ" → shell-actions.openRules() → RulesPanel (static)
BoardSidebar box button / profile button → SecretBoxModal ← GET /me/secret-boxes ; open → POST …/open (Idempotency-Key)
BoardSidebar latest recipients ← SecretBoxService.LatestRecipients (via /kudos/sidebar)
```

## Related Code Files
Create (backend)
- `backend/internal/gamification/{active_campaign_handler.go, secret_box_summary_handler.go, latest_gift_recipients.go, hero_tier_reader.go}`
- `backend/cmd/api/wire_gamification_reads.go`
Modify: `backend/internal/gamification/secret_box_service.go` (summary read), `backend/db/queries/gamification.sql`, `backend/internal/kudo/kudo_read_service.go` (heroTier + sidebar recipients via F008 services)
Create (frontend)
- `src/features/gamification/{heart-button.tsx, hero-badge.tsx, hero-badge-hover.tsx, campaign-badge.tsx, rules-panel.tsx, secret-box-modal.tsx, use-open-secret-box.ts, gamification-config.ts, gamification-api.ts}`
- `src/i18n/dictionaries/{vi,en}/gamification.json`
- Tests: `src/features/gamification/use-open-secret-box.test.ts` (key reuse on retry), `src/features/gamification/heart-button.test.tsx` (revert on 500), `e2e/like-kudos-and-secret-box.spec.ts`
Modify: `src/features/kudos-board/{heart-slot.tsx, hero-badge-slot.tsx, board-sidebar.tsx}`, `src/app/(shell)/layout.tsx` (mount RulesPanel), `src/components/shell/shell-actions-context.tsx` (register rules)

## Implementation Steps
1. Active campaign endpoint (highest multiplier, none vs error distinct).
2. Secret-box summary `{unopened, opened, distinctIcons}`; latest gift recipients; tier read `TiersFor` for DTO heroTier.
3. HeartButton optimistic + revert, disabled for sender (`viewerCanHeart`), campaign-aware total.
4. HeroBadge + hover; CampaignBadge + hover (Figma `3241:15021`).
5. RulesPanel static (copy verbatim) via FAB.
6. SecretBoxModal states unopened/opening/revealed/empty; idempotency key per intent; retry reuses key.
7. Fill P7 slots + sidebar; tests.

## Todo List
- [ ] Active campaign endpoint
- [ ] Summary + recipients + tier read
- [ ] HeartButton
- [ ] Hero + campaign badges
- [ ] Rules panel
- [ ] Secret box modal
- [ ] Slot wiring + tests

## Success Criteria (test plan)
- Go integration: re-run P2 F008 SC-001–SC-014; new: active campaign none/error; summary + C02/C04 shapes; SC-008 Highlight with zero-heart fill.
- Vitest: retry reuses Idempotency-Key; HeartButton reverts on 500/409.
- Playwright (`live` seed + seeded x2 campaign): recipient hearts → total +2; sender sees disabled heart; withdraw → total back; x2 badge hover; open box → icon revealed; network-drop retry → same result.
- Daily check: Like Kudos category.

## Scope Contract
- Changed: gamification reads, F008 UI, P7 slot files, shell rules mount.
- Impacted: board/detail cards, sidebar, profile (P9 reuses modal + summary).
- Will verify: Go integration (mutations, idempotency, concurrency = safety-critical data mutations → full F008 suite), Vitest for client retry logic, Playwright for heart/box UX.
- Deliberately skipped: campaign CRUD (P13).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Totals disagree across surfaces (RISK-02) | L | M | Single `kudo_heart_state` read |
| Heart-swapping rings (RISK-01) | M | L | Accepted (D017) |
| Optimistic UI drift under errors | M | L | Reconcile with server response total |

## Security Considerations
- Sender check server-side; idempotency key scoped to caller (lookup by user + key); no box data for others.

## Rollback
- Revert UI commits → slots show placeholders; backend reads are additive.

## Next Steps
- Unblocks P9, P11. Open items: rules-panel title "Thể lệ" (wording to confirm); heart error copy "Could not save your heart…" (to confirm).
