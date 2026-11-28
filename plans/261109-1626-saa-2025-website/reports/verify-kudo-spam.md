# Verify: KUDO spam - detail for admin and author (F011, tracker row 70, `docs/figma-refs/user/kudo-spam.png`)

**Verdict: PASS.** The admin sees the neutral Spam tag and notice with no overlay. The author gets the overlay, cannot edit, and a teammate gets not-found. The kudo leaves the board and comes back after Public. The Spam tag matches the frame.

Setup: 1440×1024, VN, `live` seed. Admin `saa.admin.e2e` for the admin view, An (sunner01, author) for the author view, Bình for the teammate (e2e). Standalone Chromium.

## Evidence

- Admin view: `evidence/screens/kudo-spam/row70-kudo-spam-admin.png`
- Author, overlay closed: `evidence/screens/kudo-spam/row70-kudo-spam-author-closed.png`
- Author, edit refused: `evidence/screens/kudo-spam/row70-kudo-spam-edit-refused.png`
- Reference: `docs/figma-refs/user/kudo-spam.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, tests 4 and 6 (ok)
- Raw results: `evidence/screens/e2e/p12-flows-a-results.json`

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-304 hidden from the board | PASS | live: `P12 VERIFY SPAM` count 0 on An's board, `P12 VERIFY PUBLIC` count 1; e2e 4 |
| FR-401 author sees the overlay, admin sees the neutral notice | PASS | live: admin `spam-alert-overlay` count 0, `spam-badge` "Spam: Kudos này đã bị đánh dấu Spam và đang được ẩn khỏi bảng Kudos."; e2e 6 |
| FR-602 no edit while Spam (F005) | PASS | live: `kudo-edit` count 0 on the author page; `editKudo` link gives API 409 `kudo_spam_locked` and the modal "Kudos này hiện không thể chỉnh sửa." See the edit-mode note |
| BR-006 spam hidden from everyone but admin and author | PASS | e2e 6: teammate gets `not-found-page` |
| BR-008 Public restores | PASS | e2e 6: overlay and badge gone after Public; e2e 4 |
| SC-008 author sees the overlay, others not | PASS | e2e 6 |
| F006 FR-001 detail page loads | PASS | live: 200 for both views |

## Visual diff (`kudo-spam.png` vs `row70-kudo-spam-admin.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Orange "Spam" tag, top right of the card | orange | orange | OK |
| Card anatomy (avatars, arrow, names, unit, badge, time, title, body, Copy Link, heart) | as frame | as frame | OK |
| Image row (5 thumbnails) | 5 thumbnails | none | NOT COMPARABLE: the `live` kudo has no images (same as F006 C1) |
| Hashtags in red | red | none on this kudo | NOT COMPARABLE: no hashtags on the test kudo |
| Heart | red filled, "1.000" | grey outline, "0", plus a "x2" flame badge | NOT COMPARABLE: 0 hearts on the test kudo. Heart colour for a populated count is an F006 check |
| "Đóng" button | not in frame | present | Accepted: existing F006 detail close, not part of F011 |

## Accepted deviations

- "Đóng" button and the notice line: accepted (existing detail page, and FR-401 notice).

## Console, network, logs

- Console: the 409 from the edit refusal is the only error-level entry; it is the expected refusal.
- Web log: one 404 for a kudo id deleted by the e2e run, from the teammate not-found check. Expected.
- API log: no new ERROR lines. No 5xx.

## Fix list

None blocking. To make the image and hashtag comparison real, rerun with a kudo that has images and hashtags (seed data, not a code change).

## Round 2 sanity (2026-11-29)

**Final verdict: PASS (unchanged).** E2E test 7 (badge, overlay, teammate not-found, Public removes both) green in the round-2 run. Live: admin view `evidence/screens/kudo-spam/r2-row70-kudo-spam-admin.png`, author closed view `r2-row70-kudo-spam-author-closed.png`. Edit refusal re-confirmed through the round-1 path (409 `kudo_spam_locked`).
