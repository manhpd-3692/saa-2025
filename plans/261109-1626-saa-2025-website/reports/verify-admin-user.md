# Verify: Admin User directory (F010, tracker row 57, `/admin/users`, `docs/figma-refs/admin/admin-user.png`)

**Verdict: FAIL (1 item, shared).** Filters, search, paging, export, row menu and the non-admin gate all behave to spec, and the sort is correct. The one miss is the same Vietnamese-copy gap as the Overview (FR-002). The Figma-vs-spec deviations are listed below and are accepted with reasons.

Method: viewport 1440×1024, DPR 1, standalone headless Chromium. Admin session `saa.admin.e2e`, non-admin `sunner01.demo`, `live` seed, checked before the reseed. DB read with read-only `psql`.

## Evidence

- Captures: `evidence/screens/admin-user/user-admin-run.png`, `user-default.png` (MCP, zoomed), `forbidden-user-run.png`, `row-menu-open.png`
- Figma: `docs/figma-refs/admin/admin-user.png`
- Raw: `evidence/admin-e2e/admin-verify-results.json`, `admin-directory-dropdowns-results.json`; scripts `evidence/admin-e2e/*.cjs`
- Full suite: `evidence/admin-e2e/full-suite-run.log` (137 passed, exit 0; includes `e2e/admin-overview-and-users.spec.ts`)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-201 / US004 twelve columns | PASS | ID, User, Email, ∑ sent, ∑ received, Total Heart, Level, Number of Badges, Time to get 6 Badges, Last Logged in, Role, Actions |
| FR-204 / US004 20 per page, pager "1–20 of 25 users" | PASS | Page 1 = 20 rows, page 2 = 5 rows, no overlap |
| US004 ordered by name A–Z (D013) | PASS | First 20 equal `ORDER BY name, id` from the DB, including Vietnamese names (Bùi, Đặng, Đinh, …) |
| US004 six-badge time shown only for 6 badges, else dash | PASS | Nguyễn Văn An "1d 11h 3m" (6 badges); others "-" |
| US004 never logged in shows dash | NOT VERIFIED | Every demo user has a last login; no row to test |
| US004 Role is text only, no control | PASS | Zero select or combobox controls in the table |
| FR-202 / US005 Unit filter | PASS | Unit CECV1 → 5 rows = DB CECV1 users (5) |
| FR-202 Unit + Role intersection | PASS | CECV1 + Admin → 0 (DB 0); CECV1 + User → 5 (DB 5) |
| FR-202 Level filter | PASS | Level filter per tier equals unfiltered tier counts: New Hero 13, Rising 1, Super 1, Legend 1; every row matches its tier |
| FR-203 / US005 suggest needs ≥2 chars | PASS | "N" → 0 options; "Ng" → 8 options |
| FR-203 Enter searches the typed text | PASS | "Ng" + Enter → 17 rows, all with "ng" in name or email |
| US005 no match → "no user matches" + Clear filters | PASS | Text and link shown; Clear restores 20 rows |
| FR-205 / US004 row menu, View profile | PASS | One item; click → `/profile/d0000000-0000-4000-8000-000000000001` |
| FR-403 / US006 export downloads every match, not one page | PASS | 25 data rows with no filter (DB 25); Content-Disposition `attachment; filename=saa-users-2026-11-28.csv` |
| US006 columns match table, no Actions | PASS | Header: ID, User, Email, Sent Kudos, Received Kudos, Total Heart, Level, Number of Badges, Time to get 6 Badges, Last Logged in, Role |
| US006 filtered export returns filtered rows only | NOT VERIFIED | Only the unfiltered export was downloaded |
| UTF-8 BOM | PASS | `EF BB BF` |
| FR-602 / US006 name starting with `= + - @` is text | NOT VERIFIED | No such name in the live seed; `leadingFormulaChars=0` only proves none appear |
| FR-601 non-admin: Access Denied, no data | PASS | `/admin/users` as `sunner01.demo` → Access Denied page; HTML has no user table or email |
| FR-601 non-admin API 403 | PASS | `/api/v1/admin/users` and `/users/export` → 403 |
| FR-002 Vietnamese copy | FAIL | `lang=vi` but heading and column labels stay English (see `verify-admin-overview.md`, fix 1–2) |
| Console / network | PASS | 0 console errors; no admin API response ≥400 during the admin run |

## Figma vs spec deviations

| Deviation | Verdict | Reason |
|-----------|---------|--------|
| ID shows `d0000000` for every demo user | Accept | D010: first 8 chars of the user id. Spec-correct, but on this seed the column identifies nobody. Flag for the spec owner |
| Level shows tier names (New Hero, Rising, Super, Legend) not "Level 1/2/3" | Accept | D005 defines Level as the hero tier |
| Time to get 6 Badges as a duration ("1d 11h 3m") | Accept | ALG-003 defines it as elapsed time |
| No sort arrows on headers | Accept | D013: no sortable headers |
| Header text wraps to two lines | Accept | Cosmetic; column widths fit the copy |
| Suggestion second line is the email, not the unit code | Accept | A5 in technical spec: suggestion shows avatar, name, email |
| Extra "All" option in each dropdown | Accept | Needed to clear one filter; Figma shows none |
| Pager under the table | Accept | FR-204 requires paging; placement not specified |
| Nav label "User" | Accept | D011 |

## Fix list (FAIL)

1. Apply the Vietnamese copy fixes from `verify-admin-overview.md` (fix 1 and 2): `vi/admin.json` `admin.users.*` and table-header keys, and `vi/shell.json` admin nav keys.
2. Add a live-seed name starting with `=` (or a unit-test equivalent) so FR-602 is exercised on the export path.
3. Decide whether the ID column should show something unique (for example the email local part or a short id that differs across users). D010 currently makes it identical for every demo user.

## Concerns

- Same session-token echo as the Overview report (MCP `run_code`). Rotate or revoke.
- The filtered export and the never-logged-in row were not exercised.


---

## Round 2 (P11 fix round 1)

**Final verdict: PASS.** The shared FR-002 copy FAIL is fixed. Filters, search, paging and export still pass in both languages. The Round 1 shared FAIL is closed.

Run: `evidence/admin-e2e/admin-round2-copy-behaviour.cjs` plus the two-spec run (29 passed, exit 0). The spec test `copy per language (FR-002)` and the suggest 401-to-Login test (review W2) both pass.

| Check | vi | en |
|-------|----|----|
| Column headers | ID, Người dùng, Email, ∑ Kudos đã gửi, ∑ Kudos đã nhận, Tổng tim, Level, Số huy hiệu, Thời gian đạt 6 huy hiệu, Đăng nhập lần cuối, Role, Thao tác | ID, User, Email, ∑ sent Kudos, ∑ Received Kudos, Total Heart, Level, Number of Badges, Time to get 6 Badges, Last Logged in, Role, Actions |
| Search placeholder | Tìm kiếm | Search |
| Filter triggers | Chọn phòng ban, Chọn Level, Chọn Role (match Figma VN) | Select unit, Select Level, Select Role |
| Page 1 rows / pager | 20 rows | 20 rows, "1–20 of 25 users" |
| Unit CECV1 | 5 rows (DB 5) | 5 rows (DB 5) |
| Unit CECV1 + Role Admin | 0 rows; empty state "Không có người dùng nào khớp bộ lọc. Xóa bộ lọc" | 0 rows; "No user matches your filters. Clear filters" |
| Export busy | Not stuck | Not stuck |

Copy judgement: "ID", "Email", "Level", "Role" and "Actions" stay English in vi, as in the Figma VN frame, so they are accepted. The search placeholder is translated (Figma shows "Search"); see the search-user report.

The ID column still shows `d0000000` for every demo user. Round 1 raised this as a spec-owner decision (D010). It is unchanged and is not a Round 2 FAIL.

Screenshots: `evidence/screens/admin-user/r2-user-vi.png`, `r2-user-en.png`, `r2-forbidden-user-vi.png`, `r2-forbidden-user-en.png`.

Fix list: none for this screen. Open item carried from Round 1: decide on the ID column (D010).
