# Verify: Admin Review content - Search (F011, tracker row 63, `docs/figma-refs/admin/admin-review-content-search.png`)

**Verdict: PASS.** Search matches title and body, marks the phrase, and an empty result offers Clear filters.

Setup: 1440×1024, VN, admin, `live` seed, standalone Chromium.

## Evidence

- Screenshot: `plans/261109-1626-saa-2025-website/evidence/screens/admin-review-content-search/row63-search-phi-thuong.png`
- Reference: `docs/figma-refs/admin/admin-review-content-search.png`
- E2E: `evidence/screens/e2e/pw-admin-kudo-moderation-run1.log`, test 2 (ok)
- Live: URL `/admin/review?q=phi+thường`, 3 rows, `<mark>` count 3 (one per row)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-205 search title and body | PASS | e2e 2: ids equal the DB `ilike` oracle |
| FR-206 search kept in the address | PASS | e2e 2 (URL `?q=`) |
| FR-103 empty state with Clear filters | PASS | e2e 2: "Không có kudos nào khớp bộ lọc." and "Xóa bộ lọc" returns to 20 rows |
| BR-001 search is plain text | PASS | e2e 2 (the phrase is matched as typed) |
| SC-001 | PASS | e2e 2 |

## Visual diff (`admin-review-content-search.png` vs `row63-search-phi-thuong.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Highlight of the phrase | red text | red underlined text | OK |
| Search box with typed phrase | as frame | as frame | OK |
| Date range shows "2020-11-08 → 2020-12-23" | in frame | empty placeholder | Not a defect: the frame holds sample data |
| Export button | in frame | absent | Accepted: D008 |

## Accepted deviations

- No Export (D008) and the sample date range in the frame. Both judged above.

## Console, network, logs

- No console errors and no 4xx/5xx on the search request.

## Fix list

None.
