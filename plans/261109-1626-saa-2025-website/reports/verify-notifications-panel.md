# Verify: Notification panel (F009, tracker row 54, `docs/figma-refs/user/notifications-panel.png`)

**Verdict: FAIL (low).** Every panel behaviour I could drive passes: bell dot and count, order, paging, mark one and all, mark-all failure, focus refresh, keyboard, error and empty states, anonymity masking. The one failure is seed data. The seed gives sunner01 an "all 6 badges collected" notice, but sunner01 has 3 distinct icons and `icons_completed_at` is null. The panel shows the notice as written, so the UI is right and the data is wrong (spec R11, BR-004). Fix 1 below.

Frame naming: `notifications-panel.png` is the full-history layout (589:9132). `notification-detail.png` is the dropdown under the bell (589:9152). The names are swapped in the file set, as the brief says. I matched each layout to its real frame by content.

## Method

- Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, vi locale, sunner01.demo, seed `live`.
- Playwright MCP was locked ("Browser is already in use for ...mcp-chrome-bdeb50c"). Standalone Chromium script instead: `scratchpad/notif-verify.cjs` (not in the repo). Cookies from `playwright/.auth/user.json`, values never printed.
- Seed baseline: 24 notices, 7 unread, all seven kinds present (checked in SQL).
- DB checks run through `wsl docker exec supabase_db_saa-2025 psql`. API checks call the Go API with the session bearer token.
- Results: `scratchpad/notif-verify-results.json` (run 7, instrumented). 57 checks, 57 pass, 0 fail.
- The database was reseeded to `live` and sessions regenerated after every mutating run. Final state is reseeded.

## Evidence

- `evidence/screens/notifications-panel/panel-dropdown-vi-viewport.png`, `panel-dropdown-vi.png`
- `evidence/screens/notifications-panel/panel-full-history-vi-viewport.png`
- `evidence/screens/notifications-panel/panel-list-error-vi.png`, `panel-empty-vi.png`
- `evidence/screens/notifications-panel/panel-mark-all-failed-vi.png`, `panel-after-mark-all-vi.png`
- `evidence/screens/notifications-panel/panel-anonymous-remask-vi-viewport.png`
- References: `docs/figma-refs/user/notifications-panel.png` (589:9132), `docs/figma-refs/user/notification-detail.png` (589:9152)
- E2E: `npx playwright test e2e/notification-center.spec.ts --workers=1`, exit **0**, 11 passed (run 1, 1.0 min). Re-run for flakiness, exit **0**, 11 passed (run 2, 1.0 min). No test needed a retry.

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-101 bell opens the panel over the page | PASS | Dropdown opens under the bell, page stays visible |
| FR-201 title "Thông báo", "Đánh dấu đọc tất cả", "Xem tất cả" | PASS | Title and mark-all label match; "Xem tất cả" present (24 > 20) |
| FR-202 icon, message, relative time, unread dot | PASS | Per-row dots equal the unread flag on 20 of 20 rows |
| FR-203 newest first | PASS | Dropdown IDs equal API page 1 order; full history 24/24 equal API order; `created_at` descending |
| FR-204 loading, empty, error with retry | PASS | Error text "Không tải được thông báo." with "Thử lại"; retry restores 20 rows; empty text "Bạn chưa có thông báo nào" with mark-all disabled. Loading skeleton not captured (transient); e2e test 5 covers it |
| FR-205 bell dot iff unread | PASS | Dot count 1 with 7 unread; sr text "Có 7 thông báo chưa đọc" equals DB; dot and bell cleared after mark-all |
| FR-402 mark all read | PASS | 0 dots, bell cleared, DB unread 0, API unread 0, button disabled |
| FR-403 paging and "Xem tất cả" | PASS | Dropdown shows 20; full history loads to 24/24 by scroll |
| FR-404 / D010 new notice lights bell without reload | PASS (synthetic) | Notice inserted, `window` focus event dispatched, dot appears, same document. Real window focus and the 60 s interval not exercised by hand; e2e test 3 covers both |
| FR-405 / US004 mark-all failure keeps dots and says so | PASS | Announcement "Không thể đánh dấu đã đọc. Vui lòng thử lại."; 4 dots remain; bell dot remains; DB unchanged |
| FR-002 seven kinds render | PASS | All seven kinds rendered; no `review_requested` row (G10) |
| FR-603, BR-002, BR-007 anonymous, non-admin | PASS | Probe notice "Probe Sender Zeta" linked to an anonymous kudo: UI shows "Một Sunner ẩn danh vừa gửi đến bạn...", name absent from page text; API response contains no probe name and no sender UUID |
| Spec exception: admin sees the sender of an anonymous kudo | PASS | Admin probe shows "Sunner Probe Sender Zeta vừa gửi đến bạn..." (`backend/internal/notification/notification_remask.go`: admins skip the strip) |
| Keyboard operation | PASS | Bell focus, Enter opens panel; Tab reaches the first row button on Tab 3; Enter opens detail with focus inside; Esc returns focus to the row; Esc closes the panel and focus returns to the bell |
| FR-601 / BR-001 another Sunner's notice is 404 | NOT VERIFIED | Not driven in this run (needs a second Sunner session) |
| US001 unread-count failure keeps the last dot | NOT VERIFIED | Not driven in this run |
| Write path: PATCH anonymity empties sender params | PASS (e2e) | E2E test 10 (`anonymous kudo's notice names nobody`) passes |
| Seed consistency with R11 completion rule | FAIL | See fix 1 |

## Visual diff

Dropdown against `notification-detail.png` (589:9152):

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Title, "Xem tất cả", mark-all icon row | as frame | as frame | OK |
| Row layout: type icon, message, time, dot at right | as frame | as frame | OK |
| Panel width, 528 px | ~528 px | 528 px | OK |
| Bell in this view | white | white (rgb 255,255,255) | OK |
| Unread dot colour | red | red | OK |
| Spam row with inline "Tiêu chuẩn cộng đồng" and arrow | as frame | as frame | OK |

Full history against `notifications-panel.png` (589:9132):

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Title and mark-all with sort icon, no "Xem tất cả" | as frame | as frame | OK |
| Panel width, 680 px | ~680 px | 680 px | OK |
| Bell in this view | gold | gold (rgb 255,234,158) | OK |
| Page behind | not dimmed | 50% dim (`bg-page/50`) | Accepted deviation (see below) |
| Relative times | "1 tuần trước", "2 tuần trước" | "11 ngày trước", no weeks | Accepted deviation (see below) |
| Icon-completion copy | "...chính là <X>" | "...quà từ BTC" with no gift name | Accepted deviation (see below) |
| Review-request row | present | absent | Accepted deviation (see below) |

## Accepted deviations (judged)

1. **Frame names swapped in the file set.** Accepted. Mapping only; each layout matches its real frame by content.
2. **"Xem tất cả" switches to the full-history layout over the page, no separate page (D001).** Accepted. Resolved in the spec.
3. **50% dim behind the full history.** Accepted with reason. The backdrop is the modal layer that blocks clicks on the page behind it, the same role as the detail window's overlay. No spec line forbids it. Figma shows none, so the design owner should confirm.
4. **Bell gold only in the full-history view.** Accepted. Both frames agree: 589:9132 is gold, 589:9152 is white.
5. **Relative times without weeks.** Accepted. The tech spec ALG-001 defines minutes, hours, days (under 30), months, years, and FR-202 lists none of the week forms. Figma's "tuần trước" is a sample outside the algorithm.
6. **Review-request row not built.** Accepted. G10 removed the `review_requested` kind; the notice has no producer.
7. **"Đã thu thập đủ 6 huy hiệu" without the gift name.** Accepted. The spec has no prize data and Figma's `<X>` is unfilled. Inventing a gift name would be worse.
8. **English copy is a draft.** Accepted with reason. D012 keeps the wording pending confirmation. Checked: all six English titles render.
9. **"Xem tất cả" hidden when there are 20 or fewer notices.** Accepted with reason. With no older page there is nothing to show, but the spec wording "offers" reads as always-on; the team may prefer it shown. Low.
10. **Seed "6 badges" notice for a Sunner with 3 icons.** Not accepted. See fix 1.

## Console, network, logs

- Browser console, instrumented run 7: 4 `console.error` entries, all "Failed to load resource: 500" from the injected failures (2 list, 1 mark-read, 1 mark-all). Page errors: 0.
- Network 4xx/5xx: only the injected 500s (2 list GET, 1 read POST, 1 read-all POST). No unexpected 4xx or 5xx.
- `logs/api.log`: 104 lines before and after my runs, 24 ERROR lines before and after. No new ERROR or panic.
- `logs/web.log`: 36 more "unread count refresh failed" warnings since my baseline (status 0, `Go API request failed`), plus e2e's own deliberate 500s. The Go API logged nothing for them, which fits fetches aborted by navigation. Run 7 captured none of them in the page console, so I cannot attribute each line exactly. Low: the bell logs an aborted refresh as a warning. Fix 2 (optional).

## Fixes

1. **Seed: `icons_completed` notice for sunner01 without the completion state.** `backend/db/seeds/demo_notifications.sql` lines 83–89 insert `icons_completed` for `demo_people` n=1 (sunner01) with no check on icon count. sunner01 has 3 distinct opened icons and `icons_completed_at` is null, so R11 says the notice must not exist. Either give that Sunner the sixth icon and set `icons_completed_at` in `demo_activity.sql` step 6, or drop the insert. Then reseed `live` and confirm that a Sunner without 6 icons has no `icons_completed` row.
2. (Optional, low) `src/features/notifications/use-unread-count.ts`: skip logging the refresh error when the request was aborted (`AbortError` or navigation), so the warning log stays quiet on normal navigation.

## Concerns

- The MCP browser was locked for the whole run. The standalone script stands in for it, and the screens were not re-driven through MCP.
- Not driven by hand: loading skeleton, US001 unread-count failure, cross-user 404.
- The seed fix changes the demo data every other F009 check reads. Re-run the F009 e2e spec after it lands.

---

## Round 2 (after P10 fix round 1)

**Final verdict: PASS.** The seed defect is fixed, the focus throttle works, and the bell is keyed per user. No new failures. Fix 1 is closed. Fix 2 (log noise) is addressed in the code (aborted reads and network-class failures are no longer logged), and no new refresh warnings came from my own browser contexts.

Method: standalone script `scratchpad/notif-verify-r2.cjs` (same checks as round 1 plus the throttle probe and admin Secret Box). Results: `scratchpad/notif-verify-r2-results.json`, 59 checks, 59 pass, 0 fail. Screenshots prefixed `r2-` in `evidence/screens/notifications-panel/`.

### Round-1 failure, re-checked

| Item | Result | Evidence |
|------|--------|----------|
| Seed: sunner01 has the full 6 icons and `icons_completed_at` set | PASS | SQL: 6 distinct opened icons, `icons_completed_at` not null, one `icons_completed` notice |
| Seed: Secret Box notices match box state | PASS (counts) | SQL: 2 unread box notices, 2 unopened boxes. Counts agree; per-notice pairing not checked |
| Panel and bell with the new seed | PASS | Bell dot with 7 unread; dropdown order equals API; full history 24/24; 7 unread dots |

### Focus throttle (review W3)

| AC | Result | Evidence |
|----|--------|----------|
| Focus after 5 s quiet reads once | PASS | 1 unread-count request on the first focus |
| Burst of focus events within 1 s reads nothing | PASS | 0 requests for two focus events 300 ms apart |
| Focus after 5 s more reads again | PASS | 1 request |
| 60 s interval not throttled | PASS (e2e) | E2E test 3 covers the 60 s refresh |

### Bell keyed by user id, admin Secret Box

- Keying: `src/features/notifications/notification-bell.tsx:38` renders `<UserNotificationBell key={user.id} />`. E2E test 4 (account switch shows only the new account's count) passes.
- Admin Secret Box: a box notice in the admin bell opens the Secret Box window, closes the panel and is marked read. PASS (manual, `r2-` screenshots; e2e test 13). The earlier round-1 deviation is resolved: the admin layout now mounts the Secret Box host, and the spec states admins earn boxes (F008).

### E2E

- `npx playwright test e2e/notification-center.spec.ts --workers=1`
- First attempt, right after the round-2 script, exit **1**: 6 failed, 7 passed. Cause: the round-2 script marks notices read and I did not reseed before the spec. Test 1 found no unread dot, and tests 5, 6 and 7 found no unread box notice ("not a uuid"). The spec assumes the `live` baseline. Not a product defect; recorded for transparency.
- After reseed `live` plus `npm run e2e:session`: exit **0**, 13 passed. Second run: exit **0**, 13 passed. No retries.
- The spec now has 13 tests (round 1 had 11): test 4 (account switch) and test 13 (admin Secret Box) are new.

### Logs

- `api.log`: no new lines from my window. One ERROR (20:51:34, `read current event` timeout) predates the round-2 baseline and came from another client.
- `web.log`: two `unread count refresh failed` warnings with status 0 landed in the window. The current policy (`shouldLogRefreshFailure`) does not log network-class failures, so these came from a tab on the older bundle or another client. None came from my contexts (instrumented capture recorded only the injected 500s).

### Round-2 AC summary

| AC | Result |
|----|--------|
| FR-205, FR-404 bell dot and refresh | PASS |
| FR-201 to FR-203 panel, order, dots | PASS |
| FR-402, FR-405 mark-all, failure keeps dots | PASS |
| FR-403 paging | PASS |
| FR-603, BR-002, BR-007 anonymity (non-admin) | PASS |
| Admin sees sender (spec exception) | PASS |
| Keyboard | PASS |
| FR-601 cross-user 404 | NOT VERIFIED by hand (test 4 covers the bell per account, not a 404) |
| US001 unread-count failure keeps last dot | NOT VERIFIED by hand |

**Round 2 status:** PASS. Fix list: none required.
