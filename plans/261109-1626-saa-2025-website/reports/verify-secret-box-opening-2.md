# Verify: Secret Box, action "bấm mở" (2) (F008, tracker row 39, `docs/figma-refs/user/secret-box-opening-2.png`)

**Verdict: PASS.** The Figma frame is the closed-box ready state with "Click vào box để mở" and "Secretbox chưa mở 05". The implementation shows the same composition in its ready state, verified in row 36.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed.

## Evidence

- Ready state (the matching frame): `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-unopened-1/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-opening-2.png`
- Read values: `evidence/p8-capture-results.json` (S4): phase `ready`, picture `closed-sparkle`, "Click vào box để mở", unopened "05"

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-404 window in ready state before a click | PASS | Ready phase, closed box |
| FR-205 hint and count | PASS | "Click vào box để mở", "05" |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Closed box on pedestal | as frame | same, cropped (deviation 5) | OK |
| Footer "Secretbox chưa mở 05" | as frame | same | OK |

## Fix list

None.
