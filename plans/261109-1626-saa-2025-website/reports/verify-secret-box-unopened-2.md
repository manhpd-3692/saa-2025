# Verify: Secret Box, unopened window with pointer on the box (F008, tracker row 37, `docs/figma-refs/user/secret-box-unopened-2.png`)

**Verdict: PASS.** Same ready state as row 36, captured with the pointer over the box. The Figma frame shows the same state.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed.

## Evidence

- Capture: `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-unopened-2/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-unopened-2.png`
- Read values: `evidence/p8-capture-results.json` (S4b): hovered, no state change

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-102 / FR-205 unopened window | PASS | Same as row 36 |
| BR-007 box opens only by its owner, once | PASS | Hover changes nothing; opening is covered in rows 38–39 |

## Visual diff

Same as row 36: title, hint, closed box, "05" footer. OK.

## Fix list

None.
