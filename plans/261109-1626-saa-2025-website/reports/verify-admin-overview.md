# Verify: Admin Overview (F010, tracker row 56, `/admin`, `docs/figma-refs/admin/admin-overview.png`)

**Verdict: FAIL (1 item).** The Overview figures match the DB exactly and the date range, export, and access gate all pass. One spec miss: with the Vietnamese locale the admin copy stays in English, which breaks FR-002. Fix list at the end.

Method: viewport 1440×1024, DPR 1 in standalone headless Chromium (`.playwright-mcp/` scripts, moved to `evidence/admin-e2e/admin-verify.cjs`). Snapshots and the first screenshot came from the MCP browser, which is zoomed to 50% on `localhost`, so only the standalone captures are used for layout. Live `live` seed, admin session `saa.admin.e2e`, checked before the reseed. DB figures read with read-only `psql` in `supabase_db_saa-2025`.

## Evidence

- Captures (1440 viewport): `evidence/screens/admin-overview/overview-admin-run.png`, `overview-default.png` (MCP, zoomed), `date-picker-open.png`, `date-range-applied-nov1-8.png`
- Figma: `docs/figma-refs/admin/admin-overview.png`
- Raw results: `evidence/admin-e2e/admin-verify-results.json`, script `evidence/admin-e2e/admin-verify.cjs`
- Full suite (run after reseed): `evidence/admin-e2e/full-suite-run.log` — 137 passed, exit 0

## Figures vs DB (default range 2026-10-30 → 2026-11-28, Asia/Ho_Chi_Minh)

| Row | Members | Sent | Received | ≥1 kudo | Secret boxes | UI = DB |
|-----|---------|------|----------|---------|--------------|---------|
| All | 25 | 60 | 60 | 23 | 31 | yes |
| CECV1 | 5 | 15 | 8 | 5 | 11 | yes |
| CECV2 | 6 | 15 | 15 | 6 | 7 | yes |
| CECV3 | 6 | 15 | 30 | 5 | 9 | yes |
| CECV4 | 4 | 9 | 5 | 4 | 4 | yes |
| CECV5 | 3 | 6 | 2 | 3 | 0 | yes |

Range 2026-11-01 → 2026-11-08: UI shows 0 activity with headcounts intact; DB agrees (61 kudos in the whole seed, none before 2026-11-09).

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-101 All first, then one row per unit, seven columns | PASS | Headers and row order checked by script (`A1.headers`, `A1.rowsAllFirst`) |
| FR-102 / US001 figures cover the range, headcount is current | PASS | Table = DB for both windows (above) |
| FR-102 boundary: last day counted, next day not | NOT VERIFIED | Only the default window was compared to DB; no kudo sits on a boundary day in this run |
| FR-103 All counts each person once | PASS | All members 25 = DB distinct users; All row is not a sum of unit rows (23 vs unit sums) |
| US001 unit without activity shows 0, not blank | PASS | Nov 1–8 range: every value 0 |
| FR-104 / BR-006 missing, bad or reversed range falls back to default | PASS | `?from=bad` and `?from=<today>&to=<start-29d>` both show 2026-10-30 → 2026-11-28 |
| FR-001 / US007 header links, current link highlighted | PASS | Overview highlighted; links Overview, Review content, User, Settings |
| US002 pick start then end; end before start not accepted | PASS | Reversed end day renders `disabled`; URL unchanged |
| US002 applied range reloads table | PASS | URL `?from=2026-11-01&to=2026-11-08`, button text, rows all 0 |
| US002 quick ranges (D012) | PASS | Last 7 days, Last 30 days (pressed by default), This month, Custom |
| US003 / FR-402 export downloads a file | PASS | `saa-overview-2026-10-30_2026-11-28.csv`, status 200 |
| Content-Disposition readable (R06) | PASS | `attachment; filename=saa-overview-2026-10-30_2026-11-28.csv` |
| UTF-8 BOM | PASS | First bytes `EF BB BF` |
| CSV equals table | PASS | 6 rows, numbers identical in every row |
| US001 error: data cannot load, Retry shown | NOT VERIFIED | Needs a backend outage; not induced |
| N11 export fails mid-stream: no partial file, retry offered | NOT VERIFIED | Needs failure injection; not induced |
| FR-601 non-admin gets the Forbidden page | PASS | Page reads "Access Denied / The resource you're looking for doesn't exist or has been removed", same as `docs/figma-refs/user/error-403.png` |
| FR-601 non-admin API 403 | PASS | `GET /api/v1/admin/overview` and `/overview/export` return 403 for `sunner01.demo` |
| Signed out → Login | PASS | `/admin` → `/login?next=%2Fadmin` |
| FR-002 Vietnamese copy | FAIL | With `saa_locale=vi`, `<html lang="vi">` but the page reads "No / Unit / Total member … / Export / Review content". `src/i18n/dictionaries/vi/admin.json` keeps English values for `admin.overview.*` and `admin.export`; `vi/shell.json` keeps English for `shell.admin.nav.*` |
| Console | PASS | 0 errors. 2–3 warnings: `saa-logo.png` preloaded but not used (warning only) |
| Network / logs | PASS | No `/api/v1/admin` response ≥400 during the script; no new ERROR in `logs/api.log` from admin routes (two new "read current event" timeouts are the existing WSL pattern) |

## Deviations judged

| Deviation | Verdict | Reason |
|-----------|---------|--------|
| All row has no number; units numbered from 1 (Figma shows "1" on All) | Accept | Spec E07: "blank on the All row" |
| Header "Total users with at least one kudo" (Figma "Total user have atleast kudos") | Accept | D007 corrects the copy |
| "Total received kudos" (Figma "reveived") | Accept | Typo fix |
| Unit column shows the code (CECV1) with the name in a tooltip | Accept | Matches Figma unit placeholders "CECV1…"; no name column in spec |
| Date range sample "2020-11-08 → 2020-12-23" | Accept | Design sample; spec D001 default is last 30 days |
| Nav label "User" (Figma "Role") | Accept | D011 |
| Viewport zoom in MCP captures | n/a | Method limit, not an app issue |

## Fix list (FAIL)

1. `src/i18n/dictionaries/vi/admin.json`: replace every English value with Vietnamese copy. At minimum `admin.overview.*` (`col.no`, `col.unit`, `col.members`, `col.sent`, `col.received`, `col.withKudo`, `col.boxes`, `all`), `admin.export`, the title key, and the date-range labels. Take the strings from the copy owner; the Figma VN strings in the references are the starting point.
2. `src/i18n/dictionaries/vi/shell.json`: `shell.admin.nav.overview`, `shell.admin.nav.review`, and the User and Settings nav keys, currently English.
3. Re-run `npx playwright test e2e/admin-overview-and-users.spec.ts` with `saa_locale=vi` added to one case, so the VN copy is covered by a test.

## Concerns

- The admin session token was printed into the MCP transcript once (an MCP `run_code` call echoed the loader code; `filename` does not stop the echo). The `live` reseed followed by `npm run e2e:session` issued fresh cookies, but the earlier JWT remains valid until about 2026-12-04. Revoke it or rotate the session secret.
- Not run: the N11 export failure path and the US001 error state (both need failure injection). The formula-injection guard (FR-602) is not covered by the live seed (no name starts with `=+-@`).


---

## Round 2 (P11 fix round 1)

**Final verdict: PASS.** The Round 1 FAIL (FR-002 Vietnamese copy) is fixed. `vi/admin.json` and `vi/shell.json` now carry Vietnamese copy, and the export button no longer sticks busy. Round 1 behaviour still passes.

Run: `evidence/admin-e2e/admin-round2-copy-behaviour.cjs` (standalone; cookies read from disk and never printed) and `npx playwright test e2e/admin-overview-and-users.spec.ts e2e/login-and-admin-gate.spec.ts --workers=1` (29 passed, exit 0; `evidence/admin-e2e/round2-two-specs-run.log`).

| Check | vi | en |
|-------|----|----|
| Nav links | Tổng quan, Duyệt nội dung, Người dùng, Cài đặt (current: Tổng quan) | Overview, Review content, User, Settings (current: Overview) |
| Heading | Tổng quan | Overview |
| Column headers | STT, Đơn vị, Tổng thành viên, Tổng Kudos đã gửi, Tổng Kudos đã nhận, Số người có ít nhất 1 Kudos, Tổng Secret Box đã nhận | No, Unit, Total member, Total sent kudos, Total received kudos, Total users with at least one kudo, Total received secret box |
| Export button | Xuất file (not busy after download) | Export (not busy after download) |
| Figures | All 25/60/60/23/31; CECV1 5/15/8/5/11 (same as Round 1 DB check) | same |
| Forbidden (non-admin) | Không có quyền truy cập | Access Denied |

Copy judgement: "Level", "Role", "Admin/User", "ID", "Email", "ADMIN" and "Secret Box" stay English in vi. The Figma VN frame (`docs/figma-refs/admin/admin-user.png`, VN flag) shows those labels in English, so they are accepted as Figma-backed.

Screenshots: `evidence/screens/admin-overview/r2-overview-vi.png`, `r2-overview-en.png`; non-admin: `evidence/screens/admin-user/r2-forbidden-user-vi.png`, `r2-forbidden-user-en.png`.

Round 1 NOT VERIFIED items now covered: the failed-export path (N11) is test 4 of the admin spec and passes. The US001 error-state Retry is not in the spec and was not run.

Fix list: none for this screen.
