---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-admin-overview — Screen Spec

**Screen**: SCR-admin-overview: Admin - Overview
**Feature**: F010_AdminOverviewUsers
**Type**: composite
**Route**: `/admin` (proposed; Figma `620:7712`; overlays `1413:9045`, `2492:9140`, `860:14284`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** An admin sees how much each unit takes part in kudos over a chosen period and can take the table out as a file.
**Actors:** Admin
**Entry Conditions:** Signed-in user with the admin role; reached from the avatar menu item Admin, the Overview link of the admin header, or by typing the address.
**Exit Conditions:** The admin leaves through an admin header link, the logo, the avatar menu, or has downloaded the export.

## 2. Screen Layout

### Layout Sketch

An admin header runs across the top. Below it, a toolbar row holds the title "Overview" on the left and the date range control plus Export button on the right. The main area is one wide table. The date picker and the quick-range dropdown float below the date range control. Desktop layout only.

```
┌──────────────────────────────────────────────────────────────┐
│ R1 Admin header (fixed-top)                                  │
│ [Logo ADMIN] [Overview][Review content][User][Settings]     │
│                                 [Bell] [VN v] [Avatar]       │
├──────────────────────────────────────────────────────────────┤
│ R2 Toolbar (static)                                          │
│ Overview            [2020-11-08 → 2020-12-23 v]  [Export]    │
│                     ┌ R4 Date picker / quick ranges ┐ (float) │
├──────────────────────────────────────────────────────────────┤
│ R3 Overview table (static, scrollable with page)             │
│ No | Unit | Member | Sent | Received | With kudo | Boxes     │
│ -  | All  | ...                                              │
│ 1  | CECV1| ...                                              │
└──────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Admin header | fixed-top | no | TBD (draft) |
| R2 | Toolbar | static | no | TBD (draft) |
| R3 | Overview table | static | yes | TBD (draft) |
| R4 | Date picker and quick-range overlay | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Page title "Overview" | region label | — | — | Always | — | static | — | — | N/A |
| E02 | Date range | date input | no | last 30 days ending today | Always | Opens date picker | route param | `YYYY-MM-DD → YYYY-MM-DD` | default range shown | TBD (draft) |
| E03 | Quick range dropdown | select | no | — | Always | Picks a preset range: Last 7 days, Last 30 days, This month, Custom | static | — | — | N/A |
| E04 | Calendar | date input | yes (to apply) | current month | Conditional | Picks start then end day | — | `YYYY-MM-DD` | — | N/A |
| E05 | Apply | button | — | Disabled until a full range is chosen | Conditional | Applies the range | — | — | — | N/A |
| E06 | Export | button | — | Enabled | Always | Downloads the table as a CSV file (UTF-8 with BOM) | — | — | — | N/A |
| E07 | No | display field | — | — | Always | — | computed | integer; blank on the All row | dash | N/A |
| E08 | Unit | display field | — | — | Always | — | API field | text; first row "All" | dash | users, units |
| E09 | Total member | display field | — | — | Always | — | API field | integer | 0 | users |
| E10 | Total sent kudos | display field | — | — | Always | — | API field | integer | 0 | kudos |
| E11 | Total received kudos | display field | — | — | Always | — | API field | integer | 0 | kudos |
| E12 | Total users with at least one kudo (design text "Total user have atleast kudos", corrected) | display field | — | — | Always | — | API field | integer | 0 | users, kudos |
| E13 | Total received secret box | display field | — | — | Always | — | API field | integer | 0 | secret_boxes |
| E14 | Header nav links | link | — | current section highlighted | Always | Goes to an admin section | static | — | — | N/A |
| E15 | Error message with Retry | message | — | — | Conditional | Reloads the data | — | — | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation is in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Open date picker | E02 | click | — | R4 opens with calendar and quick ranges | TBD (draft) |
| Pick a quick range | E03 | click item | — | Start and end are filled in the range field and the table reloads | TBD (draft) |
| Pick start day | E04 | click a day | — | Day marked as start; waiting for end day | TBD (draft) |
| Pick end day | E04 | click a day | after the start day | Range marked; Apply enabled | TBD (draft) |
| Apply range | E05 | click | range complete | R4 closes, table reloads for the range | TBD (draft) |
| Export | E06 | click | — | A file with the current table downloads | TBD (draft) |
| Retry | E15 | click | load failed | Table reloads | TBD (draft) |

### Happy Path

1. Admin opens the page; R3 shows All and the units for the default range.
2. Admin clicks the date range in R2; R4 opens.
3. Admin picks a start day and an end day, then clicks Apply; the table reloads for the range.
4. Admin clicks Export; the file with the same figures downloads.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 3 | End day earlier than start | That day is not selectable; picker keeps waiting | TBD (draft) |
| Step 3 | Picker closed before an end day | Nothing changes; previous range stays | TBD (draft) |
| Step 1 | Address holds an invalid range | Default range is shown without an error | TBD (draft) |

### Interaction Notes

- **Escape or a click outside closes the picker without applying** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | page or range change | table skeleton rows; Export disabled | none | TBD (draft) |
| empty | no units exist | only the All row, zeros | change range | TBD (draft) |
| zero activity | range has no kudos | all activity cells 0, units still listed | change range | TBD (draft) |
| error | data cannot be loaded | E15 replaces the table | Retry | TBD (draft) |
| exporting | file is being built and downloaded | Export shows a busy state until the whole file has arrived | none | TBD (draft) |
| export failed | export request fails, or the download is cut off part-way (Codex N11) | short message "Export failed, try again"; no file saved | Export again | TBD (draft) |
| success | whole file received | the complete file is saved by the browser (Codex N11) | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E04 | End day cannot be before the start day | End days before the start are shown disabled (no message) | change |
| E05 | Both start and end must be chosen | Apply stays disabled | change |
| E06 | Export needs a loaded table | Button disabled while loading | change |
| E15 | Load failure | "Could not load the data. Try again." *(copy to confirm)* | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The viewer is an admin | auth | whole screen | role is admin | any other role sees the "no access" page instead | page protection is the access gate's job, not this screen's |
| The date picker is open | hardcoded-id | E03, E04, E05 | admin clicked the range field | picker closed | — |
| Data failed to load | configuration | E15 | load error | otherwise | replaces the table |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| App Shell avatar menu (F001) | Admin item | viewer is an admin | TBD (draft) |
| Admin - User (F010) | Overview link in the admin header | — | TBD (draft) |
| Admin - Review content (F011), Admin - Setting (F012) | Overview link in the admin header | — | TBD (draft) |
| external | typed address `/admin` | admin session | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Go to Review content | E14 | — | Admin - Review content (F011, TBD (draft)) | redirect | TBD (draft) |
| Go to User | E14 | — | Admin - User (this feature, SCR TBD (draft)) | redirect | TBD (draft) |
| Go to Settings | E14 | — | Admin - Setting (F012, TBD (draft)) | redirect | TBD (draft) |
| Export | E06 | — | (stays on screen) | file download | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | table with column headers; picker as a dialog with labelled day buttons; nav landmark with current-page marker |
| Keyboard navigation | [EXPECTED] | range field, quick ranges, calendar days, Apply, Export reachable by Tab and arrow keys |
| Focus management | [EXPECTED] | focus moves into the picker on open and back to the range field on close |
| Screen reader compatibility | [EXPECTED] | numbers read with their column header; loading and error announced |
| Error announcement | [EXPECTED] | load and export failures use an alert region |

## 10. Responsive Behavior

Desktop only (AD01, R17): release acceptance at a minimum viewport width of 1280 px; narrower windows keep the desktop layout with horizontal scroll.
