# Verify: Admin Action - Spam (F011, tracker row 64, `docs/figma-refs/admin/admin-action-spam.png`)

**Verdict: PASS.** The confirm asks once, cancel changes nothing, confirm hides the kudo and warns the author once. A stale decision from a second admin tab refreshes the row with the notice.

Setup: 1440×1024, VN, admin, `live` seed. Standalone Chromium, plus a real two-tab run.

## Evidence

- Confirm, element capture (the dialog falls outside the row box, so it is clipped): `evidence/screens/admin-action-spam/row64-action-spam-confirm.png`
- Confirm, viewport capture: `evidence/screens/admin-action-spam/row64-action-spam-confirm-viewport.png`
- Stale decision, tab A after the 409: `evidence/screens/admin-action-spam/row64-stale-decision-tab-a.png`
- Reference: `docs/figma-refs/admin/admin-action-spam.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, tests 4 and 5 (ok)
- Raw results: `evidence/screens/e2e/p12-flows-a-results.json`, `p12-flows-b-results.json`

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-301 Spam action on a Public row | PASS | e2e 4; live: confirm then `spam|1|<admin email>` |
| FR-303 confirm before Spam | PASS | live: dialog "Tác giả sẽ nhận được thông báo. Đánh dấu kudos này là Spam?" with Hủy / Đánh dấu Spam |
| FR-304 hidden from board after Spam | PASS | live: spam kudo absent from An's board, public kudo present; e2e 4 (feed API) |
| FR-305 failed save keeps the row | PASS | e2e 5: 500 gives "Không lưu được thay đổi. Vui lòng thử lại.", pill stays Public |
| FR-603 version carried in the request | PASS | e2e 4: `data-version` 1 after Spam |
| BR-002 one decision per kudo | PASS | e2e 4 |
| BR-003 Spam is a confirmed action | PASS | live: Hủy leaves `public|0|` (no change, no notice) |
| SC-003 Spam sends exactly one warning | PASS | e2e 4: `kudo_spam_warning` count = 1 |
| SC-004 and SC-005 | PASS | e2e 4 (the feed and notice oracles) |
| SC-009 stale decision | PASS | live two-tab run (below) |
| SC-011 | PASS | e2e 4 |
| DEC-001 one action per row | PASS | live: Public row shows only "Đánh dấu Spam" |

### Two-tab stale decision (live, real two tabs, same admin)

1. Tab A and tab B both load `/admin/review`. The kudo `eee87ee8` shows Public in both.
2. Tab B confirms Spam. Its pill becomes Spam.
3. Tab A still shows Public and sends Spam with version 0. The server answers 409.
4. Tab A shows "Kudos này vừa được một admin khác thay đổi." The row refreshes to Spam with "Bỏ Spam".

Result: PASS. The 409 appears in the browser console as a resource error. That is the expected refusal, not a fault.

## Visual diff (`admin-action-spam.png` vs `row64-action-spam-confirm-viewport.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Warning icon with label | "Mark Spam", warning icon, boxed | "Đánh dấu Spam", warning icon, boxed | OK (vi copy, accepted) |
| Confirm dialog | not in the frame | inline card with Hủy and Đánh dấu Spam | Accepted: D003 |
| Confirm copy | spec E17 "The author will be notified. Mark as Spam?" | "Tác giả sẽ nhận được thông báo. Đánh dấu kudos này là Spam?" | Accepted: vi copy of the same meaning |

## Accepted deviations

- Confirm dialog and vi copy: accepted as above.

## Console, network, logs

- The 409 from the stale run and the 409 from the edit refusal are the only error-level console entries. Both are expected refusals.
- No 5xx. API log: no new ERROR lines.

## Fix list

None.

## Round 2 sanity (2026-11-29)

**Final verdict: PASS (unchanged).** E2E tests 5 and 6 (decision, stale decision and failed save) green in the round-2 run. Live confirm dialog text and buttons unchanged (`evidence/screens/admin-action-spam/r2-row64-action-spam-confirm.png`). The two-tab stale check from round 1 stands; it was not repeated in round 2.
