# Verify: error-403 (/admin as Sunner)

**Verdict: PASS** for behaviour (5/5 counted attempts, WSL healthy, showed Access Denied). Visual: one open minor item (title about 5 px high). Frame chrome is a controller-accepted decision.

## Round 1 re-check

Sunner session, `[::1]:3000/admin`, true 1440×1024 viewport, DPR 1, EN. Reference: docs/figma-refs/user/error-403.png.

### WSL gating (`wsl -e true`, timed from PowerShell, counted only if exit 0 and under 2 s)

| Attempt | Pre-probe | Result | Post-probe | Counted |
|---|---|---|---|---|
| 1 | exit 0, 358 ms | Access Denied | exit 0, 389 ms | yes |
| 2 | exit 0, 376 ms | Access Denied | exit 0, 359 ms | yes |
| 3 | exit 0, 427 ms | Access Denied | exit 0, 314 ms | yes |
| 4 | exit 0, 361 ms | Access Denied | exit 0, 355 ms | yes |
| 5 | exit 0, 347 ms | Access Denied | not taken (run ended) | yes |

No outage attempts were needed. Before this round, probes at about 17:39 returned exit 0 in 7.4 s, exit 0 in 0.5 s, then a 30.5 s `WSAETIMEDOUT` (exit -1). Those ran before any counted attempt and are recorded as environment only.

`web.log` for the five `/admin` requests: 119, 73, 63, 91, 54 ms (200). None hit the 5 s budget.

### Visual

| Element | Expected (reference) | Actual (round 1) | Result |
|---|---|---|---|
| Body text | 24 px bold; line 1 ≈441–998 "…doesn't exist", line 2 ≈583–855 | line 1 x 441–999 (558 px), breaks after "exist"; line 2 x 584–856 | PASS |
| Monitor artwork | x 508–936, y 260–690 | x ≈509–937, y ≈260–688 | PASS (≤2 px) |
| Title "Access Denied" | 56 px bold, ink x 502–935, centre y ≈160 | 56 px bold, ink x ≈505–933, centre y ≈155 | **Discrepancy** (≈5 px high, read by eye from the reference PNG) |
| Header bar (logo + EN) | none in reference | present | Accepted (controller: minimal chrome, gap-resolution-log C01, F001 DEC-002) |
| Footer copyright | none in reference | present | Accepted (same decision) |
| "Back to Homepage" button | none in reference | present | Accepted (F001 FR-402/403 need a way back) |

Round 0 wrap defect (≈438 px, broke after "for") is fixed.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-403 no-access page for a non-admin on an admin address | PASS | 5/5 Access Denied (EN) |
| F001 SC-005 rejected admin URL: Forbidden, localized, minimal chrome | PASS | Frame chrome accepted by controller decision |
| F002 FR-603 / SC-004 Sunner sees Forbidden on /admin | PASS | 5/5 counted attempts. Round 0 intermittent "Cannot reach the server" did not recur |
| F002 DEC-003 Forbidden, not Login | PASS | URL stays `/admin` on every attempt |
| e2e "a non-admin gets the localized Forbidden page … (SC-004)" | PASS | `npm run test:e2e` round 1, test 26 |

## Decision needed

- Title offset ≈5 px: correct it, or accept it as reading error of the reference PNG.

## Error check

- Console: HMR websocket refusals on `[::1]` only (dev-only, environment). No app error.
- Network: `/admin` 200; no 5xx on the page.
- Logs: web.log `GET /admin 200` at 54–119 ms. api.log unchanged at 286 bytes.

## Evidence

- `evidence/screens/error-403/actual-1440-en-r1.png`: attempt 5, true 1440×1024, EN, Access Denied.
- Round 0 images kept under `evidence/screens/error-403/`.

## Round 2 re-check

**Verdict: PASS** for behaviour (5/5 counted attempts, Access Denied). Visual: the round 1 title offset (about 5 px high) is fixed. One residual is listed for explicit acceptance: the title is 4 px narrower than the reference. The header bar, footer and "Back to Homepage" button stay as controller-accepted chrome.

Method: `[::1]:3000/admin`, Sunner session (`playwright/.auth/user.json`), true 1440 × 1024 viewport, DPR 1, EN.

### WSL gating (`wsl -e true`, counted only if exit 0 and under 2 s)

| Attempt | Pre-probe | Result | Counted |
|---|---|---|---|
| 1 | exit 0, 483 ms | Access Denied | yes |
| 2 | exit 0, 354 ms (second probe 350 ms) | Access Denied | yes |
| 3 | exit 0, 370 ms | Access Denied | yes |
| 4 | exit 0, 313 ms | Access Denied | yes |
| 5 | exit 0, 428 ms | Access Denied | yes |

Probes that failed with `WSAETIMEDOUT` after 30 s (exit 127) were recorded as environment only. They came in runs of up to 5 in a row, and no attempt was counted during an outage.

### Visual

Pixel measurement with the same white-text threshold on both images (the reference PNG is 1438 × 917, so only widths and bands are compared, not origins):

| Element | Reference | Actual (round 2, 1440 × 1024) | Result |
|---|---|---|---|
| Title ink, vertical | y 135–179 | y 136–179 | PASS (≤1 px). Round 1 was about 5 px high: fixed |
| Title ink, width | 430 px (x 502–931) | 426 px (x 505–930) | Residual: 4 px narrower (about 1 %), same font. Needs explicit acceptance |
| Monitor artwork | x 508–936, y 260–690 | same placement by visual read of both images | PASS (visual read, no pixel measure) |
| Body copy, 2 lines | line 1 ≈441–998, line 2 ≈583–855 | box 430–1010, 2 lines | PASS (visual read) |
| Header bar, footer, "Back to Homepage" | none in reference | present | Accepted (controller: minimal chrome, F001 DEC-002) |

Read-by-eye review of both images agrees: same title, artwork and body position.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-403 no-access page for a non-admin on an admin address | PASS | 5/5 Access Denied (EN) |
| F001 SC-005 rejected admin URL: Forbidden, localized, minimal chrome | PASS | Frame chrome accepted by controller decision |
| F002 FR-603 / SC-004 Sunner sees Forbidden on /admin | PASS | 5/5 counted attempts |
| F002 DEC-003 Forbidden, not Login | PASS | URL stays /admin on every attempt |

## Error check

- Console: no error reported on any /admin navigation this round.
- Network: /admin 200 on every counted attempt.
- Logs: see verify-phase-03-checks.md (round 2 log delta).

## Evidence

- `evidence/screens/error-403/actual-1440-en-r2.png`: attempt 5, true 1440 × 1024, EN, Access Denied.

## Decision needed

- Title width: 4 px narrower than the reference (about 1 %). Accept, or adjust letter-spacing.
