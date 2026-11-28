# Verify: Admin filter bar - C_Filter (F011, tracker row 66, `docs/figma-refs/admin/admin-filter.png`)

**Verdict: PASS.** The filter bar matches the frame. Each filter returns the database answer, and the combined filters and the date range behave as specified.

Setup: 1440×1024, VN, admin, `live` seed, standalone Chromium.

## Evidence

- Filter bar capture: `evidence/screens/admin-filter/row66-filter-bar.png`
- Reference: `docs/figma-refs/admin/admin-filter.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 3 (ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 status filter | PASS | e2e 3: `status=spam` ids equal the DB oracle |
| FR-204 sender and receiver filters | PASS | e2e 3 (sender filter ids equal the DB oracle) |
| FR-206 filters combine and reset to page 1 | PASS | e2e 3: `sender` + `status=spam` gives the intersection |
| BR-001 | PASS | e2e 2 and 3 |
| BR-005 date range in report time zone, reversed range ignored | PASS | e2e 3: window ids equal the DB oracle; `from > to` shows "Khoảng thời gian: Chưa chọn" and the full list |
| SC-001 | PASS | e2e 3 |
| Date range clear | PASS | e2e 3: "Xóa" in the picker returns to `/admin/review` |

## Visual diff (`admin-filter.png` vs `row66-filter-bar.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Three dropdowns with labels above, bordered | as frame | as frame | OK |
| Search at the right | as frame | as frame | OK |
| Export button | in frame | absent | Accepted: D008 |
| Placeholders | English "Chọn Sender" / "Search" | vi "Chọn người gửi" / "Tìm theo nội dung" | Accepted: vi copy |

## Accepted deviations

- No Export (D008), vi placeholders: accepted above.

## Console, network, logs

- No console errors. No 4xx/5xx on filter requests.

## Fix list

None.
