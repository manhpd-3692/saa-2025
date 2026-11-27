# Verify: error-404 (unknown URL)

**Verdict: PASS** for behaviour and copy. Visual: one open minor item (title about 5 px high). Chrome is a controller-accepted decision.

## Round 1 re-check

Sunner session, `[::1]:3000/some-unknown-url`, true 1440×1024 viewport, DPR 1, EN. Reference: docs/figma-refs/user/error-404.png.

| Element | Expected (reference) | Actual (round 1) | Result |
|---|---|---|---|
| Body text | line 1 ≈441–998 "…doesn't exist", line 2 ≈583–855 | line 1 x 441–999, breaks after "exist"; line 2 x 584–856 | PASS |
| 404 artwork | x 368–1032, y 255–555 | x 368–1032, y ≈253–555 | PASS (≤2 px) |
| Title "NOT FOUND" | ink x 537–900, centre y ≈160 | 56 px bold, ink x ≈540–900, centre y ≈155 | **Discrepancy** (≈5 px high, same as 403) |
| Header bar, footer, "Back to Homepage" | none in reference | present | Accepted (controller decision, as 403) |

Round 0 wrap defect (≈438 px) is fixed.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-402 unknown address shows "page not found" with a way back | PASS | HTTP 404, "NOT FOUND", "Back to Homepage" |
| F001 SC-005 unknown URL: 404, localized, minimal chrome | PASS (copy and frame accepted) | EN copy checked this round. VN copy checked in round 0, not re-run |
| F001 FR-402 page in active language | PASS | Follows `saa_locale` |
| F006 FR-405 not-found for a made-up kudo id | NOT IN THIS SCREEN | Phase 6 |
| e2e "an unknown URL shows the localized 404 page in the minimal chrome (SC-005, FR-402)" | PASS | `npm run test:e2e` round 1, test 5 |

## Decision needed

- Title offset ≈5 px (same as error-403).

## Error check

- Console: the one document 404 is expected. HMR websocket refusals on `[::1]` only (dev-only).
- Network: 404 on the document only. No other 4xx/5xx.
- Logs: web.log `GET /some-unknown-url 404 in 89 ms`, expected. No new ERROR. api.log unchanged.

## Evidence

- `evidence/screens/error-404/actual-1440-en-r1.png`: true 1440×1024, EN.

## Round 2 re-check

**Verdict: PASS** for behaviour and copy. Visual: the round 1 title offset is fixed (vertical ink now exact). One residual is listed for explicit acceptance: the title is 5 px narrower than the reference. Chrome stays as controller-accepted.

Method: `[::1]:3000/some-unknown-url`, Sunner session, true 1440 × 1024 viewport, DPR 1, EN. WSL probe before the attempt: exit 0, 403 ms (after one failed 30 s probe, not counted).

| Check | Expected | Actual (round 2) | Result |
|---|---|---|---|
| HTTP status | 404 | 404 Not Found | PASS |
| Title | "NOT FOUND", 56 px bold | "NOT FOUND", 56 px, 700 | PASS |
| Way back | "Back to Homepage" to `/` | href `/`, 228.9 × 56 at y 831 | PASS |
| Locale | EN (no saa_locale cookie on [::1]) | EN | PASS |

## Visual (pixel ink, same white-text threshold as the reference)

| Element | Reference (1438 × 917 frame) | Actual (1440 × 1024) | Result |
|---|---|---|---|
| Title ink, vertical | y 140–179 | y 140–179 | PASS (exact). Round 1 was about 5 px high: fixed |
| Title ink, width | 358 px (x 541–898) | 353 px (x 545–897) | Residual: 5 px narrower (about 1.4 %), centre within 1.5 px. Needs explicit acceptance |
| 404 artwork, body copy | as round 1 | not re-measured this round (no change in the diff) | Round 1 values stand |

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-402 unknown address shows "page not found" with a way back | PASS | HTTP 404, "NOT FOUND", "Back to Homepage" |
| F001 SC-005 unknown URL: 404, localized, minimal chrome | PASS | EN copy checked this round. VN copy checked in round 0 only |
| F001 FR-402 page follows the active language | PASS (round 1) | Not re-run this round |
| F006 FR-405 not-found for a made-up kudo id | NOT IN THIS SCREEN | Phase 6 |

## Error check

- Console: 1 error, the expected document 404 (`Failed to load resource: 404 @ /some-unknown-url`). No other error.
- Network: 404 on the document only.
- Logs: see verify-phase-03-checks.md (round 2 log delta).

## Evidence

- `evidence/screens/error-404/actual-1440-en-r2.png`: true 1440 × 1024, EN.

## Decision needed

- Title width: 5 px narrower than the reference (about 1.4 %). Accept, or adjust letter-spacing. Same decision as error-403.
