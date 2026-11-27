# Verify: fab-open (floating button opened)

**Verdict: FAIL (minor)**. Placement now matches the reference. One item is 9 px narrower than the reference: "Thể lệ" is 140 px against 149 px.

## Round 1 re-check

Opened in Vietnamese (`saa_locale=vi`) on `localhost:3000`, so the labels match the reference. `innerWidth` 2880, DPR 0.5 at the time of capture (the browser zoomed `localhost`; see environment note). Fixed-position rects are CSS px and zoom-invariant, so the margins below are valid. The element capture is not frame-comparable. Reference: docs/figma-refs/user/fab-open.png.

| Element | Expected (reference) | Actual (round 1, CSS px) | Result |
|---|---|---|---|
| Stack right margin | ≈138 | 138 | PASS |
| Close circle | 56 px red circle, right 1246–1302, bottom 848–904 | 56 × 56, `rgb(212,39,29)`, margin right 138 / bottom 120 | PASS |
| "Viết KUDOS" | ≈214 × 64, bottom ≈196 | 213 × 64, bottom margin 196 | PASS (1 px) |
| "Thể lệ" | ≈149 × 64, bottom ≈280 | 140 × 64, bottom margin 280 | **Discrepancy** (9 px narrower; text width ≈76 px matches, right padding differs) |
| Gaps between items | 20 px | 20 px both gaps | PASS |
| Labels | Thể lệ / Viết KUDOS | Thể lệ / Viết KUDOS (VN) | PASS |

Round 0 defect (stack anchored at right 20 / bottom 96) is fixed.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-104 opens two choices: rules and write a kudo | PASS | Two items plus the red close button; closes via the same button |
| F008 FR-101 / FR-103 rules panel from "Thể lệ" | DEFERRED (P8) | Panel not built yet |
| F005 FR-101 write window from "Viết KUDOS" | DEFERRED (P6) | Modal not built yet |

## Decision needed

- "Thể lệ" width: correct the item to 149 px (right padding) or accept 140 px. Not resolved here.

## Error check

- Console: HMR websocket refusals only on `[::1]`, dev-only. Nothing from the menu on `localhost`.
- Network: no 4xx/5xx from the menu.
- Logs: no new ERROR lines.

## Evidence

- `evidence/screens/fab-open/actual-open-r1.png`: open stack element capture, VN, `localhost`.

## Round 2 re-check

**Verdict: PASS.** "Thể lệ" is now 148.7 × 64 px (round 1: 140 px). The 9 px discrepancy is closed, and every other value still matches.

Method: `localhost:3000`, Sunner session (`playwright/.auth/user.json`), `saa_locale=vi`. `localhost` is zoomed to 50 % (`innerWidth` 2880, DPR 0.5). Element widths and right/bottom margins are CSS px, which browser zoom does not change, so they are valid. The screenshot is a zoomed viewport.

| Element | Expected (reference) | Actual (round 2, CSS px) | Result |
|---|---|---|---|
| Stack right margin | ≈138 | 138 | PASS |
| Close circle | 56 × 56, red, bottom 120 | 56 × 56, rgb(212,39,29), bottom 120 | PASS |
| "Viết KUDOS" | ≈214 × 64, bottom ≈196 | 213.2 × 64, bottom 196 | PASS (≤1 px) |
| "Thể lệ" | ≈149 × 64, bottom ≈280 | 148.7 × 64, bottom 280 | PASS (round 1 FAIL, fixed) |
| Gaps | 20 | 20 and 20 | PASS |

Visual: the capture and `docs/figma-refs/user/fab-open.png` share order, right alignment, gaps and labels.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-104 opens two choices: rules and write a kudo | PASS | Two items plus the red close button |
| F008 FR-101 / FR-103 rules panel | DEFERRED (P8) | Panel not built yet |
| F005 FR-101 write window | DEFERRED (P6) | Modal not built yet |

## Error check

- Console: 0 errors, 0 warnings on `/` while open.
- Network: no 4xx/5xx from the menu.

## Evidence

- `evidence/screens/fab-open/actual-open-r2.png`: open stack, VN, `localhost`, zoomed viewport.
