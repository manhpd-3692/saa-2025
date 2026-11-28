# Verify: Notification detail, "View thông báo" (F009, tracker row 55, `docs/figma-refs/user/notification-detail.png`)

**Verdict: PASS (with concerns).** The detail window opens for each kind, carries the right message, time and target in vi and en, marks the notice read, and keeps the dot and count when the mark-read fails. The one open point is the admin layout's Secret Box notice, which only closes the panel. Accepted below with reason. The "6 huy hiệu" copy in the icons notice is wrong for the seeded user, but that is a seed defect shared with row 54 (fix 1 in `verify-notifications-panel.md`), not a detail defect.

Figma: `notification-detail.png` is the dropdown (589:9152), not the detail. There is no detail frame. The detail follows the spec default layout (D002), so there is no Figma diff. Visual review is against the design system, not a frame.

## Method

- Same run as row 54: standalone Chromium (`scratchpad/notif-verify.cjs`, MCP browser locked), viewport 1440×1024, DPR 1, `localhost:3000`, sunner01.demo, seed `live` (24 notices, 7 unread).
- Detail opened from the full-history list, one notice of each kind, vi; then one per kind in en (`saa_locale=en`).
- Results: `scratchpad/notif-verify-results.json`. The detail checks (ids `55-*`, `row-55-*`) all pass.
- E2E: `npx playwright test e2e/notification-center.spec.ts --workers=1` exit **0**, 11 passed, twice (see row 54 report).

## Evidence

Screens in `evidence/screens/notification-detail/`:
- vi per kind: `detail-kudo_received-vi.png`, `detail-heart_received-vi.png`, `detail-hero_level_up-vi.png`, `detail-kudo_spam_warning-vi.png`, `detail-icons_completed-vi.png`, `detail-generic-vi.png`
- en per kind: `detail-<kind>-en.png` (6 kinds)
- Failures and targets: `detail-mark-read-failed-vi.png`, `community-standards-from-spam-vi.png`, `profile-from-icons-notice-vi.png`
- Secret Box: `secret-box-from-notice-vi.png` (non-admin), `admin-secret-box-notice-vi.png` (admin)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-102 selecting a notice opens its detail | PASS | Row button opens the detail for all six non-box kinds |
| FR-206 full message, time, inline link, one action | PASS | Message lines, `Thời gian: HH:mm dd/MM/yyyy` (Asia/Ho_Chi_Minh), spam inline link, one action per kudo or profile kind |
| FR-103 kudo-related kinds lead to the kudo | PASS | `kudo_received`, `heart_received`: "Xem lời nhắn" to `/kudos/<id>`, HTTP 200 on follow (heart checked) |
| FR-103 spam warning: inline Community Standards link | PASS | Link text "Tiêu chuẩn cộng đồng" to `/community-standards`, navigated, HTTP 200 (X06) |
| FR-103 spam warning: action to the flagged kudo | PASS | "Xem lời nhắn" to `/kudos/d2000000-…-01` (kudo available in seed) |
| FR-103 level and icon notices lead to own profile | PASS | "Xem profile" to `/profile`, HTTP 200 (D008, N10) |
| Generic notice has no action | PASS | Message as written, no link or button |
| FR-401 opening marks read | PASS | Two unread notices opened; both `read_at` set in DB; bell count follows (DB 4 after opens) |
| FR-405 / R19 mark-read failure still opens detail | PASS | Detail opens; status "Không thể đánh dấu đã đọc. Vui lòng thử lại."; row keeps dot; bell count unchanged; DB unchanged |
| DEC-002 / US003 Secret Box notice goes to the box | PASS (non-admin) | `secret-box-modal` opens, panel gone, notice marked read in DB |
| Anonymous: no sender in the detail | PASS (e2e) | E2E test 10 asserts the detail reads "Một Sunner ẩn danh" and not the name. Manual check covered the row: UI and API show no sender |
| FR-004 text follows the reader's language | PASS | en titles for all six kinds: "New kudo", "New hearts", "Hero level up", "Kudo hidden", "All 6 badges collected", "Notification". en body copy sampled (kudo anonymous, heart, hero, spam, icons), not every line |
| Keyboard | PASS | Enter on a row opens the detail with focus inside the dialog; Esc closes the detail and returns focus to the row (see row 54 report) |
| Absolute time format (FR-206) | PASS | vi "17:28 28/11/2026", ISO carries +07:00 |
| E08 "This kudo is no longer available" | NOT VERIFIED | Every kudo target in the seed is available, so the unavailable branch did not run. Code path read only (`build-notification-message.ts`: `available` false → unavailable copy) |
| Admin: Secret Box notice opens the box | DEVIATION, accepted | See accepted deviations |

## Visual check (design system, no frame)

- Dialog: 560 px, centred, dimmed backdrop, gold border, cream title with kind icon, close button top right, bold body, underlined link with arrow, time line, gold action button. Matches the panel's token set in all captured states.
- Mark-read failure state: red status line under the time. Reads clearly and does not hide the message.
- Spam detail: the inline link and the action button stay separate; the link does not act as the button.

## Accepted deviations (judged)

1. **No detail frame in Figma.** Accepted. D002 applies the default layout; no reference to diff against. Design owner should confirm the look once a frame exists.
2. **Admin layout: a Secret Box notice only closes the panel.** Accepted with reason. Admin is not a Sunner participant. The admin layout (`src/app/admin/layout.tsx`) has no `ShellActionsProvider` and no `GamificationShellHost`, so there is no box flow to open there. Verified: modal did not open, panel closed, notice marked read. Residual risk: the notice is marked read with no feedback. Open question below.
3. **Seed copy "Trọn bộ 6 huy hiệu" for a 3-icon Sunner.** Not a detail defect. The detail renders the stored kind correctly. The data is wrong; see fix 1 in row 54.

## Console, network, logs

- Page errors: 0. Console errors on the detail flows: only the injected 500 for the mark-read failure (expected).
- Network: the only 5xx is the injected mark-read 500. No unexpected 4xx.
- Go log: no new ERROR (see row 54 report).
- The "unread count refresh failed" warnings in `logs/web.log` are the same navigation-abort noise noted in row 54.

## Fixes

None required for row 55. The shared seed fix is in `verify-notifications-panel.md` (fix 1).

## Concerns and open questions

1. Can an admin account earn Secret Boxes (F008)? If yes, the admin layout needs a box host or the notice should not be shown there. If no, the current close-only behaviour is acceptable.
2. The unavailable-kudo branch (E08) was not driven. Needs a kudo the viewer cannot open (e.g. hidden as spam for a non-author) to confirm the copy and the disabled action.
3. Loading state of the detail is not visible (opens immediately, no fetch), so there is nothing to verify there.

---

## Round 2 (after P10 fix round 1)

**Final verdict: PASS.** Quick re-run of all seven kinds in vi and en, plus the admin Secret Box path. The round-1 admin deviation is resolved.

Method: `scratchpad/notif-verify-r2.cjs` (standalone; MCP browser still locked). Results `scratchpad/notif-verify-r2-results.json`: 59 checks, 59 pass, 0 fail. Screenshots prefixed `r2-` in `evidence/screens/notification-detail/`.

### Re-run by kind

| Kind | vi title | vi target | en title | Result |
|------|----------|-----------|----------|--------|
| kudo_received | Lời ghi nhận mới | `/kudos/<id>` | New kudo | PASS |
| heart_received | Lượt tim mới | `/kudos/<id>` | New hearts | PASS |
| hero_level_up | Thăng hạng Hero | `/profile` | Hero level up | PASS |
| kudo_spam_warning | Lời nhắn bị tạm ẩn | standards link plus `/kudos/<id>` | Kudo hidden | PASS |
| icons_completed | Trọn bộ 6 huy hiệu | `/profile` | All 6 badges collected | PASS |
| generic | Thông báo | none | Notification | PASS |

- Spam standards link opens `/community-standards`, HTTP 200. Kudo and profile deep links, HTTP 200.
- The icons detail now reads "Trọn bộ 6 huy hiệu" for a Sunner who actually has 6 icons. Consistent with the seed fix.
- Absolute time format unchanged (`HH:mm dd/MM/yyyy`, Asia/Ho_Chi_Minh).
- Mark-read failure: detail opens, status "Không thể đánh dấu đã đọc. Vui lòng thử lại.", dot and count stay. PASS.

### Admin Secret Box path

- Admin probe box notice in the admin bell: the Secret Box window opens (`secret-box-modal`), the panel closes, and the notice is marked read in the database. PASS. Screenshot: `r2-admin-secret-box-notice-vi.png`.
- Deviation 2 from round 1 is resolved: the admin layout mounts the Secret Box host. Not accepted as a deviation any longer.

### Screenshots

`r2-` files in `evidence/screens/notification-detail/` (kinds in vi and en, mark-read failure, community standards, profile, Secret Box non-admin and admin) and `evidence/screens/notifications-panel/`.

### E2E

Same as the panel report: first attempt exit 1 caused by a stale read state from my script (no reseed), then exit 0 twice after reseed (13 passed each run).

**Round 2 status:** PASS. Fix list: none required. Open: E08 "unavailable kudo" copy still not driven by hand.
