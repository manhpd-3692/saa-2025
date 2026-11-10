---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# Functional Spec — F012_AdminCampaigns

**Priority**: P3
**Type**: ui

**See also:** [`technical-spec.md`](./technical-spec.md) — planned handlers, validation, data table, configuration.

## 1. Overview

**Problem:** The kudos event runs heart-boost promotions such as "Campaign x2 heart", but nobody can set up, change or end one without a developer touching the database. Hearts given during a promotion must count extra (F008), so the promotion window and size must be exact.
**Solution:** One admin Settings page that lists all campaigns (ID, name, start and end time) and lets an admin add a campaign, edit it in a form, or delete it after a confirmation. A campaign has a name, a start date-time, an end date-time and a heart multiplier (for example x2). F008 reads the running campaign when a heart is given; this feature only manages the list.
**Scope:** Campaign list; Add Campaign form; Edit Campaign form with date-time picker; row Actions menu (Edit, Delete); delete confirmation popup; validation of name, period and multiplier.
**Non-Scope:** Applying the multiplier to hearts, heart totals, secret box progress and the campaign badge on user screens (F008); the admin gate, roles and admin header (F002, F010, F001); announcing a campaign to Sunners or notifying them (F009, not planned); campaign reports or history of who changed what; campaigns of any kind other than heart multipliers; mobile and tablet layouts.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | signed-in Sunner with the admin role | create, change and remove heart-boost campaigns |
| Sunner | signed-in user without the admin role | none here — is told "no access" if they reach the Settings address (F001, F002); sees the effect of a campaign through F008 |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Manage heart-boost campaigns | See all campaigns, add one, edit one, delete one after confirming | US001, US002, US003, US004 | FR-002, FR-101, FR-102, FR-103, FR-201, FR-202, FR-203, FR-401, FR-402, FR-403, FR-404, FR-405, FR-601, FR-602 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-006, BR-007, DEC-001, DEC-002, SM-001 | TBD (draft) |

Cross-cutting: FR-601 and BR-006 (every Settings page and every change checks the admin role) apply to all actions.

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Does the form have a multiplier field, and which values are allowed? | Yes: a whole number from 2 to 10, default 2, stored in `campaigns.multiplier`. The design's list has no multiplier column, so the list keeps its columns and shows the value as an "x{n}" tag after the name, with a hover hint "Heart multiplier x{n}" — resolved (G14) | Gives F008 an explicit number to weight hearts with | no |
| D002 | May two campaigns overlap in time? | Yes, no block; while they overlap the highest multiplier wins — resolved (applied default AD12; G14) | Blocking would force admins to end one early; F008 applies the highest multiplier | no |
| D003 | May a running or ended campaign be edited or deleted? | Yes; hearts already given keep the weight they were given with — resolved (applied default AD12) | F008 fixes the weight at heart time, so a change affects only later hearts | no |
| D004 | Is delete permanent? | Yes, the row is removed; hearts that referenced it stay with their fixed weight and their `campaign_id` becomes empty (`on delete set null`) — resolved (applied default AD12; X04) | No archive need was stated; heart counts are unaffected | no |
| D005 | What does the "ID" column show? | First 8 characters of the campaign id, as F010 does for users — resolved (applied default AD12) | No human-readable code exists in the data model | no |
| D006 | List order | Newest start first — resolved (applied default AD12) | The admin cares most about current and upcoming campaigns | no |
| D007 | Time zone and boundary for entered times | Asia/Ho_Chi_Minh; a campaign counts from its start time up to, not including, its end time — resolved (applied default AD12) | Event is in Vietnam; matches the rule F008 reads with | no |
| D008 | May a campaign start in the past? | Yes — resolved (applied default AD12) | Allows correcting a window after the fact; only later hearts are affected | no |
| D009 | Paging, search or filter on the list | None; the list shows all campaigns — resolved (applied default AD12) | Few campaigns exist per event | no |
| D010 | Exact copy and Vietnamese text of labels and messages | Use the design's English labels ("Setting", "Add Campaign"); other copy as proposed here, Vietnamese supplied with the dictionaries — resolved (applied default AD12) | Frame text was read from the screen flow notes only | no |
| D011 | Does a campaign show a status (Upcoming / Running / Ended) in the list? | No; the Time column is enough — resolved (applied default AD12) | The design lists no status column | no |

## 4. Requirements

### Foundation (0xx)

- **FR-002** All Settings text appears in Vietnamese or English according to the chosen language.

### Campaign list (1xx)

- **FR-101** Settings shows the title "Setting", an "Add Campaign" button and a table with columns ID, Name, Time (start and end) and Actions; the Name cell ends with the campaign's multiplier as an "x{n}" tag, and hovering the row's name shows "Heart multiplier x{n}" (the design has no multiplier column).
- **FR-102** Rows are ordered by start time, newest first, and each time reads like "23/12/2025 - 10:00".
- **FR-103** When no campaign exists the table is replaced by an empty message and the Add Campaign button stays available.

### Campaign form (2xx)

- **FR-201** "Add Campaign" opens a form with name, start date-time, end date-time and heart multiplier; name and dates are empty and the multiplier is preset to 2.
- **FR-202** "Edit" opens the same form filled with that campaign's current values.
- **FR-203** Start and end are chosen with a date picker plus a time input.

### Interaction (4xx)

- **FR-401** Saving a valid form closes it and the list shows the new or changed campaign.
- **FR-402** Saving an invalid form keeps it open, marks each wrong field with a message, and saves nothing.
- **FR-403** Closing the form without saving, with Cancel, the close icon or Escape, discards what was typed and changes nothing.
- **FR-404** "Delete" opens a confirmation popup naming the campaign; confirming removes it and refreshes the list; cancelling changes nothing.
- **FR-405** Each row has an Actions (⋯) menu with two items, Edit and Delete.

### Security (6xx)

- **FR-601** Only admins can open Settings or change campaigns; anyone else is refused.
- **FR-602** Every rule on the form is checked again by the backend, whatever the browser allowed.

## 5. Business Rules

- A campaign needs a name of 1 to 100 characters after trimming spaces (BR-001).
- The end must be later than the start (BR-002).
- The multiplier is a whole number from 2 to 10; a new campaign starts with 2 (BR-003).
- Campaigns may overlap; while they do, a heart takes the highest multiplier among the campaigns running at that instant; with none running it counts 1, but if the campaign check fails the heart is refused rather than counted at 1 (F008, Codex R09) (BR-004).
- Editing or deleting a campaign never changes hearts already given; they keep the weight they were given with, and a deleted campaign's hearts stay with no campaign link (BR-005).
- Every Settings page and every add, edit or delete checks the admin role on its own in the backend — hiding a button is not protection (BR-006).
- Times are typed and shown in Asia/Ho_Chi_Minh; a campaign counts from its start time up to, not including, its end time (BR-007).
- An empty list shows "no campaigns yet"; a failed load shows an error with Retry (DEC-001).
- Editing or deleting a campaign that another admin already deleted shows "campaign no longer exists" and refreshes the list (DEC-002).
- The form moves from closed, to open, to saving, then back to closed on success or open with errors on failure (SM-001).

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Admin - Setting | TBD (draft) | admin header, title "Setting", Add Campaign button, campaign table, row menu, delete confirmation popup | add, open row menu, edit, delete |
| Admin - Setting - Campaign form (add / edit) | TBD (draft) | modal with name, start, end, multiplier, date picker, Save and Cancel | fill, save, cancel |

The row Actions menu and the delete confirmation popup are overlays of the Settings screen. The date picker is an overlay of the form.

### User Journey

1. Admin opens Settings from the admin header — the campaign list opens, newest first.
2. Admin clicks "Add Campaign", fills name, start, end and multiplier, saves — the list shows the new campaign.
3. Admin opens a row's ⋯ menu, picks Edit, changes the end time, saves — the row shows the new time.
4. Admin opens the ⋯ menu, picks Delete, confirms — the row disappears.

## 7. User Stories

### US001 — See all campaigns

**Actor:** Admin
**Goal:** See every heart-boost campaign with its period.
**Business value:** Knows what is running, what is planned and what ended, before changing anything.

**Acceptance Criteria:**
- [ ] The table shows ID, Name (with an "x{n}" multiplier tag) and Time for each campaign, newest start first.
- [ ] Times read "23/12/2025 - 10:00" for start and end.
- [ ] With no campaigns an empty message shows and Add Campaign still works.

### US002 — Add a campaign

**Actor:** Admin
**Goal:** Set up a campaign with a name, a period and a multiplier.
**Business value:** A promotion such as "x2 heart" starts and ends on time without a developer.

**Acceptance Criteria:**
- [ ] The form asks for name, start, end and multiplier; the multiplier starts at 2.
- [ ] Wrong values are marked and nothing is saved.
- [ ] After saving, the list shows the campaign.

### US003 — Edit a campaign

**Actor:** Admin
**Goal:** Correct or extend a campaign.
**Business value:** A mistake in a period or multiplier is fixed in minutes.

**Acceptance Criteria:**
- [ ] The form opens with the current values.
- [ ] The same rules as adding apply.
- [ ] Hearts already given keep their weight.

### US004 — Delete a campaign

**Actor:** Admin
**Goal:** Remove a campaign that is wrong or no longer wanted.
**Business value:** A mistaken campaign stops boosting hearts at once.

**Acceptance Criteria:**
- [ ] A confirmation popup names the campaign before anything is removed.
- [ ] Confirming removes the row; cancelling keeps it.
- [ ] Hearts already given keep their weight and stay counted.

## 8. Scenarios

### US001 — Happy Path

**Given** two campaigns exist, **When** the admin opens Settings, **Then** both show with ID, name, start and end, the later start first.

### US001 — Error: list cannot be loaded

**Given** the backend does not answer, **When** the admin opens Settings, **Then** an error message with Retry replaces the table and the header still works.

### US002 — Happy Path

**Given** the admin clicked Add Campaign, **When** the admin enters "Campaign x2 heart", start 23/12/2025 10:00, end 24/12/2025 10:00, multiplier 2 and saves, **Then** the form closes and the list shows the campaign.

### US002 — Error: end before start

**Given** the form is filled with an end earlier than the start, **When** the admin saves, **Then** the end field shows "End must be after start", the form stays open and nothing is saved.

### US003 — Happy Path

**Given** a campaign ends 24/12/2025 10:00, **When** the admin edits the end to 25/12/2025 10:00 and saves, **Then** the row shows the new end time.

### US003 — Error: campaign was deleted meanwhile

**Given** another admin deleted the campaign, **When** the admin saves the edit, **Then** a message says the campaign no longer exists and the list refreshes without it.

### US004 — Happy Path

**Given** the admin picked Delete on "Campaign x2 heart" and Sunners gave hearts during it, **When** the admin confirms, **Then** the popup closes, the row is gone and those hearts still count with weight 2.

### US004 — Error: delete fails

**Given** the server fails while deleting, **When** the admin confirms, **Then** the popup shows "Could not delete, try again", the row stays and the admin may retry.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Name is empty or only spaces | Field marked, nothing saved | "Enter a campaign name." *(copy to confirm)* |
| Name longer than 100 characters | Field marked, nothing saved | "Name is too long (max 100)." *(copy to confirm)* |
| End equal to or before start | Field marked, nothing saved | "End must be after start." *(copy to confirm)* |
| Multiplier cleared, not a whole number, below 2 or above 10 | Field marked, nothing saved | "Enter a whole number from 2 to 10." *(copy to confirm)* |
| Two campaigns overlap | Both saved; hearts given while they overlap take the higher multiplier | None — silent handling |
| Campaign with hearts is deleted | Hearts stay with their weight; their campaign link becomes empty | None — silent handling |
| Admin edits or deletes the campaign that is running now | Allowed; hearts given before keep their weight, later hearts use the new values or none | None — silent handling |
| Two admins save the same campaign at nearly the same time | The last save wins | None — silent handling |
| Campaign already deleted by another admin | Action refused, list refreshed | "This campaign no longer exists." *(copy to confirm)* |
| Non-admin opens the Settings address or sends a change request directly | Refused, nothing returned or changed | "You do not have access to this page." *(copy to confirm)* |
| Save or delete fails (database or network) | Form or popup stays open with the values kept; nothing changed | "Could not save. Try again." *(copy to confirm)* |
| Double click on Save | Saved once | None — silent handling |

## 10. Edge Behaviours to Verify

- **FR-101** → the table has exactly the columns ID, Name, Time, Actions and an Add Campaign button; a x3 campaign's name shows "x3".
- **FR-102** → two campaigns with different starts appear newest first; a time reads "DD/MM/YYYY - HH:mm".
- **FR-103** → with no rows the empty message shows and Add Campaign opens the form.
- **FR-201** → the Add form opens with name and dates empty and the multiplier at 2.
- **FR-202** → the Edit form opens with the stored name, start, end and multiplier.
- **FR-203** → a day can be picked on a calendar and a time typed or chosen for both start and end.
- **FR-401** → after a valid save the form is closed and the list already shows the change without a manual reload.
- **FR-402** → an invalid form never reaches the list and each wrong field has its own message.
- **FR-403** → typing then pressing Escape leaves the list unchanged.
- **FR-404** → cancelling the delete popup keeps the row; confirming removes it.
- **FR-405** → the ⋯ menu offers exactly Edit and Delete.
- **FR-601** → a user-role account gets "no access" on Settings and on every change request sent directly.
- **FR-602** → a request with end before start, built by hand, is rejected by the server.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | The multiplier field (2 to 10, default 2) is settled, but the design frames show no place for it in the list; it is shown as a name tag with a hover hint | Small layout change if design adds a column later | [EXPECTED] decided in D001 |
| RISK-02 | risk | F008's `hearts.campaign_id` points at `campaigns`; deleting a campaign must not delete or block hearts | Heart history lost, or delete refused | [EXPECTED] mitigated: `hearts.campaign_id` is nullable with `on delete set null` in F008's model |
| RISK-03 | risk | A wrong time zone or an end boundary read differently here and in F008 would give a heart the wrong weight at the edges | Hearts counted x1 or x2 by mistake near start or end | [EXPECTED] mitigated by BR-007 |
| RISK-04 | risk | Exact visual values and Vietnamese copy of the row menu and popup were not read from the design | Wording and small layout changes late in build | [EXPECTED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002_GoogleAuth | feature | admin role (seeded by email), backend admin middleware and `/admin/*` sign-in redirect; `users` table | FR-601 |
| F001_AppShellI18n | feature | shared header, language dictionaries, 403 and 404 pages | FR-002 |
| F010_AdminOverviewUsers | feature | supplies the admin header with the Settings link that opens this page | FR-101 |
| F008_KudosGamification | feature | reads `campaigns.multiplier` of the running campaigns when a heart is given; its `hearts.campaign_id` references campaigns, nullable, `on delete set null` | BR-004, BR-005 |

## 13. Configuration

```text
CAMPAIGN_NAME_MAX_LENGTH = 100                         # BR-001 (AD12)
MULTIPLIER_MIN           = 2                           # BR-003 (G14)
MULTIPLIER_MAX           = 10                          # BR-003 (G14)
MULTIPLIER_DEFAULT       = 2                           # preset on the Add form (G14)
REPORT_TIME_ZONE         = Asia/Ho_Chi_Minh            # where typed times are read (AD12)
TIME_DISPLAY_FORMAT      = DD/MM/YYYY - HH:mm          # from the design sample
```
