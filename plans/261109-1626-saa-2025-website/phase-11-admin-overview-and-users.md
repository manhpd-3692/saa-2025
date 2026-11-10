# Phase 11 — Admin overview and user directory (F010)

## Context Links
- F010: `spec/admin-overview-and-user-directory/{functional-spec.md, technical-spec.md}`; screens `SCR-admin-overview`, `SCR-admin-users`
- Contract: R05, R06 (exposed `Content-Disposition`), R16, R23 (exports 20 s); Addendum N11. Decisions: G02, AD10, X02, X07
- `spec/system/permissions.md`; F002 `RequireAdmin`; F008 tier/box reads (P8)
- Figma: admin overview / users frames (docs/SCREENFLOW.md, Admin)

## Overview
- Priority: P3. Status: pending. Effort: 9h.
- Checklist: outside the 8 categories (admin).
- `/admin` overview by unit with date range (default last 30 days) + CSV export; `/admin/users` directory with
  unit/level/role filters, search suggest, paging, row menu (View profile), CSV export.

## Key Insights
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
- [ ] Overview queries + handler
- [ ] Users list + suggest
- [ ] CSV streaming exports
- [ ] Admin pages UI
- [ ] Tests

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
- Unblocks P12, P13. Open items: copy to confirm ("Could not load the data. Try again.", "No user matches your filters.", "You do not have access to this page."); index need on `kudos(created_at)` measured in P14.
