# Verify: fab-closed (floating button on /)

**Verdict: PASS** (round 1 re-check). Placement fixed; the round 0 FAIL (margins off by ≈118 px right and ≈25 px bottom) no longer reproduces.

## Round 1 re-check

Measured at a true 1440×1024 viewport, `devicePixelRatio` 1, on `[::1]:3000/` (signed in as Sunner). Reference: docs/figma-refs/user/fab-closed.png.

| Element | Expected (reference, 1440 frame) | Actual (round 1, CSS px) | Result |
|---|---|---|---|
| Pill box | x 1191–1297, y 840–903 (≈106 × 63) | x 1191, y 840, 106 × 64 | PASS (1 px height, within reading tolerance of the PNG) |
| Right margin | ≈143 | 143 (`xl:mr-[5px]` on a 138 px stack anchor) | PASS |
| Bottom margin | ≈120 | 120 | PASS |
| Icons | pencil, "/", red sun mark | pencil svg 24×24, "/" span, sun-mark img 24×22 | PASS |
| Background, radius | cream, fully rounded | `rgb(255, 234, 158)`, full radius | PASS |

Round 0 numbers were right margin 20 and bottom 96; those are gone.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-104 floating button on full-frame pages | PASS | Pill present on `/`, signed-in Sunner |
| F008 FR-101 / F005 FR-101 wiring (open rules / write) | DEFERRED (P6 / P8) | Actions open panels built in later phases |

## Environment notes

- `localhost:3000` is zoomed by the browser (`innerWidth` 2880, DPR 0.5 or 0.75, changing between runs). Its CSS-px rects gave the same margins (138 / 120 stack, 143 / 120 pill). Not used for the framed capture.
- `[::1]:3000` is not hydrated under `next dev` (no React fibers, cross-origin dev block in web.log). It is used only for the server-rendered closed pill. Interactive checks ran on `localhost`.

## Error check

- Console: only Next dev HMR websocket refusals on the `[::1]` origin (dev-only, environment).
- Network: no 4xx/5xx from the button.
- Logs: no new ERROR lines (see phase checks report).

## Evidence

- `evidence/screens/fab-closed/actual-closed-r1.png`: closed state at true 1440×1024, DPR 1.
- Round 0 image kept as `evidence/screens/fab-closed/actual-closed.png`.
