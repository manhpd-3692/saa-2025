# Verify: Admin Review content (F011, tracker row 62, `docs/figma-refs/admin/admin-review-content.png`)

**Verdict: PASS (accepted deviations).** Every list, pager, anonymity and access check holds. The layout matches the Figma frame except the deviations judged below.

Setup: viewport 1440×1024, DPR 1, `http://localhost:3000/admin/review`, VN locale, admin `saa.admin.e2e`, `live` seed. Standalone headless Chromium through the project `@playwright/test` (not the MCP browser). Two verification kudos were added for the run and removed by the reseed.

## Evidence

- Screenshot: `plans/261109-1626-saa-2025-website/evidence/screens/admin-review-content/row62-review-default.png`
- Reference: `docs/figma-refs/admin/admin-review-content.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log` (exit 0, 8 passed; tests 1, 8)
- Live readout: heading "Duyệt nội dung", headers `ID | Người gửi | Người nhận | Nội dung | Hashtag | Tim | Thời gian | Trạng thái | Thao tác`, pager "1–20 trên 66 kudos"

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-101 newest first, 20 a page, page clamp | PASS | e2e 1 (ids equal the DB oracle; `page=99` clamps to last page) |
| FR-102 anonymous: real sender shown with "Ẩn danh" marker | PASS | e2e 1; row `a0f7ebd9` shows "Dương Thùy An" with the marker |
| FR-103 row action and failure message | PASS | e2e 5 (500 keeps the row, shows the notice) |
| FR-206 state kept in the address | PASS | e2e 3 |
| FR-601 admin-only page | PASS | e2e 8: Sunner sees `forbidden-page`, no table |
| FR-602 moderation endpoints refuse non-admin | PASS | e2e 8: 403 with token, 401 without, for all four calls |
| BR-004 real sender for admins only | PASS | e2e 1 |
| BR-007 admin-only access | PASS | e2e 8 |
| SC-001 full list, newest first | PASS | e2e 1 |
| SC-002 masking on read | PASS | e2e 1 |
| SC-007 non-admin gets Forbidden | PASS | e2e 8 |

## Visual diff (`admin-review-content.png` vs `row62-review-default.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Title, filter labels, bordered inputs, search at right | as frame | identical layout | OK |
| Header nav | Review content, Role, Settings | Tổng quan, Duyệt nội dung, Người dùng, Cài đặt | Accepted: nav is the F010 admin set, vi copy |
| Export button | present | absent | Accepted: D008 |
| Date range | top right | top right | OK |
| Time column | absent | `Thời gian` added | Accepted: newest-first (FR-101) needs a visible time |
| Heart | sortable icon | plain number, no sort | Accepted: sort not in spec |
| Status pill | outlined Public / Spam | outlined Public / Spam | OK |
| Action button | "Mark Spam" / "Un Spam" boxed, two states | one button per row, "Đánh dấu Spam" / "Bỏ Spam" with icon | Accepted: DEC-001 (one action per row), vi copy |
| Excerpt length | about 4 lines | 240 characters | Accepted: the Figma frame shows about 240 characters. Spec E11 says "about 120"; the spec should change, not the UI |
| Pager | centred | not in the 1024 px viewport | NOT VERIFIED visually. Position was accepted per the brief (P11 right-aligned). Text verified |

## Accepted deviations

- Time column, plain heart count, no Export (D008), one action button, 240-character excerpt: accepted with the reasons in the table.
- Spec E11 "about 120 characters" conflicts with the Figma frame. Update the spec to match the frame.

## Console, network, logs

- Console: no errors on this page. Network: no 4xx/5xx on the page's own requests.
- API log: no new ERROR lines since the baseline taken before this run.

## Fix list

None blocking. Optional: confirm the pager placement with a full-page capture in a separate pass (not done here).

## Round 2 sanity (2026-11-29)

**Final verdict: PASS (unchanged).** E2E tests 1 and 2 green in the round-2 run. Live capture (`evidence/screens/admin-review-content/r2-row62-review-default.png`): same headers, pager "1–20 trên 66 kudos", same layout. Accepted deviations unchanged.
