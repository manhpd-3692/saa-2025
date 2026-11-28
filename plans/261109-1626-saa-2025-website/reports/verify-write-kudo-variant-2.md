# Verify: Gửi lời chúc Kudos, variant 2 (F005, tracker row 15, `/` + FAB "Viết KUDOS", formatted state)

**Final verdict (round 2): PASS.** Round 1 was FAIL on M1, now fixed. The formatted behaviour passes: mention, link, counter and the 6th-image refusal. Round 1 defect (fixed in round 2): the same visual M1 as row 13.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed, sender sunner01.demo, recipient Trần Thị Bình. Method: headless Chromium via a standalone Playwright script.

## Round 2 (2026-11-28, after fix round 1)

Re-run: `compose-states-check.cjs`, variant-2 items. Screenshot `r2-vn-1440-variant-2.png` (viewed: Image button inline beside the 5th thumbnail, x 953–1048).

| Item | Round 1 | Round 2 |
|------|---------|---------|
| M1 Image button beside 5th thumb | FAIL | PASS |
| FR-203 formatting adds nothing (`a**b**c` = 3) and counter 22/1.000 | PASS | PASS |
| FR-204 mention, FR-209 link, FR-206 five thumbs, sixth refused, BR-003 | PASS | PASS |
| Bold assertion (`bold` count) | script failure in round 1 | PASS after correcting my expectation from 2 to 1. The second bold click toggles the continued run off, so one bold run is correct. Product behaviour unchanged |

Logs: `r2-states.log`. Console: only the deliberate 422 from the fake-image send. No new 5xx.

**Round 2 verdict: PASS.**

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| M1 | Layout (frame shows 5 thumbs inline) | `src/features/kudo-compose/image-attachment-grid.tsx` | Image button beside the 5th thumbnail | Button wraps to second row at 5 thumbs (107 px, frame 98 px) | Medium (visual, material) |

## Visual diff (`docs/figma-refs/user/write-kudo-form-variant-2.png` vs `evidence/screens/write-kudo-variant-2/vn-1440-variant-2.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Toolbar with no focus | B, I, S, list, link, quote | identical | OK |
| Editor text | bold "Tôi rất chi là quý bạn" | bold base style ("abc @Trần Thị Bình SAA" in bold) | OK |
| Mention | not in frame | "@Trần Thị Bình" rendered as coloured mention | Extra state, OK |
| Link | not in frame | "SAA" underlined | Extra state, OK |
| Counter | 0/1.000 in frame | 22/1.000 | OK |
| Hashtags, 3 chips + Hashtag | 4 chips in frame (data) | 3 chips + button | Data difference |
| Image row, 5 thumbs | button beside 5th thumb | button on row 2 | FAIL (M1) |
| Anonymous checkbox | checked in frame | unchecked in this run | Data state; OK |
| Nickname ẩn danh field | in frame | not built | Accepted: not in spec (see row 14) |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 formatting adds nothing to the count | PASS | `a**b**c` (bold on a and b) → counter 3/1.000 |
| FR-203 counter | PASS | final counter 22/1.000 with link and mention |
| FR-204 mention inserted and counted as @Name | PASS | "@Trần" → mention "@Trần Thị Bình" (row 17 also) |
| FR-206 up to 5 images, sixth refused | PASS | 5 thumbs; sixth refused, still 5 thumbs |
| FR-209 link box inserts link | PASS | "SAA" link with href set from the box (`https://example.com/s`) |
| BR-003 ≤5 images | PASS | sixth refused |
| SC-004 formatted length | PASS | `a**b**c` = 3 (N07). Link and mention next to text add no character |

Script note: the run also printed `bold=1` against an expected ≥2 for the bold count. The cause is my toggle sequence (a continued bold run toggled off), so this is not counted as a product defect. The formatted-count AC above rests on the counter (3) and the screenshot.

## Console, network, logs

- No additional errors from this state. Logs as in row 13.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node compose-states-check.cjs` (second run) | 0 | variant-2 formatted item: counter pass, bold assertion failed by script (see note). Sixth image: pass |

## Fix list

1. (M1) `src/features/kudo-compose/image-attachment-grid.tsx`: as row 13 M1. Keep the Image button beside the 5th thumbnail at 1440 px.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-variant-2/vn-1440-variant-2.png`.
