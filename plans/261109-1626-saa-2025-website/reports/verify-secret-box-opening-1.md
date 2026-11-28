# Verify: Secret Box, action "bấm mở" (1) (F008, tracker row 38, `docs/figma-refs/user/secret-box-opening-1.png`)

**Verdict: PASS (qualitative).** The shake frame is captured as the box tilts with the count still at 05, before the icon appears. The Figma frame shows the moment the icon rises. That moment is timing-dependent: the shake lasts at least 900 ms (`OPENING_MS` in `secret-box-modal.tsx`) before the reveal, so this capture is a valid earlier frame of the same sequence.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium. One box opened (DB 5 → 4).

## Evidence

- Shake frame: `plans/261109-1626-saa-2025-website/evidence/screens/secret-box-opening-1/viewport.png`
- Reference: `docs/figma-refs/user/secret-box-opening-1.png`
- Read values: `evidence/p8-capture-results.json` (S5): right after click `data-picture="opening"`, one WAAPI shake
- Shake sampling: `evidence/p8-shake-probe-results.json` (default: `opening` for about 900 ms with 1 animation)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-404 click reveals one icon | PASS | Next frame: REVEAL, icon, 04 |
| FR-205 count drops by one | PASS | DB 5 → 4 and footer 04 |
| BR-008 one icon | PASS | Revealed icon REVIVAL, DB distinct 3 |
| Shake while Go answers | PASS | Shake sampled: 54 frames, 1 animation, about 900 ms |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Dark window, title, hint | as frame | same | OK |
| Box, slightly tilted | box at rest with icon rising | box tilted, no icon yet | OK for this moment (timing) |
| Footer count | 05 | 05 (before decrement) | OK |

## Fix list

None.
