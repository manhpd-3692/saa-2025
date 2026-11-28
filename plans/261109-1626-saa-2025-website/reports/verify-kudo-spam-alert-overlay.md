# Verify: KUDO spam alert overlay (F011, tracker row 71, `docs/figma-refs/user/kudo-spam-alert-overlay.png`)

**Verdict: FAIL (low).** The overlay shows for the author, re-shows on every open while the kudo is Spam, links to the standards, and has the English copy. It does not close on Escape, focus does not move into it, and its container role is `alert` rather than `alertdialog`. Those three are in the screen spec (SCR-kudo-spam-alert §4 and §9).

Setup: 1440×1024, An (sunner01, author) on `/kudos/f44ad018-…` (Spam). Standalone Chromium.

## Evidence

- Overlay, VN: `evidence/screens/kudo-spam-alert-overlay/row71-alert-overlay.png`
- Overlay, EN: `evidence/screens/kudo-spam-alert-overlay/row71-alert-overlay-en.png`
- Reference: `docs/figma-refs/user/kudo-spam-alert-overlay.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 6 (ok). The e2e closes with the ×, not Escape
- Raw results: `evidence/screens/e2e/p12-flows-a-results.json`
- Escape recheck: standalone, focus inside the card first (`overlayAfterEscapeWithFocusInCard` = 1)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-401 overlay for the author of a Spam kudo | PASS | live: `spam-alert-overlay` visible for An; e2e 6 |
| FR-402 hidden line and close (×) | PASS | live: "Kudos này đã bị ẩn vì vi phạm tiêu chuẩn cộng đồng."; × closes it (`overlayAfterClose` 0) |
| BR-006 not shown to the admin | PASS | live: admin `spam-alert-overlay` count 0 |
| SC-008 | PASS | e2e 6 |
| Re-shows each open while Spam (D005) | PASS | live: after close and reload, count 1 again |
| Link to community standards | PASS | live: `href="/community-standards"`; e2e 6 |
| Close with Escape (SCR §4, E05) | FAIL | live: count stays 1 after Escape (with and without focus in the card). Source `src/features/moderation/spam-alert-overlay.tsx` has no Escape handler |
| Focus moves into the alert on open and returns on close (SCR §9) | FAIL | live: focus not inside the overlay on open (`focusInCard` false). No focus code in the component |
| Dialog role (SCR §9 "alert dialog with heading as its label") | FAIL | markup uses `role="alert"`; no `aria-labelledby` to the heading |
| Copy follows the chosen language | PASS | live EN: "Warning: this kudo breaks the community standards / This kudo was hidden for breaking the community standards." |

## Visual diff (`kudo-spam-alert-overlay.png` vs `row71-alert-overlay.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Dimmed, blurred kudo behind | blurred card | blurred card | OK |
| Warning triangle | large grey, centred | large grey, centred | OK |
| Heading "Cảnh báo vi phạm / tiêu chuẩn cộng đồng" | white bold | white bold | OK |
| Card size | taller, card fills frame | smaller card (680×490), close × top right | Accepted: a modal card; the frame is a cropped detail |
| Body line | not in frame | "Kudos này đã bị ẩn vì vi phạm tiêu chuẩn cộng đồng." | Accepted: FR-402 hidden line (per the brief) |
| Close | none in frame | × top right | Accepted: FR-402 and the brief |

## Accepted deviations

- Body "hidden" line and × close: accepted under FR-402 (the brief lists both).
- Card size: accepted; the frame is a crop of the detail page.

## Console, network, logs

- No console errors on the overlay. The 409 seen on the same run came from the edit refusal, not the overlay.
- No 5xx. API log: no new ERROR lines.

## Fix list

1. `src/features/moderation/spam-alert-overlay.tsx`: add an Escape handler that calls the same close action as the × (keydown on the overlay root or on `document` while open). Re-check: with focus anywhere on the page, Escape must remove `spam-alert-overlay`. The recheck script is `scratchpad/p12-overlay-escape.cjs`; expected `afterEscapeWithFocusInCard` 0.
2. Same file: on open, move focus into the alert (the × or the heading), keep Tab inside it while open, and return focus to the page element that was focused before, on close (SCR §9).
3. Same file: change the container from `role="alert"` to `role="alertdialog"` and set `aria-labelledby` to the heading id (SCR §9). Keep the text announced on open.
4. Add a Playwright check for Escape to the admin-kudo-moderation spec owner (the e2e owner is the tester; add it when the spec next changes).

## Round 2 (fix round 1 re-verify, 2026-11-29)

**Final verdict: PASS.** All three round-1 FAILs are resolved.

| Round-1 FAIL | Round 2 result | Evidence |
|---|---|---|
| Escape does not close | PASS. Standalone `p12-overlay-escape.cjs`: before 1, focus inside the card true, after Escape 0 | scratchpad output |
| Focus does not move in on open | PASS. Focus starts on "Đóng cảnh báo" (inside the alert). Tab trapped (round-1 fix, not re-timed) | `p12-r2-overlay-aria.cjs`: `focusInside` true, `focusedLabel` "Đóng cảnh báo" |
| Role `alert` without name | PASS. `role="alertdialog"`, `aria-labelledby` the heading (accessible name "Cảnh báo vi phạm tiêu chuẩn cộng đồng"), `aria-describedby` the detail | `p12-r2-overlay-aria.cjs` |

- Visual vs the frame `docs/figma-refs/user/kudo-spam-alert-overlay.png`: unchanged from round 1 (blurred card, warning triangle, heading, body line, × close). The × now has a ring when focused. Accepted.
- Screenshot: `evidence/screens/kudo-spam-alert-overlay/r2-row71-alert-overlay.png`.
- Live checks unchanged from round 1: reshows after reload (count 1), not shown to the admin, standards link to `/community-standards`.
- Not re-captured in round 2: the English overlay (round-1 EN copy was correct; no change to copy in the fix).
- Gap: the e2e spec (test 7) closes with ×, not Escape or focus. The Escape and focus behaviour is verified only by these standalone checks. Recommended: add an Escape and focus assertion to the spec owner's next change.
