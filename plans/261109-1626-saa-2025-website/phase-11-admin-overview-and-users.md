# Phase 11 — Admin overview and user directory (F010)

## Context Links
- F010: `spec/admin-overview-and-user-directory/{functional-spec.md, technical-spec.md}`; screens `SCR-admin-overview`, `SCR-admin-users`
- Contract: R05, R06 (exposed `Content-Disposition`), R16, R23 (exports 20 s); Addendum N11. Decisions: G02, AD10, X02, X07
- `spec/system/permissions.md`; F002 `RequireAdmin`; F008 tier/box reads (P8)
- Figma: admin overview / users frames (docs/SCREENFLOW.md, Admin)

## Overview
- Priority: P3. Status: **complete (7e263ad, pushed to `feat/saa-screens`)**. Effort: 9h. Delivery below.
- Checklist: outside the 8 categories (admin).
- `/admin` overview by unit with date range (default last 30 days) + CSV export; `/admin/users` directory with
  unit/level/role filters, search suggest, paging, row menu (View profile), CSV export.

## Key Insights
- (From P3 review W3, **closed in P11**) `admin/layout.tsx` checks the role once per layout mount, so a demoted admin keeps the admin chrome until a reload. Every admin page now treats a Go 403 as "show Forbidden" and a Go 401 as "go to Login". `src/app/admin/page.tsx` was a P3 placeholder and was edited, not created.
- Spam excluded; "with kudo" = sent or received; All row first, includes users without unit (D002, D003).
- Total Heart = weighted `kudo_heart_state` over received public kudos (same as F007, X07); Level from F008 tier read; badges/time-to-6 from opened box icons (ALG-003).
- Export streaming (N11): headers only after first page read OK; late failure aborts connection; browser saves only a complete blob, else retry.
- Shared admin UI pieces built here (`date-range-picker`, `admin-pager`, `export-button`) are reused read-only by P12/P13.
- Owns `src/features/admin/admin-nav-items.ts` from here on (created in P3).

## Requirements
- FR-001, FR-002, FR-101–FR-104, FR-201–FR-207, FR-401–FR-403, FR-601, FR-602, BR-001–BR-008, ALG-001–ALG-003, INT-001, US001–US007; SC-001–SC-009.

## Architecture
```
/admin?from&to (server) → GET /api/v1/admin/overview → OverviewTable ; DateRangePicker → client nav
ExportButton → fetch …/overview/export (Bearer) → blob after full body → save (Content-Disposition)
/admin/users?unit&level&role&q&page → GET /api/v1/admin/users → UsersTable + Pager ; UserSearchBox → pageSize=8
Go AdminReportService → admin_reports.sql + F008 HeroTierService/SecretBoxService reads → CSV writer (ALG-002, stream)
```

## Related Code Files
Create (backend)
- `backend/internal/admin/{admin_overview_handler.go, admin_users_handler.go, admin_report_service.go, csv_stream_writer.go}`, `backend/cmd/api/wire_admin_reports.go`, `backend/db/queries/admin_reports.sql`
Create (frontend)
- `src/app/admin/page.tsx`, `src/app/admin/users/page.tsx`
- `src/features/admin/{overview-table.tsx, date-range-picker.tsx, export-button.tsx, admin-pager.tsx, user-filter-bar.tsx, user-search-box.tsx, users-table.tsx, user-row-menu.tsx, admin-reports-api.ts}`
- `src/i18n/dictionaries/{vi,en}/admin.json`
- Tests: `backend/internal/admin/admin_reports_integration_test.go`, `backend/internal/admin/csv_stream_writer_test.go`, `src/features/admin/export-button.test.tsx`, `e2e/admin-overview-and-users.spec.ts`
Modify (only if needed): `src/features/admin/admin-nav-items.ts`

## Implementation Steps
1. Overview queries (by unit + All) honouring D002/D003; range parsing/clamp (BR-006).
2. Users list with filters, search, paging clamp, level/badges via F008 reads.
3. CSV writer (ALG-002) + streaming with N11 semantics; 20 s export ctx.
4. Pages + components from Figma; ExportButton blob-only save + retry.
5. Tests.

## Todo List
- [x] Overview queries + handler
- [x] Users list + suggest
- [x] CSV streaming exports
- [x] Admin pages UI
- [x] Tests

## Success Criteria (test plan)
- Go integration: SC-001 (spam excluded, All, empty unit zeros), SC-002 (edge days, CSV = screen), SC-003 (table = suggest = export), SC-004 (403/401 matrix), SC-007 (Total Heart weighted), SC-009 (late export failure aborts, N11).
- Playwright: SC-006 (one nav item active), SC-008 (cross-origin download with server filename via exposed `Content-Disposition`).
- Go unit: SC-005 CSV formula neutralising + BOM (ALG-002, BR-004).
- Vitest: ExportButton saves only on complete body, shows retry on abort.
- Playwright: range apply, filters, paging, export download as admin; user role sees Forbidden page.

## Scope Contract
- Changed: admin reports Go package, admin overview/users pages, shared admin UI pieces.
- Impacted: P12/P13 reuse picker/pager; admin nav.
- Will verify: Go integration (authz = safety-critical → full admin authz matrix), Vitest for export, Playwright for flows.
- Deliberately skipped: F008 tier logic (P2/P8 tests own it).

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Admin data leak via missing role check (RISK-02) | L | H | ADMIN route class only; authz matrix test |
| Definition drift vs F008 (RISK-01) | M | M | Call F008 shared reads, no second definition |
| Large export memory | L | M | Stream rows; no buffering |

## Security Considerations
- Emails visible to admins only; formula-like cells neutralised with a leading apostrophe, UTF-8 BOM (BR-004, ALG-002, SC-005).

## Rollback
- Revert commits; admin pages disappear behind nav; no schema change.

## Next Steps
- Unblocks P12, P13. Open items: see Delivery → Open carry-overs. The `kudos(created_at)` index need is still for P14 to measure.

## Delivery
Commit `7e263ad` (pushed to `feat/saa-screens`). Screen tracker rows 56–61 Done (PASS, sha `7e263ad`). Review: `reports/reviewer-phase-11.md` (first pass and recheck after fix round 1): 0 critical. W1, W2 and W3 closed; S1–S5 open and optional. Status DONE, with the open items below.

**Done**
- Overview by unit plus an All row, default last 30 days (Asia/Ho_Chi_Minh), range picker with quick ranges, pager-free table, CSV export. Spam excluded; "with kudo" = sent or received; All counts each person once.
- Directory with twelve columns, unit, level (hero tier), role and search filters, suggest after 2 characters (401 → Login, 403 → reload), 20 per page, row menu "View profile", CSV export of every match with no Actions column.
- Export streams under N11: headers only after the first page reads OK; a late failure aborts the connection; the browser saves only a complete blob; the button shows retry.
- CSV formula neutralising and UTF-8 BOM (ALG-002, SC-005); `Content-Disposition` exposed via CORS (R06).
- Authz: all four F010 routes sit behind `RequireAdmin`. Verified: a non-admin gets Forbidden and 403 on the API; no token gets 401.
- Admin pages treat Go 403 as Forbidden and 401 as Login (closes P3 W3, see Key Insights).
- Vietnamese copy across the admin chrome, filters and table (round 1 FR-002 fix). Level, Role, Admin/User, ID, Email, ADMIN, Kudos and Secret Box stay English in vi, as in the Figma VN frames.
- Index `users_name_id_idx (name, id)` (migration `20261128080000`). EXPLAIN at 20,025 users / 60,068 kudos: first page 859 → 1.8 ms; export page 377 → 28 ms.
- Shared admin pieces (`date-range-picker`, `admin-pager`, `export-button`) ready for P12/P13 to reuse read-only.

**Fix rounds per screen** (tracker rows 56–61)

| Screen | Row | Fix rounds | Defect fixed |
|--------|-----|------------|--------------|
| A1 Admin - Overview | 56 | 1 | FR-002: admin copy stayed English under `lang=vi`; `vi/admin.json` and `vi/shell.json` translated. Round 2 PASS |
| A4 Admin - User | 57 | 1 | Same FR-002 copy gap; round 2 PASS |
| Dropdown search user | 58 | 1 | Same FR-002 copy gap (placeholder "Tìm kiếm"); round 2 PASS |
| Dropdown phòng ban | 59 | 1 | Same FR-002 copy gap (trigger "Chọn phòng ban"); round 2 PASS |
| Dropdown level | 60 | 1 | Same FR-002 copy gap (trigger "Chọn Level"); round 2 PASS |
| Dropdown Role | 61 | 1 | Same FR-002 copy gap (trigger "Chọn Role"); round 2 PASS |

**Checks on final code** (`7e263ad`), as reported by the orchestrator (outputs not saved under `evidence/`)
- sqlc diff 0; gofmt clean; `go vet` 0; `go test` 0; `go test -tags integration` 0.
- Typecheck 0; lint 0; vitest 421; `next build` 0.
- Playwright full suite 139/139 (1 worker) on final code. The saved log `evidence/admin-e2e/full-suite-run.log` is the round-1 run (137 passed) and predates the fix; see carry-over 7.
- Admin spec and P3 gate spec (`admin-overview-and-users.spec.ts`, `login-and-admin-gate.spec.ts`) 29/29 on re-verify: `evidence/admin-e2e/round2-two-specs-run.log`.
- The demotion e2e ("an admin demoted while the admin page is open", P3 W3) is in the admin spec and passes in that run.
- `-race` not run.

**Review** (`reports/reviewer-phase-11.md`)
- First pass: 0 critical, 3 warnings, 5 suggestions. W1 export stuck busy → `runExport` treats every failure as `failed` and state ends in `finally`. W2 suggest 401 → shared `classifyAdminCallFailure` / `loginHref` (401 → Login, 403 → reload); `next` re-validated by `safeNext`. W3 query cost → `users_name_id_idx`.
- Recheck: W1–W3 closed; no new defects. S1–S5 unchanged (carry-over 8).

**Deviations from plan**

| # | Deviation | Reason | Cost |
|---|-----------|--------|------|
| 1 | Admin copy in Vietnamese; terms kept English per Figma VN frames (Level, Role, Admin/User, ID, Email, ADMIN, Kudos, Secret Box) | FR-002; Figma VN frames show these in English | Copy owner to confirm (carry-over 2) |
| 2 | CSV headers English; "All" written in CSV | Export is a data artefact, not screen copy (D007 column order) | Vietnamese-locale users get English CSV headers |
| 3 | All row unnumbered | E07: blank on the All row | None |
| 4 | ID = first 8 chars of user id | D010 | All demo users show `d0000000`; column identifies nobody on the seed (carry-over 1) |
| 5 | Level shown as tier names (New Hero, Rising, Super, Legend) | D005 | Figma "Level 1/2/3" not reproduced |
| 6 | "Time to get 6 badges" as elapsed duration | ALG-003 | Figma wording differs |
| 7 | No sortable headers | D013 | None |
| 8 | Suggestion second line is email, not unit code | A5 (technical spec) | Figma shows unit code |
| 9 | Extra "All" option in each filter dropdown | Needed to clear a filter | Figma has none |
| 10 | Pager under the table | FR-204 requires paging; placement unspecified | None |
| 11 | Overview unit column shows code with name in a tooltip | Figma unit placeholders are codes; no name column in spec | Name only on hover |
| 12 | Directory counts public kudos including anonymous ones | Spec silent | Admin-only figures; spec owner to confirm |
| 13 | Suggestions apply the current filters | Shipped behaviour; verified against table and export (SC-003) | Suggest list narrower than the whole directory when filters are set |
| 14 | Forbidden page renders inside admin chrome on a page-load 403 | Admin layout shell already mounted | Shared admin layout behaviour |
| 15 | `HeroTierSenderRange` added to `gamification/hero_tier.go` | Count of senders per tier for the Level filter; pure addition, `HeroTierFor` unchanged | Shared F008 file touched (reviewer checked) |
| 16 | `e2e/login-and-admin-gate.spec.ts` expected nav strings changed to Vietnamese | Locale now vi | Equally strict assertions |
| 17 | Admin integration fixtures dated Feb 2003 | Fixes a cross-package flake | Test-only |

**Open carry-overs**

| # | Item | Owner | Done when |
|---|------|-------|-----------|
| 1 | D010: ID column shows the same `d0000000` for every demo user | Spec owner (user) | Decision logged in `spec/admin-overview-and-user-directory/`; column changed or accepted in writing |
| 2 | Copy: confirm kept-English terms (deviation 1) and VN error strings ("Could not load the data. Try again.", "No user matches your filters.", "You do not have access to this page.") | Copy owner (user) | Wording approved or updated in `vi/admin.json`, `en/admin.json` |
| 3 | Local test-session JWT `saa.admin.e2e` (local Supabase, valid until about 2026-12-04) was echoed into a tester transcript in round 1 | User | Session secret or local signing key rotated, or the risk accepted in writing |
| 4 | Not exercised live: US001 Retry, filtered users export, day-boundary count (FR-102), page-load 401 redirect (code-reviewed, not e2e) | Tester (P14) | Driven in the P14 run; results under `evidence/` |
| 5 | FR-602 formula guard live: no seed name starts with `=`, `+`, `-` or `@`; covered by Go unit tests only | Tester (P14) | Seed name or e2e case added, or Go unit coverage accepted as sufficient |
| 6 | Deep-page OFFSET cost: page 500 still about 0.5 s (inside the 5 s deadline) | P14 owner | Measured at realistic size; keyset paging considered if it grows |
| 7 | Go, vitest and the 139/139 Playwright outputs not saved under `evidence/`; saved full-suite log is round 1 (137) | Tester | Outputs saved on `7e263ad`; counts match this section |
| 8 | Reviewer suggestions S1–S5: S1 unbounded date range (optional clamp), S2 LF in formula leaders, S3 two definitions of distinct senders (keep a count-equals-list test), S4 count and list not in one snapshot, S5 none needed | Implementer (P11) | Each fixed or accepted in writing |
| 9 | Reverse proxy may buffer or normalise aborted chunked exports, which would hide truncation from the browser (N11 verified on direct Go only) | P14 / infra owner | Checked against the deployed proxy path |
| 10 | `-race` not run | User / CI | `go test -race` exit 0 on a host with gcc or in CI |
