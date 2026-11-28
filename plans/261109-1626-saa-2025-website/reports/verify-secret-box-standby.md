# Verify: Secret Box standby frames (F008, tracker rows 43–50, `docs/figma-refs/user/secret-box-standby-1..8.png`) and run-wide checks

**Verdict: PASS with accepted deviation 1 for rows 44–49.** Row 43 and row 50 match qualitatively. Rows 44–49 are prize frames (T-shirt, coaster, scarf, magnet, mug combo, mug). The spec has no prize data, so they render as the six-icon completion screen. Their AC codes in the tracker do not describe that screen (see notes). Run-wide checks below: e2e 10/10 in both runs, reduced motion has no shake, double click spends one box, retry is idempotent, rollback and sender rules hold. One API log line is at ERROR for a client abort, and it needs a fix.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked). Completion was reached by fixture: `resetBoxes`-style reset of sunner01 (5 distinct icons, 40 unopened, `icons_completed_at` cleared), then opened until ROOT_FURTHER (3 opens). Reseed `live` and `npm run e2e:session` run again at the end.

## Per-row verdict

| Row | Figma frame | Slug / evidence | Implemented state compared | Verdict | Note |
|-----|-------------|-----------------|----------------------------|---------|------|
| 43 | standby-1: TOUCH OF LIGHT rising, "05", window background | `evidence/screens/secret-box-standby-1/viewport.png` | Reveal after the last box: TOUCH OF LIGHT, footer 00, "Icon đã sưu tập 4/6" | PASS (qualitative) | Hint reads "Bạn không còn Secret Box nào để mở." because the last box was spent. Figma shows "Click vào box để mở" with 05 |
| 44 | standby-2: "1 Áo phông SAA" (T-shirt prize) | `evidence/screens/secret-box-standby-2/viewport.png` (completion pending) | Six-icon completion | PASS with accepted deviation 1 | AC codes FR-205, 206, 404 do not describe a prize frame |
| 45 | standby-3: "Lót chuột Root Further" (coaster) | `evidence/screens/secret-box-standby-3/viewport.png` (six-icon list) | Six-icon completion | PASS with accepted deviation 1 | AC codes FR-205, 206, 404 as in 44 |
| 46 | standby-4: "Khăn Root Further" (towel) | Same as 45 (no separate capture) | Six-icon completion | PASS with accepted deviation 1 | AC codes FR-205, 206, 404 as in 44 |
| 47 | standby-5: "Magnet Root Further" | Same as 45 | Six-icon completion | PASS with accepted deviation 1 | AC codes FR-206, 404, 409; FR-409 is the notification rule, not a visual |
| 48 | standby-6: "Combo magnet và ly sứ" | Same as 45 | Six-icon completion | PASS with accepted deviation 1 | AC codes as in 47 |
| 49 | standby-7: "Ly sứ Root Further" | Same as 45 | Six-icon completion | PASS with accepted deviation 1 | AC codes as in 47 |
| 50 | standby-8: TOUCH OF LIGHT rising, "05", "Click vào box để mở" | `evidence/screens/secret-box-standby-8/viewport.png` (ready at 5/6) | Ready state at 5/6, box closed, 40 unopened | PASS (qualitative) | Figma shows a reveal composition. The reveal with boxes left matches row 43 |

The spec's D012 says standby frames show "box per collected-icon state". The implementation uses one closed-box art for every collected count, and Figma provides only two box variants (closed, and TOUCH OF LIGHT rising). Neither the spec nor Figma says which variant belongs to which count. This is an ambiguity to confirm, not a visual defect.

## Acceptance criteria (cross-row)

| AC | Result | Evidence |
|----|--------|----------|
| US008 holding all 6 shows a completion message | PASS | Completion heading and "Trọn bộ 6 icon SAA 2025" (`evidence/p8-capture-results.json`, S10c) |
| BR-010 / FR-409 completion announced once | PASS | `icons_completed_at` set; `icons_completed` notifications 1 after completion and after an extra open (S10d) |
| FR-207 empty window, nothing opens | PASS | `secret-box-empty/viewport.png`: "Bạn không còn Secret Box nào để mở.", footer 00, no "Mở một Secret Box" control (S9). e2e test 9 ok in both runs |
| DEC-004 open with no box refused, empty message | PASS | Same as above |
| Reduced motion, no shake | PASS | `evidence/p8-shake-probe-results.json`: default mode 54 frames with `opening` and 1 WAAPI shake (about 900 ms). Reduced mode 1 frame with `opening` and 0 animations |
| Double click opens exactly one box | PASS | S6: 4 → 3 (consumed 1) |
| Lost answer retried with the same key, one box spent, same icon | PASS | e2e test 8 (`secret-box-open-and-retry.spec.ts`) ok in runs 1 and 2 |
| Opening the next box after a retry is a new intent | PASS | e2e test 8 (last steps) |
| Heart rollback on failure (optimistic revert) | PASS | e2e test 2 (`like-kudos-and-secret-box.spec.ts`) ok in runs 1 and 2 |
| Sender cannot heart own kudo | PASS | DOM: `disabled: true`, title "Bạn không thể thả tim cho Kudos của mình" (S3b). API 403 `cannot_heart_own_kudo` (e2e test 3) |
| Campaign x2 weight reflected in counts | PASS | e2e test 1: total +2, stored weight 2 with `campaign_id` (both runs) |

## Deviation judgement (the six listed by the implementer)

1. Prize frames as one completion screen: **accepted.** Reason: the spec has no prize data (D010: the prize is handed out offline, no claim screen; US008: completion message). AC codes for 44–49 need correcting in the tracker.
2. Campaign badge only in the sidebar: **not accepted.** D013 names the heart control. See `verify-hover-campaign.md`.
3. Un-hearted red outline, own kudo disabled grey: **accepted.** DEC-001 says "filled when you hearted, outline otherwise" and "disabled on your own kudo". The disabled state is confirmed in the DOM. Its grey colour was not captured this pass.
4. "Mở Secret Box" always enabled, footer "Icon đã sưu tập n/6": **accepted.** DEC-004 says the open action is refused and the window shows the message, so an enabled control is consistent. The footer is in the reveal state (FR-206) and not in the ready state (FR-205), as in the spec.
5. Artwork cropped from 1x PNGs, reveal icons soft: **accepted with follow-up.** Reveal icons are visibly soft (REVIVAL, TOUCH OF LIGHT). Request @2x assets for the reveal icons.
6. Gift recipient rows "Nhận được 1 icon …" vs Figma "Nhận được 1 áo phông SAA": **accepted.** FR-407 lists recipients by the icon they opened, and the prize is outside the spec. Not in this pass's 21 rows (P7 sidebar).

## Run-wide checks

| Check | Result | Evidence |
|-------|--------|----------|
| `npx playwright test e2e/like-kudos-and-secret-box.spec.ts e2e/secret-box-open-and-retry.spec.ts --workers=1`, run 1 | EXIT=0, 10 passed (43.9 s) | `evidence/p8-e2e-run1.txt` |
| Same command, run 2 (flake check) | EXIT=0, 10 passed (44.3 s) | `evidence/p8-e2e-run2.txt` |
| Flakiness across the two runs | None observed | Both runs identical in test list and outcome |
| Standalone capture: console errors, page errors, `/api` responses 4xx or 5xx | 0, 0, 0 | `evidence/p8-capture-results.json` (S1–S10) |
| API log: new ERROR lines | 1 new: `read active campaign for the badge: context canceled` at 2026-11-28T16:15:39+07:00 (during e2e run 2). Client abort, logged at ERROR | `logs/api.log` (baseline 64 lines, now 65) |
| Web log: new error lines | 8 "[browser] campaign badge hidden: active campaign read failed", from the intentional 500 injection in e2e test 2. No other error | `logs/web.log` (baseline 6199 lines, now 6338) |

The log baseline was recorded before the reseed (`evidence/p8-log-baseline.txt`). Reseed lines are in the total since the baseline; none are ERROR.

## Fix list (rows 43–50)

1. Rows 44–49: correct the tracker AC codes. Prize frames have no AC of their own; map them to US008 and D010 and drop FR-409 from 47–49.
2. Rows 40–41 decision (see those reports) is what gates the reveal frames. This group does not add a code change.
3. Confirm with the designer which box art belongs to which collected count (D012), or accept one closed box for all counts.
4. Reveal icons: request @2x assets (deviation 5).
5. Log hygiene (not a row fix, found in run-wide checks): the campaign read handler logs `context canceled` at ERROR. Treat a client-cancelled request as INFO or skip it. Location: the active-campaign handler in `backend/internal/gamification/active_campaign_handler.go`.


---

## Round 2 (P8 fix round 1 re-verify): run-wide checks

**Final verdict: PASS for the e2e and heart checks. FAIL (minor) for log hygiene and the FAB overlap.**

| Check | Result | Evidence |
|-------|--------|----------|
| `npx playwright test e2e/like-kudos-and-secret-box.spec.ts e2e/secret-box-open-and-retry.spec.ts --workers=1` | EXIT=0, 11 passed (59.7 s). The spec now has 11 tests (round 1: 10) | `evidence/p8-r2-e2e-run1.txt` |
| Heart stays pressed after window focus | PASS | Pressed click gives `aria-pressed` true; after `blur` and `focus` plus `visibilitychange` and a 2.5 s wait it is still true; DB row 1. Restored to 0 afterwards (`evidence/p8-round2-results.json`, `heartFocus`) |
| No ERROR line for client-cancelled campaign read | PASS | "active campaign read cancelled by the caller" is now INFO (16:48:16, `logs/api.log`) |
| No ERROR line for client-cancelled requests in general | FAIL (minor) | New ERROR at 16:48:16 for the same abort path: `load profile role … error: context canceled` (user d0000000-…0001). It comes from a cancelled profile load, not the campaign read. Fix: log `context.Canceled` as INFO (or skip) in the profile-role load too |
| API log `read current event: timeout: context deadline exceeded` (ERROR, 16:42:24) | Observed, not from these runs | Logged before this round's baseline. A real timeout on the events read, not a client cancel. Check whether it recurs under load |
| FAB vs "10 SUNNER NHẬN QUÀ MỚI NHẤT" heading at 1440×1024 | Heading clears: PASS. Rows under FAB: FAIL (minor) | FAB at x 1191–1302, y 840–904. The heading is visible and clear. When the gift list scrolls, the FAB covers the right end of row text ("Nhận được 1 icon Touch of Li…", row 3). Figma's sidebar is not drawn with the FAB, so this is not a Figma match. Fix: give the gift list rows a right inset of about the FAB width (≈120 px) at this breakpoint, or hide the FAB while it overlaps the sidebar. Owner: F001 FAB / P7 sidebar |

Screenshots: `plans/261109-1626-saa-2025-website/evidence/screens/r2-fab-sidebar.png`, `r2-fab-sidebar-scrolled.png`.

Fix list (round 2):
1. API: log `context.Canceled` as INFO in the profile-role load (same as the campaign read). Re-check that `logs/api.log` has no ERROR for client-cancelled requests after the e2e runs.
2. FAB: keep text clear of the FAB in the sidebar gift list (right inset ≈ FAB width), or hide the FAB while it covers the sidebar. Re-capture `r2-fab-sidebar-scrolled.png`.


---

## Round 3 (P8 fix round 2 re-check, commit a9f3c68)

**Final verdict: PASS for both items.** Gift-list text clears the FAB, and no ERROR line was logged for client-cancelled navigations in this run. Caveat on the cancel check below.

### 1. Client-cancelled requests in `logs/api.log`

- Method: five cycles of `/kudos` → `/kudos/<id>` → `/kudos`, each navigation committed before the previous page finished loading. `logs/api.log` was 80 lines before and after (no new lines).
- Result: PASS. No ERROR for client-cancelled requests. The profile-role load (`load profile role … context canceled`) did not reappear.
- Caveat: the run produced no cancel log at all, not even INFO. So the cancel path was probably not exercised mid-query this time. Round 2's ERROR came from a navigation that cancelled a request while the DB was still working. The check proves "no ERROR", not "cancel path observed".

### 2. Scrolled gift list vs FAB at 1440×1024

- Measured after scrolling `[data-testid="gift-recipients"]` into view: FAB at x 1191–1302, y 840–904. List box x 898–1271. 10 rows, 0 text rects under the FAB.
- Screenshot `plans/261109-1626-saa-2025-website/evidence/screens/r3-sidebar-scrolled.png`: "Đặng Mai Linh / Nhận được 1 icon Touch of Light" wraps to "Touch / of Light" and ends clear of the FAB. Names truncate with an ellipsis ("Huỳnh Dương X…").
- Measurement caveat: the range-rect `maxRight` read 1258, which is the name box's right edge, not the visible text. The screenshot shows the visible text ends near x 1180.
- Result: PASS. The round-2 FAB overlap is resolved.

| Check | Result | Evidence |
|-------|--------|----------|
| No ERROR for client-cancelled requests (5 cycles) | PASS (caveat: cancel path not observed) | `logs/api.log` 80 → 80 lines |
| Gift-list text under the FAB, scrolled, 1440×1024 | PASS | `screens/r3-sidebar-scrolled.png`, 0 rows under the FAB |

Fix list: none for this round. Optional follow-up: confirm the cancel log path with a slower request (for example a DB-side delay) so the INFO line is observed.
