---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-admin-campaign-settings — Screen Spec

**Screen**: SCR-admin-campaign-settings: Admin - Setting
**Feature**: F012_AdminCampaigns
**Type**: composite
**Route**: `/admin/settings` (proposed; Figma `820:10492`; overlays Action - Campaign `820:11429`, Popup delete campaign `1760:8926`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** An admin sees every heart-boost campaign with its period, and starts adding, editing or deleting one.
**Actors:** Admin
**Entry Conditions:** Signed-in user with the admin role; reached from the Settings link of the admin header or by typing the address.
**Exit Conditions:** The admin leaves through an admin header link or the avatar menu; opening the add or edit form is an overlay on this screen, not an exit.

## 2. Screen Layout

### Layout Sketch

An admin header runs across the top. Below it a title "Setting" on the left and an "Add Campaign" button on the right. The main area is a table of campaigns. A small menu floats beside a row's Actions button, and a confirmation popup floats over the page, dimming the rest. Desktop layout only.

```
┌──────────────────────────────────────────────────────────────┐
│ R1 Admin header (fixed-top)                                  │
├──────────────────────────────────────────────────────────────┤
│ R2 Title bar (static)                                        │
│ Setting                                  [ + Add Campaign ]  │
├──────────────────────────────────────────────────────────────┤
│ R3 Campaign table (static)                                   │
│ ID | Name                       | Time                  | ⋯  │
│ a1 | Campaign x2 heart ... [x2] | 23/12/2025 - 10:00 ...| ⋯  │
│                                   ┌ R4 row menu ┐ (floating)  │
│                                   │ Edit        │            │
│                                   │ Delete      │            │
├──────────────────────────────────────────────────────────────┤
│        ┌ R5 delete confirmation popup (modal overlay) ┐      │
└──────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Admin header | fixed-top | no | TBD (draft) |
| R2 | Title bar | static | no | TBD (draft) |
| R3 | Campaign table | static | yes | TBD (draft) |
| R4 | Row menu | floating | no | TBD (draft) |
| R5 | Delete confirmation popup | modal overlay | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Page title "Setting" | region label | — | — | Always | — | static | — | — | N/A |
| E02 | Add Campaign | button | — | Enabled | Always | Opens the add form (SCR-admin-campaign-form) | — | — | — | N/A |
| E03 | ID | display field | — | — | Always | — | API field | first 8 characters of the campaign id | dash | campaigns |
| E04 | Name | display field | — | — | Always | Hover shows "Heart multiplier x{n}" | API field | raw text, one line, truncated with an ellipsis, followed by an "x{n}" multiplier tag (the design has no multiplier column) | dash | campaigns.name, campaigns.multiplier |
| E05 | Time | display field | — | — | Always | — | API field | start and end, each `DD/MM/YYYY - HH:mm` (e.g. "23/12/2025 - 10:00") | dash | campaigns |
| E06 | Actions (⋯) | button | — | Enabled | Always | Opens the row menu | — | — | — | N/A |
| E07 | Row menu | list | — | — | Conditional | Offers Edit and Delete | static | — | hidden | N/A |
| E08 | Empty message | message | — | — | Conditional | none | static | "No campaigns yet." *(copy to confirm)* | — | N/A |
| E09 | Error message with Retry | message | — | — | Conditional | Reloads the list | static | "Could not load the data. Try again." *(copy to confirm)* | — | N/A |
| E10 | Delete popup title and text | message | — | — | Conditional | — | computed | names the campaign being deleted | — | campaigns |
| E11 | Delete popup Confirm | button | — | Enabled | Conditional | Deletes the campaign | — | — | — | N/A |
| E12 | Delete popup Cancel | button | — | Enabled | Conditional | Closes the popup | — | — | — | N/A |
| E13 | Delete popup failure message | message | — | — | Conditional | — | static | "Could not delete, try again." *(copy to confirm)* | — | N/A |
| E14 | Header nav links | link | — | Setting highlighted | Always | Goes to an admin section | static | — | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation is in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Add a campaign | E02 | click | — | Add form opens over the page (SCR-admin-campaign-form) | TBD (draft) |
| Open row menu | E06 | click | — | E07 opens beside the row | TBD (draft) |
| Edit | E07 | click | — | Edit form opens filled with the row's values | TBD (draft) |
| Delete | E07 | click | — | R5 opens naming the campaign | TBD (draft) |
| Confirm delete | E11 | click | R5 open | Busy state; on success the popup closes and the row disappears | TBD (draft) |
| Cancel delete | E12 | click, Escape | R5 open | Popup closes; nothing changes | TBD (draft) |
| Close row menu | E07 | click outside, Escape | menu open | Menu closes | TBD (draft) |
| Retry | E09 | click | load failed | List reloads | TBD (draft) |

### Happy Path

1. Admin opens Settings; R3 shows the campaigns, newest start first.
2. Admin clicks Add Campaign, saves a valid form; the form closes and the new row is in R3.
3. Admin opens a row's ⋯ menu and picks Edit, saves a change; the row shows the new values.
4. Admin opens the ⋯ menu, picks Delete and confirms; the row disappears.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 1 | No campaigns exist | E08 replaces the table; E02 stays | TBD (draft) |
| Step 1 | The list cannot be loaded | E09 replaces the table | TBD (draft) |
| Step 4 | Delete fails | E13 shows inside the popup; the popup stays open | TBD (draft) |
| Step 3 or 4 | Campaign was already deleted elsewhere | A short message says it no longer exists; the list refreshes | TBD (draft) |

### Interaction Notes

- **Only one overlay is open at a time: the row menu or the delete popup** — source: TBD (draft)
- **While the delete is in progress, Confirm and Cancel are disabled** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | page opens | skeleton rows; Add Campaign enabled | Add Campaign | TBD (draft) |
| populated | campaigns exist | table rows | all | TBD (draft) |
| empty | no campaigns | E08 | Add Campaign | TBD (draft) |
| error | list cannot be loaded | E09 | Retry | TBD (draft) |
| menu open | click on ⋯ | E07 beside the row | Edit, Delete | TBD (draft) |
| delete confirm | Delete picked | R5 over a dimmed page | Confirm, Cancel | TBD (draft) |
| deleting | Confirm clicked | Confirm shows a busy state | none | TBD (draft) |
| delete failed | delete request fails | E13 in the popup | Confirm again, Cancel | TBD (draft) |
| saved | the form saved a change | table shows the change | all | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E11 | Delete needs an explicit confirmation | Popup names the campaign before anything is removed | click Delete |
| E13 | Delete failure | "Could not delete, try again." *(copy to confirm)* | server response |
| E09 | Load failure | "Could not load the data. Try again." *(copy to confirm)* | server response |
| Row | Campaign already removed elsewhere | "This campaign no longer exists." *(copy to confirm)* | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The viewer is an admin | auth | whole screen | role is admin | any other role sees the "no access" page instead | page protection is the access gate's job, not this screen's |
| The list is empty or failed | configuration | E08 or E09 | no rows or load error | rows exist | replaces the table body |
| The menu or popup is open | hardcoded-id | E07, R5 | clicked | closed | one overlay at a time |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Admin - Overview (F010), Admin - User (F010), Admin - Review content (F011) | Settings link in the admin header | admin session | TBD (draft) |
| external | typed address `/admin/settings` | admin session | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Add or Edit | E02, E07 | — | Campaign form (SCR-admin-campaign-form, same route, overlay) | overlay opens | TBD (draft) |
| Go to Overview | E14 | — | Admin - Overview (F010, TBD (draft)) | redirect | TBD (draft) |
| Go to Review content | E14 | — | Admin - Review content (F011, TBD (draft)) | redirect | TBD (draft) |
| Go to User | E14 | — | Admin - User (F010, TBD (draft)) | redirect | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | table with column headers; Actions button labelled with the campaign name; row menu as a menu; delete popup as an alertdialog with its title and text |
| Keyboard navigation | [EXPECTED] | Add Campaign, each Actions button, menu items and popup buttons reachable by Tab and arrow keys; Escape closes the menu or popup |
| Focus management | [EXPECTED] | focus moves into the popup when it opens and returns to the Actions button when it closes; focus is kept inside the popup while open |
| Screen reader compatibility | [EXPECTED] | cells read with their column header; the time cell reads start then end; empty, error and failure messages announced |
| Error announcement | [EXPECTED] | load and delete failures use an alert region |

## 10. Responsive Behavior

N/A — desktop only (shared decision of the app shell); the table scrolls horizontally if the window is narrower than its content `[EXPECTED]`.
