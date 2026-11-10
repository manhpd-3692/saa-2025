---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-admin-campaign-form — Screen Spec

**Screen**: SCR-admin-campaign-form: Admin - Setting - add / edit Campaign
**Feature**: F012_AdminCampaigns
**Type**: composite
**Route**: modal over `/admin/settings` (no own address; Figma add `820:11445`, add filled `832:12113`, edit `832:12299`; date picker `1413:9045`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** An admin fills in or changes a campaign's name, period and heart multiplier and saves it, or backs out without saving.
**Actors:** Admin
**Entry Conditions:** The admin clicked Add Campaign (empty form, multiplier preset to 2) or Edit in a row menu (form filled with that campaign) on the Settings screen.
**Exit Conditions:** The form closes after a successful save, or when the admin cancels, clicks the close icon or presses Escape. The admin then sees the Settings list again.

## 2. Screen Layout

### Layout Sketch

A centered modal over a dimmed Settings page. The title ("Add Campaign" or "Edit Campaign") sits on top with a close icon. Below are four fields stacked in order: name, start date-time, end date-time, multiplier. A row of Cancel and Save buttons sits at the bottom. A calendar picker floats under a date field when it is opened. Desktop layout only.

```
┌─ dimmed Settings page ───────────────────────────────────────┐
│        ┌──────────────────────────────────────────┐          │
│        │ R1 Title: Add Campaign / Edit Campaign [x]│          │
│        ├──────────────────────────────────────────┤          │
│        │ R2 Form fields                           │          │
│        │ Name        [__________________________] │          │
│        │ Start       [ DD/MM/YYYY ] [ HH:mm ]      │          │
│        │ End         [ DD/MM/YYYY ] [ HH:mm ]      │          │
│        │ Multiplier  [ x2 ]                        │          │
│        │         ┌ R4 calendar (floating) ┐        │          │
│        ├──────────────────────────────────────────┤          │
│        │ R3 Buttons            [Cancel] [Save]     │          │
│        └──────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Modal title bar | static | no | TBD (draft) |
| R2 | Form fields | static | no | TBD (draft) |
| R3 | Button row | static | no | TBD (draft) |
| R4 | Date picker overlay | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Title | region label | — | "Add Campaign" when adding, "Edit Campaign" when editing | Always | — | static | — | — | N/A |
| E02 | Close icon | button | — | Enabled | Always | Closes the form without saving | — | — | — | N/A |
| E03 | Name | text input | yes | empty when adding; current name when editing | Always | Types the campaign name | API field | text, 1 to 100 characters after trimming spaces | placeholder text | campaigns |
| E04 | Start date | date input with picker | yes | empty when adding; current start when editing | Always | Opens R4 | API field | `DD/MM/YYYY` in Vietnam time | placeholder text | campaigns |
| E05 | Start time | time input | yes | empty when adding; current start time when editing | Always | Types or picks the time | API field | `HH:mm` 24-hour | placeholder text | campaigns |
| E06 | End date | date input with picker | yes | empty when adding; current end when editing | Always | Opens R4 | API field | `DD/MM/YYYY` in Vietnam time | placeholder text | campaigns |
| E07 | End time | time input | yes | empty when adding; current end time when editing | Always | Types or picks the time | API field | `HH:mm` 24-hour | placeholder text | campaigns |
| E08 | Heart multiplier | number input | yes | 2 when adding; current value when editing | Always | Chooses how many hearts one heart counts as (e.g. 2 for "x2") | API field | whole number 2 to 10 | field message if cleared | campaigns.multiplier |
| E09 | Field message | message | — | — | Conditional | — | static | text under the wrong field | — | N/A |
| E10 | Form-level message | message | — | — | Conditional | — | static | "Could not save. Try again." *(copy to confirm)* | — | N/A |
| E11 | Cancel | button | — | Enabled | Always | Closes the form without saving | — | — | — | N/A |
| E12 | Save | button | — | Enabled | Always | Saves the campaign | — | — | — | N/A |
| E13 | Date picker | calendar | — | month of the current value, or today | Conditional | Picks a day | computed | month grid | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation is in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Type the name | E03 | typing | — | Value updates; its message clears | TBD (draft) |
| Open the calendar | E04, E06 | click, Enter | — | E13 opens under the field | TBD (draft) |
| Pick a day | E13 | click | E13 open | The date field is set; E13 closes | TBD (draft) |
| Set a time | E05, E07 | typing or picking | — | Value updates | TBD (draft) |
| Set the multiplier | E08 | typing or picking | — | Value updates | TBD (draft) |
| Save | E12 | click, Enter in a field | form not already saving | Busy state; success closes the form, failure keeps it open with messages | TBD (draft) |
| Cancel | E11, E02 | click, Escape | — | Form closes; typed values are discarded | TBD (draft) |
| Close the calendar | E13 | click outside, Escape | E13 open | Calendar closes; the form stays open | TBD (draft) |

### Happy Path

1. Admin clicks Add Campaign; the form opens with name and dates empty and the multiplier at 2.
2. Admin types a name, picks a start day and time, an end day and time, and keeps or changes the multiplier.
3. Admin clicks Save; the button shows a busy state, then the form closes and the new campaign appears in the list.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 3 | A field is wrong (in the form or rejected by the backend) | The form stays open; each wrong field shows E09; values are kept | TBD (draft) |
| Step 3 | The server fails | E10 shows; the form stays open; values are kept | TBD (draft) |
| Step 1 | Admin opened Edit | The form opens filled; saving updates that campaign | TBD (draft) |
| Step 3 | The campaign was deleted elsewhere (edit only) | The form closes with a short message that it no longer exists; the list refreshes | TBD (draft) |
| Step 2 | Admin presses Escape or Cancel | The form closes; nothing is saved | TBD (draft) |

### Interaction Notes

- **Escape closes the calendar first if it is open; a second Escape closes the form** — source: TBD (draft)
- **Times are read in Vietnam time (Asia/Ho_Chi_Minh), the same zone the list shows** — source: TBD (draft)
- **While saving, Save and the fields are disabled so a double click saves once** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| add (empty) | Add Campaign | empty name and dates, multiplier 2, title "Add Campaign" | fill, cancel | TBD (draft) |
| edit (filled) | Edit | fields hold the current values, title "Edit Campaign" | change, save, cancel | TBD (draft) |
| dirty | any field changed | no visible change | save, cancel | TBD (draft) |
| calendar open | click on a date field | E13 under the field | pick a day | TBD (draft) |
| saving | Save | Save busy, fields disabled | none | TBD (draft) |
| field error | server or form check fails | E09 under each wrong field, field marked | fix, save, cancel | TBD (draft) |
| save failed | server or network fails | E10 at the form bottom | save again, cancel | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E03 | Required; 1 to 100 characters after trimming spaces | "Enter a campaign name." / "Name is too long (max 100)." *(copy to confirm)* | submit |
| E04, E05 | Start date and time both required | "Choose a start date and time." *(copy to confirm)* | submit |
| E06, E07 | End date and time both required; the end must be later than the start | "Choose an end date and time." / "End must be after start." *(copy to confirm)* | submit, and on change of start or end |
| E08 | Required; whole number from 2 to 10 (checked again by the backend) | "Enter a whole number from 2 to 10." *(copy to confirm)* | submit |
| E13 | An end day earlier than the chosen start day cannot be picked | The day is disabled in the calendar | open |
| E10 | Save fails | "Could not save. Try again." *(copy to confirm)* | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The form was opened by Add or Edit | configuration | E01 title, initial values | Add: "Add Campaign", empty; Edit: "Edit Campaign", filled | — | one form serves both |
| A date field is focused or clicked | hardcoded-id | E13 | calendar requested | otherwise | one calendar at a time |
| A field check or save failed | configuration | E09, E10 | message present | no problem | cleared when the field is edited |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Admin - Setting (SCR-admin-campaign-settings) | Add Campaign button | admin session | TBD (draft) |
| Admin - Setting (SCR-admin-campaign-settings) | Edit in a row menu | admin session | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Save | E12 | all fields valid and server accepts | Admin - Setting (SCR-admin-campaign-settings) | overlay closes, list refreshes | TBD (draft) |
| Cancel | E11, E02 | — | Admin - Setting (SCR-admin-campaign-settings) | overlay closes, no change | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | modal as a dialog labelled by its title; every field has a visible label tied to it; messages tied to their field |
| Keyboard navigation | [EXPECTED] | Tab order: name, start date, start time, end date, end time, multiplier, Cancel, Save; Enter saves; Escape closes |
| Focus management | [EXPECTED] | focus goes to the name field on open, stays inside the dialog while open, and returns to the button that opened it on close; after a failed save focus goes to the first wrong field |
| Screen reader compatibility | [EXPECTED] | calendar days announce full date; required fields announced as required |
| Error announcement | [EXPECTED] | field messages and the form-level message use an alert region |

## 10. Responsive Behavior

N/A — desktop only (shared decision of the app shell).
