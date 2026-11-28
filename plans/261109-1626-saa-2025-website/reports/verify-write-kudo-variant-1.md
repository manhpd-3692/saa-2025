# Verify: Gửi lời chúc Kudos, variant 1 (F005, tracker row 14, `/` + FAB "Viết KUDOS", filled state)

**Final verdict (round 2): PASS.** Round 1 was FAIL on M1, now fixed. All behaviour ACs pass in the filled state (recipient, text, 4 hashtags, 5 images, anonymous ticked). Round 1 defect (fixed in round 2): the Image button wrapped beside five thumbnails (same root cause as row 13, M1).

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed, sender sunner01.demo, recipient Trần Thị Bình (CECV1). Method: headless Chromium via a standalone Playwright script (MCP profile locked by another session).

## Round 2 (2026-11-28, after fix round 1)

Re-run: `compose-states-check.cjs` (variant-1 items). Screenshot `r2-vn-1440-variant-1.png`. Pending uploads cleared before and after the run (10 cleared).

| Item | Round 1 | Round 2 |
|------|---------|---------|
| M1 Image button beside 5th thumb | FAIL | PASS. Button is on the thumbnail row at the right of the 5th thumb (same component measurement as row 13 round 2) |
| FR-201, FR-202, FR-203, FR-205, FR-207, BR-002, BR-004, SC-004 (filled state, title required, 1,000 accepted) | PASS | PASS (3/3 variant-1 items ok) |
| Nickname ẩn danh field | accepted, not in spec | unchanged. Still needs product confirmation |

Logs: `r2-states.log`. Console: only the deliberate 422 (fake image) from the same run. No new 5xx.

**Round 2 verdict: PASS.**

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| M1 | Layout (frame shows 5 thumbs inline) | `src/features/kudo-compose/image-attachment-grid.tsx` | Image button stays on the thumbnail row | At 5 thumbs the button wraps to y 902. Button 107 px, frame 98 px | Medium (visual, material) |

## Visual diff (`docs/figma-refs/user/write-kudo-form-variant-1.png` vs `evidence/screens/write-kudo-variant-1/vn-1440-variant-1.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Recipient, filled | "Dương Huỳnh Xuân Nhật B" | "Trần Thị Bình" (seed) | Data difference, not layout |
| Text | "Tôi rất chi là quý bạn" | identical; text bold (base style `font-bold`, same as frame) | OK |
| Counter | 0/1.000 in frame | 22/1.000 with 22 characters typed | OK (counter live) |
| Hashtag chips, 4 + "Hashtag" button | 4 chips, button wraps to row 2 | 4 chips, button on row 2 | OK |
| Image row, 5 thumbs | Image button beside 5th thumb | Image button on row 2 | FAIL (M1) |
| Anonymous checkbox | checked | checked | OK |
| "Nickname ẩn danh*" field | present in frame | not built | Accepted: no nickname requirement in spec (FR-207 is a checkbox only). Listed for product confirmation |
| Title "Danh hiệu" | empty in frame | empty; send blocked with "Hãy nhập danh hiệu cho Kudos." | OK |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-201 recipient chosen by search | PASS | "Trần Thị Bình" shown in combobox |
| FR-202 title required | PASS | empty title → "Hãy nhập danh hiệu cho Kudos."; window kept |
| FR-203 counter, toolbar | PASS | counter 22/1.000 for the filled text |
| FR-205 hashtags 1–5, add still enabled at 4 | PASS | 4 chips, "Hashtag" enabled |
| FR-207 anonymous checkbox | PASS | checked |
| BR-002 1–5 hashtags | PASS | 4 accepted |
| BR-004 text ≤1,000 | PASS | 1,000 typed → "1.000/1.000", no max message |
| SC-004 boundary | PASS | 1,000 accepted; 1,001 blocked (row 13 run); DB length 1000 (e2e) |

## Console, network, logs

- Console and network for this state: no new errors from this state (the 422 and 429 entries noted on row 13 came from other checks in the same run).
- Logs: no new ERROR or panic lines attributable to this state (see row 13).

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node compose-states-check.cjs` (second run) | 0 | variant-1 items: 3 passed (`results-states.json`) |

## Fix list

1. (M1) `src/features/kudo-compose/image-attachment-grid.tsx`: keep the Image add button on the thumbnail row at 5 images. Expected: button inline beside the 5th thumbnail (frame). Actual: 107 px button wraps to a second row. Fix as in row 13 M1. Re-check: variant-1 state at 1440 px.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-variant-1/vn-1440-variant-1.png`.
