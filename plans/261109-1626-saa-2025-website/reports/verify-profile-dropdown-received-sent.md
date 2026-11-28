# Verify: Dropdown-filter đã nhận/gửi (F007, tracker row 53, `docs/figma-refs/user/profile-dropdown-received-sent.png`)

**Verdict: PASS.** The filter control shows two options, "Đã nhận (n)" and "Đã gửi (n)", with the current one checked. Switching updates the list, the label and the address, and a reload keeps the choice. Counts in the labels match the DB. Figma is a floating two-item menu, and the live control matches that structure.

Viewport 1440×1024, DPR 1, `http://localhost:3000/profile`, VN, sunner01.demo (Nguyễn Văn An), `live` seed. Standalone headless Chromium with `playwright/.auth/user.json`.

## Evidence

- Open menu, viewport: `plans/261109-1626-saa-2025-website/evidence/screens/profile-dropdown-received-sent/dropdown-open-viewport.png`
- Dropdown region element: `evidence/screens/profile-dropdown-received-sent/dropdown-region.png`
- Full page: `evidence/screens/profile-dropdown-received-sent/full.png`
- E2E run: `evidence/screens/e2e/pw-profiles-run.log` (exit 0, 11 passed)
- Reference: `docs/figma-refs/user/profile-dropdown-received-sent.png` (floating menu, 218×236 crop)

## E2E run

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` | 0 | 11 passed (49.1 s). Single run |

Dropdown-relevant test: 3 ("the received/sent dropdown switches to my sent kudos, keeps the choice in the address and after a reload", rows 51 + 53, FR-205, FR-401, SC-002, D002). Also covered by the error path (test 8), which keeps the old cards and address on a failed "sent" fetch.

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-205 dropdown switches the list between received and sent | PASS | e2e test 3: the option list has exactly two items, "Đã nhận (4)" and "Đã gửi (20)" at capture time, matching SQL |
| FR-401 change reloads from page 1 without leaving the profile | PASS | e2e test 3: `/profile?filter=sent` with the sent list, first 10 ids equal SQL |
| FR-401 choice kept in the address and after reload | PASS | e2e test 3 reloads and keeps "Đã gửi" and the same ids |
| FR-205 current option marked | PASS | e2e test 3: first option `aria-checked="true"` when "Đã nhận" is active; the open-menu capture shows the current row highlighted |
| D004 default is "Đã nhận" | PASS | Capture of `/profile` with no query: "Đã nhận (4)" |
| D002 own anonymous sends listed, masked | PASS | e2e test 3: `profile-kudos-list` anonymous-sender count equals SQL anonymous count among the listed ids |
| US002 error: failed fetch keeps cards and address, offers retry | PASS | e2e test 8 (sent request returns 500): cards unchanged, URL unchanged, "Không tải được Kudos. Vui lòng thử lại." alert, retry works |
| Unknown address value falls back to "Đã nhận" (E13 / validation) | NOT VERIFIED | Not exercised in a test. Only the spec table sets this rule |

## Visual diff (`profile-dropdown-received-sent.png` vs live open menu)

Judgment is qualitative. No pixel-diff metric was produced.

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Menu container | dark panel with thin gold border, floating | dark panel with gold border, floating under the control | PASS |
| Option 1 | "Đã nhận (5)" in a lighter tile (current) | "Đã nhận (4)" in a lighter tile (current) | PASS (count is data) |
| Option 2 | "Đã gửi (5)", plain | "Đã gửi (20)", plain | PASS (count is data) |
| Control label | "Đã gửi (5)" with caret | "Đã nhận (4)" with caret, same control styling | PASS |
| Label count format | `(5)` | `(4)` / `(20)` (vi-VN number format; no separators under 1,000) | PASS |
| Position | right of KUDOS heading | right of KUDOS heading | PASS |

## Accepted deviations (judged)

- None for this region. Count values differ because the Figma frame is a sample and the `live` seed is different.

## Console, network, logs

- Console errors while the menu opened and closed: none.
- Responses ≥400 on the screen: none.
- Web log: 200s on `/profile?filter=sent` (two requests) and the `/profile/<Bình>` route. No 5xx.
- API log: no new lines during the captures.

## Concerns

- C1: The "sent" filter count (20) includes the owner's anonymous sends, matching the spec note in test 1 (owner's own anonymous kudos count for the owner, BR-002). This is correct for the owner view.
- C2: Only one e2e run; flakiness not measured.

## Defects

None open for this region.

## Fix list

None required.

**Status:** DONE (verdict PASS)

---

## Round 2 (after P9 fix round 1, DB reseeded `live`, sessions recreated)

**Round 2 verdict: PASS.**

| Command | Exit | Result |
|---------|------|--------|
| `npx playwright test e2e/sunner-profiles.spec.ts --workers=1` | 0 | 12 passed (41.7 s). Log: `evidence/screens/e2e/pw-profiles-r2-run.log` |

| AC | Round 1 | Round 2 | Evidence |
|----|---------|---------|----------|
| Switch between received and sent (FR-205, FR-401) | PASS | PASS (e2e test 3) | e2e log |
| Switch during "Xem thêm" uses only the new list (review W1) | not tested | PASS. Standalone on Nhật: 20 received cards, then "Đã gửi" shows 2 sent cards only, URL `?filter=sent`, label "Đã gửi (2)" | `evidence/screens/profile-dropdown-received-sent/r2-filter-switch-after-load-more.png` |
| Late page from the old filter never added (review W1) | not tested | PASS. e2e test 6 holds the received page, then checks the sent list stays intact | e2e log |
| Failed sent fetch keeps cards and address (US002) | PASS | PASS (e2e test 9) | e2e log |

Counts in the labels are live data after the reseed (own: received 4, sent 6; the label follows the list).

**Final verdict (dropdown, row 53): PASS.** No open items.
