# Verify: Hover Legend Hero badge (F008, tracker row 35, `docs/figma-refs/user/hover-badge-legend-hero.png`)

**Verdict: PASS.**

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos/7f936f32-68a0-4579-b27d-d0ed08a55f25` (receiver with 22 distinct senders), VN, sunner01.demo, `live` seed. Standalone headless Chromium.

## Evidence

- Hover capture: `plans/261109-1626-saa-2025-website/evidence/screens/hover-badge-legend-hero/viewport.png`
- Reference: `docs/figma-refs/user/hover-badge-legend-hero.png`
- Read values: `evidence/p8-capture-results.json` (S3 Legend): `data-tier="Legend"`, hover "Có hơn 20 người gửi Kudos cho bạn" plus the description
- E2E: test 5 (runs 1 and 2, ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 hover shows tier and range | PASS | "Có hơn 20 người gửi Kudos cho bạn" |
| BR-005 Legend more than 20 (D016) | PASS | 22 senders → Legend |
| FR-405 21 senders changes Super to Legend | PASS (boundary by rule) | Tier function `n > 20` |

## Visual diff (`hover-badge-legend-hero.png` vs `screens/hover-badge-legend-hero/viewport.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| "Legend Hero" pill, gold rim | as frame | same | OK (artwork cropped, deviation 5) |
| Range line "Có hơn 20 người gửi Kudos cho bạn" | as frame | same | OK |
| Description | "Bạn đã trở thành huyền thoại – người để lại dấu ấn khó quên trong tập thể bằng trái tim và hành động của mình." | same | OK |

## Fix list

None.
