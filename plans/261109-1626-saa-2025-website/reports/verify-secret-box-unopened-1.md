# Verify: Secret Box, unopened window (F008, tracker row 36, `docs/figma-refs/user/secret-box-unopened-1.png`)

**Verdict: PASS.** The title, hint, closed-box art and unopened count match the Figma frame. The modal is about 10 px smaller in each direction (read from the screenshot, approximate).

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo (5 unopened, 3 opened in DB at capture), `live` seed. Standalone headless Chromium.

## Evidence

- Capture: `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-unopened-1/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-unopened-1.png`
- Read values: `evidence/p8-capture-results.json` (S4): phase `ready`, picture `closed-sparkle`, hint "Click vào box để mở", unopened "05", DB unopened 5, DB distinct icons 3
- E2E: test 7 "the window shows the unopened count" (runs 1 and 2, ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-205 title "KHÁM PHÁ SECRET BOX CỦA BẠN" | PASS | Visible in capture |
| FR-205 hint "Click vào box để mở" | PASS | `secret-box-hint` text |
| FR-205 unopened count | PASS | "05" equals DB 5 |
| FR-102 window opens from "Mở Secret Box" | PASS | Click on `open-secret-box` |
| BR-007 only the owner's boxes | PASS | Counts read for sunner01 only |
| Footer "Icon đã sưu tập n/6" | Not shown before opening | Accepted: FR-206 needs it after opening; deviation 4 |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Title, gold caps | as frame | same | OK |
| Hint, bold, centred | as frame | same | OK |
| Closed box on pedestal | as frame | same composition, cropped (deviation 5) | OK |
| Footer "Secretbox chưa mở 05" | as frame | same label and figure | OK |
| Modal size | ~650 × 823 | ~640 × 810 (approximate) | Minor, not material |

## Fix list

None required. Optional: align the modal size to the frame (about 10 px).
