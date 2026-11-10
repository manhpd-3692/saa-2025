# Phase 13 — Admin campaign settings (F012)

## Context Links
- F012: `spec/admin-campaign-settings/{functional-spec.md, technical-spec.md}`; screens `SCR-admin-campaign-settings`, `SCR-admin-campaign-form`
- Contract: R09 (lookup consumer F008). Decisions: G14, AD12 (D002–D011), X04
- Schema from P1 (`campaigns` checks, `hearts.campaign_id on delete set null`); F008 `CampaignReader` (P2)
- Figma: admin settings / campaign form frames (docs/SCREENFLOW.md, Admin)

## Overview
- Priority: P3. Status: pending. Effort: 6h.
- Checklist: outside the 8 categories (admin); feeds **Like Kudos** x2 campaign behaviour.
- `/admin/settings`: campaign table (start desc, `DD/MM/YYYY - HH:mm`, "x{n}" name tag + hover hint), add/edit
  modal (name 1–100, start/end, multiplier 2–10 default 2), delete confirmation; Go CRUD with validation.

## Key Insights
- Times typed in Asia/Ho_Chi_Minh, stored as instants; `ends_at` exclusive in F008 lookup (SC-006, RISK-03).
- Overlaps allowed; highest multiplier wins (G14, D002). Edit conflicts: last write wins (AD12).
- Delete never touches hearts' weight; `campaign_id` → null by FK (X04).
- Deleted elsewhere → 404 + message + refresh (DEC-002).

## Requirements
- FR-002, FR-101–FR-103, FR-201–FR-203, FR-401–FR-405, FR-601, FR-602, BR-001–BR-007, INT-001, US001–US004; SC-001–SC-008.

## Architecture
```
/admin/settings (server) → GET /api/v1/admin/campaigns → CampaignTable (+ RowMenu)
CampaignFormModal → POST | PATCH /api/v1/admin/campaigns[/id] → 422 field errors | router.refresh()
DeleteCampaignDialog → DELETE /api/v1/admin/campaigns/{id} → 204 | 404 refresh
Go CampaignService: BR-001..003 validation, BR-007 local-time parsing → campaigns.sql
```

## Related Code Files
Create (backend)
- `backend/internal/campaign/{campaign_handler.go, campaign_service.go, campaign_time_parsing.go}`, `backend/cmd/api/wire_campaign.go`, `backend/db/queries/campaigns.sql`
Create (frontend)
- `src/app/admin/settings/page.tsx`
- `src/features/campaigns/{campaign-table.tsx, campaign-row-menu.tsx, campaign-form-modal.tsx, date-time-field.tsx, delete-campaign-dialog.tsx, campaigns-api.ts}`
- `src/i18n/dictionaries/{vi,en}/campaigns.json`
- Tests: `backend/internal/campaign/campaign_time_parsing_test.go`, `backend/internal/campaign/campaign_integration_test.go`, `e2e/admin-campaign-settings.spec.ts`

## Implementation Steps
1. Validation + time parsing (unit tests incl. 23/12/2025 10:00 ICT).
2. CRUD handlers (ADMIN class), 404 on missing id.
3. Table + form modal + delete dialog from Figma; Escape on dirty form discards.
4. Tests incl. heart weight survival.

## Todo List
- [ ] Validation + time parsing
- [ ] CRUD endpoints
- [ ] Settings UI
- [ ] Tests

## Success Criteria (test plan)
- Go unit: SC-006 parsing; BR-001–BR-003 rules.
- Go integration: SC-002 (422 per field), SC-004 (403/401), SC-005 (heart keeps weight 2 after edit/delete), SC-006 (F008 lookup boundary), SC-007 (404 after delete elsewhere).
- Playwright: SC-001, SC-003, SC-008; add x2 campaign → heart on board counts 2 (Like Kudos cross-check).

## Scope Contract
- Changed: campaign Go package, settings UI.
- Impacted: F008 heart weighting (reads `campaigns`).
- Will verify: Go unit/integration (admin authz + data mutation → full), Playwright for modal flow; re-run F008 SC-003/SC-010 because the lookup's input data now comes from this UI.
- Deliberately skipped: other admin pages.

## Risk Assessment
| Risk | L | I | Mitigation |
|---|---|---|---|
| Time-zone edge mis-weight (RISK-03) | M | M | Shared exclusive-end rule; SC-006 |
| Multiplier column absent in design (RISK-01) | — | L | Name tag + hover hint (D001) |
| Copy drift (RISK-04) | H | L | Listed copy to confirm |

## Security Considerations
- ADMIN route class on all four endpoints; DB check constraints back the Go validation.

## Rollback
- Revert commits; campaigns can still be seeded via SQL; hearts unaffected.

## Next Steps
- Open items (copy to confirm): "Enter a campaign name.", "Name is too long (max 100).", "End must be after start.", "Enter a whole number from 2 to 10.", "Choose a start/end date and time.", "This campaign no longer exists.", "Could not save. Try again.", "Could not delete, try again.", "No campaigns yet.", "Could not load the data. Try again.".
