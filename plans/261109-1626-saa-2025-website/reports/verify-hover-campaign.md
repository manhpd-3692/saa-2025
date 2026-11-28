# Verify: Hover campaign x2 badge (F008, tracker row 30, `docs/figma-refs/user/hover-campaign.png`)

**Verdict: FAIL (minor).** The hover copy, multiplier and window match the Figma frame and the active campaign in the database. The badge sits in the wrong place against spec D013, which says it goes next to the heart control. It sits in the sidebar instead (deviation 2).

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed (x2 campaign running). Standalone headless Chromium (MCP profile locked, "Browser is already in use" on two tries).

## Evidence

- Hover capture: `plans/261109-1626-saa-2025-website/evidence/screens/hover-campaign/viewport.png`
- Read values: `evidence/p8-campaign-results.json` (step S1, ok)
- Reference: `docs/figma-refs/user/hover-campaign.png`
- E2E: `evidence/p8-e2e-run1.txt`, `evidence/p8-e2e-run2.txt` (test 4 "campaign badge … hover and focus", both runs ok)
- DB: `campaigns` x2, `starts_at` 2026-11-27 09:07:59 UTC, `ends_at` 2026-12-11 09:07:59 UTC (16:07 ICT on both ends)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-204 hover shows campaign name, multiplier, start and end | PASS | Name "Ngày x2 tim – lan tỏa gấp đôi yêu thương!", "x2", "Từ 16:07 ngày 27/11 đến 16:07 ngày 11/12, tất cả tim bạn nhận được đều được nhân đôi." |
| US004 AC1 hover shows name, multiplier and period | PASS | Same as FR-204 |
| US004 AC2 nothing shows when no campaign is active | NOT VERIFIED | Needs a seed with no campaign; not run in this pass |
| D013 badge next to the heart control while a campaign is active | FAIL | Badge only in sidebar beside "Số tim bạn nhận được:". Card heart shows no x2 (ALL KUDOS cards: "4 ♡") |
| FR-401/402/408 a heart during x2 adds 2 | PASS | e2e test 1 (both runs): total +2, stored `weight 2` with `campaign_id` |
| Keyboard: focus opens, Escape closes | PASS | e2e test 4 (both runs) |

## Visual diff (`hover-campaign.png` vs `screens/hover-campaign/viewport.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Flame badge with "x2" | flame, "x2" under the flame | same | OK |
| Title bold, gold-cream on dark | as frame | same | OK |
| Body copy | "Từ XX:XX ngày XX/12 …" placeholders | filled with real window | OK (placeholders are dynamic) |
| Panel size | 368 × ~142 | 368 × 142 | OK |
| Panel position | not specified in the frame | over the sidebar stats, right of the badge | Hover overlay, acceptable |

Observation, not in this row's scope: at 1440×1024 the FAB covers the "10 SUNNER NHẬN QUÀ MỚI NHẤT" heading on the same screen (F001 FAB over P7 sidebar).

## Deviation judgement

- Deviation 2 (badge only in the sidebar) is not accepted. Spec D013 names the heart control. Figma does not name a host (`3241:15021`), but the spec does, so the spec wins unless its owner changes D013.

## Fix list

1. Render `CampaignBadge` (`src/features/gamification/campaign-badge.tsx`) beside `HeartButton` on the kudo card in board and detail, while a campaign is active. Hover copy stays as is.
2. Or get written approval that D013 moves to the sidebar, then update the spec. Either way, re-capture this row.


---

## Round 2 (P8 fix round 1 re-verify)

**Final verdict: PASS.** Row 30 is no longer a placement FAIL. The badge now sits beside each card's heart, the sidebar badge is kept, and nothing renders when no campaign is active.

Run: standalone script `p8-round2.cjs` (scratchpad), viewport 1440×1024, VN, sunner01.demo, live seed with the x2 campaign (`956d528e-…`, ends 2026-12-11 09:45 UTC). Campaign `ends_at` was moved into the past for the no-campaign check and restored in `finally` (read back: running again).

| AC | Round 2 result | Evidence |
|----|----------------|----------|
| D013 badge next to the heart control while a campaign is active | PASS | 16 badges on the page: 15 cards each have a `heart-button` in the same card, plus the sidebar badge. Flame "x2" sits right of the heart count |
| Sidebar badge kept (round 1 placement) | PASS | `sidebarBadge: true` |
| FR-204 hover shows name, multiplier, window | PASS | Card hover popover: "Ngày x2 tim – lan tỏa gấp đôi yêu thương! / Từ 16:45 ngày 27/11 đến 16:45 ngày 11/12, tất cả tim bạn nhận được đều được nhân đôi." |
| US004 AC2 nothing shows when no campaign is active | PASS | With the campaign ended: `campaign-badge` 0, `campaign-hover` 0, sidebar "Số tim bạn nhận được" row still shown. Campaign restored afterwards |
| Overlay vs Figma `hover-campaign.png` | PASS | Popover copy and layout match the frame. It overlays the card body while hovered, which is expected for a hover overlay |

Screenshots: `plans/261109-1626-saa-2025-website/evidence/screens/r2-campaign-card.png`, `r2-campaign-card-hover.png`, `r2-campaign-sidebar-hover.png`, `r2-no-campaign.png`.

Note: the Figma frame does not show the card-level badge, so its size and position beside the heart are judged by consistency with the heart row, not by a frame.

Fix list: none for row 30.
