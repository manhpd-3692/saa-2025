# Verify: Hover New Hero badge (F008, tracker row 32, `docs/figma-refs/user/hover-badge-new-hero.png`)

**Verdict: PASS.**

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos/d4d1ae88-9a95-4a20-9f39-b1696b914e89` (receiver with 4 distinct senders), VN, sunner01.demo, `live` seed. Standalone headless Chromium.

## Evidence

- Hover capture: `plans/261109-1626-saa-2025-website/evidence/screens/hover-badge-new-hero/viewport.png`
- Reference: `docs/figma-refs/user/hover-badge-new-hero.png`
- Read values: `evidence/p8-capture-results.json` (S3 New)
- E2E: test 5 "hero badges follow distinct senders and each tier's hover tells its range" (runs 1 and 2, ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 hover shows tier name and how many senders | PASS | `data-tier="New"`; hover text "Có 1–4 người gửi Kudos cho bạn" |
| FR-002 tier from distinct senders (4 → New) | PASS | Database: 4 distinct senders |
| BR-005 New 1–4 | PASS | Same as above |
| Accessible name of the badge image | PASS | e2e test 5: "Huy hiệu New Hero" |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| "New Hero" pill art (gold rim, dark green) | as frame | same | OK (artwork cropped, deviation 5) |
| Range line, bold, white | "Có 1–4 người gửi Kudos cho bạn" | same | OK |
| Description, grey | "Hành trình lan tỏa điều tốt đẹp bắt đầu – những lời cảm ơn và ghi nhận đầu tiên đã tìm đến bạn." | same | OK |
| Popover box, dark with gold outline | as frame | same | OK |

Note: the Figma frame shows the badge alone. The app shows a popover near the badge on a kudo card. Position is not in the frame, so it is not compared.

## Fix list

None.
