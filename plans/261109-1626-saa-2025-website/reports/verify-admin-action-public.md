# Verify: Admin Action - Public (F011, tracker row 65, `docs/figma-refs/admin/admin-action-public.png`)

**Verdict: PASS.** A spam kudo returns to Public with one click, no confirmation, and the version moves on.

Setup: 1440×1024, VN, admin, `live` seed, standalone Chromium.

## Evidence

- Row element with "Bỏ Spam" and the Spam pill: `evidence/screens/admin-action-public/row65-action-public-row.png`
- Reference: `docs/figma-refs/admin/admin-action-public.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 4 (ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-302 Public action on a Spam row | PASS | e2e 4: pill becomes Public, `public|4|<admin email>` after the stale retry and fresh Spam |
| FR-304 back on the board after Public | PASS (API) | e2e 4: `feedHas` true after Public. Not checked in the board UI (see concerns) |
| FR-305 failed save keeps the row | PASS | e2e 5 |
| FR-603 version carried | PASS | e2e 4 (version 2, 3, 4 across the run) |
| BR-002 | PASS | e2e 4 |
| BR-008 Public sends no warning | PASS | e2e 4: no new `kudo_spam_warning` after Public (count stays 1) |
| SC-006 | PASS | e2e 4 |
| SC-009 | PASS | e2e 4 |
| SC-010 | PASS | e2e 4 |
| DEC-001 only the decision that changes status | PASS | live: a Spam row shows only "Bỏ Spam" |
| D003 no confirmation for Public | PASS | e2e 4 (Un Spam with no dialog) |

## Visual diff (`admin-action-public.png` vs `row65-action-public-row.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Button with history icon, dark fill | "Un Spam", icon, dark | "Bỏ Spam", history icon, dark | OK (vi copy, accepted) |
| Spam pill | outlined yellow | outlined yellow | OK |

## Accepted deviations

- vi copy "Bỏ Spam" in place of "Un Spam": accepted (vi dictionary; "Spam" kept English per the brief).

## Console, network, logs

- No new console or network errors on this flow beyond the expected stale 409 (see the Spam report).

## Fix list

None. Concern: the board re-appearance after Public was proven through the feed API, not the board UI. Confirm once on the board if a UI proof is required.
