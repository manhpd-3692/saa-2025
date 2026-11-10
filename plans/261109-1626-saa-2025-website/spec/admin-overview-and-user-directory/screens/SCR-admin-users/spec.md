---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-admin-users — Screen Spec

**Screen**: SCR-admin-users: Admin - User
**Feature**: F010_AdminOverviewUsers
**Type**: composite
**Route**: `/admin/users` (proposed; Figma `773:26403`; overlays `1002:15639`, `1002:15708`, `1002:15711`, `1002:15714`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** An admin looks through all Sunners, narrows them by unit, level or role or finds one by name or email, and can take the list out as a file.
**Actors:** Admin
**Entry Conditions:** Signed-in user with the admin role; reached from the User link of the admin header or by typing the address.
**Exit Conditions:** The admin leaves through an admin header link, the avatar menu or a row menu item, or has downloaded the export.

## 2. Screen Layout

### Layout Sketch

An admin header runs across the top. A title "User" and a filter bar sit below it: Unit, Level and Role dropdowns, a search box and the Export button. The main area is a wide table with a pager underneath. Each dropdown and the search suggestions float below their control. Desktop layout only.

```
┌──────────────────────────────────────────────────────────────┐
│ R1 Admin header (fixed-top)                                  │
├──────────────────────────────────────────────────────────────┤
│ R2 Title + filter bar (static)                               │
│ User   [Chọn phòng ban v][Chọn level v][Chọn Role v]         │
│        [ Search ...  ] [Export]                              │
│        ┌ R5 dropdown / suggestions ┐ (floating)              │
├──────────────────────────────────────────────────────────────┤
│ R3 User table (static)                                       │
│ ID|User|Email|Sent|Received|Heart|Level|Badges|Time6|Login|Role|⋯ │
├──────────────────────────────────────────────────────────────┤
│ R4 Pager (static)                                            │
└──────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Admin header | fixed-top | no | TBD (draft) |
| R2 | Title and filter bar | static | no | TBD (draft) |
| R3 | User table | static | yes | TBD (draft) |
| R4 | Pager | static | no | TBD (draft) |
| R5 | Dropdown and suggestion overlay | floating | yes | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Page title "User" | region label | — | — | Always | — | static | — | — | N/A |
| E02 | Unit filter ("Chọn phòng ban") | select | no | none chosen | Always | Narrows by unit | API field | unit name | placeholder text | units |
| E03 | Level filter ("Chọn level") | select | no | none chosen | Always | Narrows by level | static | hero tier name (New, Rising, Super, Legend) | placeholder text | hero tier (F008) |
| E04 | Role filter ("Chọn Role") | select | no | none chosen | Always | Narrows by role | static | User / Admin | placeholder text | users.role |
| E05 | Search box | text input | no | Empty | Always | Searches name or email; shows suggestions | — | raw | placeholder text | users |
| E06 | Suggestion list | list | — | — | Conditional | Picks a person | API field | avatar, name, email | hidden | users |
| E07 | Export | button | — | Enabled | Always | Downloads the filtered list as a CSV file (UTF-8 with BOM) | — | — | — | N/A |
| E08 | ID | display field | — | — | Always | — | computed | first 8 characters of the user id | dash | users |
| E09 | User | display field | — | — | Always | — | API field | avatar + name | dash | users |
| E10 | Email | display field | — | — | Always | — | API field | raw | dash | users |
| E11 | Σ sent Kudos | display field | — | — | Always | — | API field | integer | 0 | kudos |
| E12 | Σ received Kudos | display field | — | — | Always | — | API field | integer | 0 | kudos |
| E13 | Total Heart | display field | — | — | Always | — | API field | integer; weighted total of hearts received (each heart at the weight fixed when given) | 0 | kudo_heart_state |
| E14 | Level | display field | — | — | Always | — | API field | hero tier name (New, Rising, Super, Legend) | dash | hero tier (F008) |
| E15 | Number of Badges | display field | — | — | Always | — | API field | integer 0-6, distinct opened icons (repeats not counted) | 0 | secret_boxes |
| E16 | Time to get 6 Badges | display field | — | — | Always | — | API field | duration from first opened box to the sixth distinct icon, e.g. days and hours | dash | secret_boxes |
| E17 | Last Logged in | display field | — | — | Always | — | API field | `YYYY-MM-DD HH:mm` | dash | users.last_login_at |
| E18 | Role | display field | — | — | Always | — | API field | User / Admin; text only, not editable (admins are seeded by email) | dash | users.role |
| E19 | Actions (⋯) | button | — | Enabled | Always | Opens the row menu | — | — | — | N/A |
| E20 | Row menu | list | — | — | Conditional | Offers one item, "View profile" | static | — | hidden | N/A |
| E21 | Pager | region label | — | page 1 | Conditional | Changes page | route param | page numbers | hidden when one page | N/A |
| E22 | Empty or error message | message | — | — | Conditional | Clear filters / Retry | — | — | — | N/A |
| E23 | Header nav links | link | — | current section highlighted | Always | Goes to an admin section | static | — | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation is in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Choose a unit | E02 | click item | — | List reloads, page 1 | TBD (draft) |
| Choose a level | E03 | click item | — | List reloads, page 1 | TBD (draft) |
| Choose a role | E04 | click item | — | List reloads, page 1 | TBD (draft) |
| Type in search | E05 | typing | at least 2 characters | E06 shows up to 8 matches | TBD (draft) |
| Pick a suggestion | E06 | click | — | Search box is set to that email; list reloads | TBD (draft) |
| Search typed text | E05 | Enter | — | List reloads, page 1 | TBD (draft) |
| Clear filters | E22 | click | list empty with filters set | All filters and search reset | TBD (draft) |
| Change page | E21 | click | more than one page | Next page loads | TBD (draft) |
| Export | E07 | click | — | File with every match downloads | TBD (draft) |
| Open row menu | E19 | click | — | E20 opens beside the row | TBD (draft) |
| Retry | E22 | click | load failed | List reloads | TBD (draft) |

### Happy Path

1. Admin opens the page; R3 shows the first 20 Sunners A-Z.
2. Admin picks a unit and a role in R2; the list narrows to page 1 of the matches.
3. Admin types part of a name; suggestions appear; admin picks one.
4. Admin clicks Export; the file with all matches downloads.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 2 | No Sunner matches | Empty state "no user matches" with Clear filters | TBD (draft) |
| Step 1 | No Sunners exist | Empty state "no users yet" | TBD (draft) |
| Step 3 | Fewer than 2 characters typed | No suggestions are shown | TBD (draft) |
| Step 1 | Page number beyond the last | Last page is shown | TBD (draft) |

### Interaction Notes

- **Filters and search are kept in the address, so a reload or a shared link shows the same list** — source: TBD (draft)
- **Escape or a click outside closes any open dropdown, suggestion list or row menu** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | page, filter, search or page change | skeleton rows; Export disabled | none | TBD (draft) |
| empty (filtered) | filters or search set, no match | E22 "no user matches" | Clear filters | TBD (draft) |
| empty (none) | no Sunners exist | E22 "no users yet" | none | TBD (draft) |
| error | data cannot be loaded | E22 error message | Retry | TBD (draft) |
| exporting | file is being built and downloaded | Export shows a busy state until the whole file has arrived | none | TBD (draft) |
| export failed | export request fails, or the download is cut off part-way (Codex N11) | short message "Export failed, try again"; no file saved | Export again | TBD (draft) |
| suggestions loading | typing after 2 characters | E06 shows a small spinner | keep typing | TBD (draft) |
| suggestions empty | no match for typed text | E06 shows "no match" | keep typing | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E05 | Suggestions need at least 2 characters | No list is shown (no message) | change |
| E05 | Search is plain text; special characters are not interpreted | None | submit |
| E22 | Load failure | "Could not load the data. Try again." *(copy to confirm)* | server response |
| E22 | No match | "No user matches your filters." *(copy to confirm)* | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The viewer is an admin | auth | whole screen | role is admin | any other role sees the "no access" page instead | page protection is the access gate's job, not this screen's |
| The Sunner has all 6 badges | hardcoded-id | E16 value | duration shown | dash shown | — |
| The list has more than one page | configuration | E21 | more than 20 matches | one page or none | page size is a proposed setting |
| The list is empty or failed | configuration | E22 | no rows or load error | rows exist | replaces the table body |
| A dropdown, suggestions or row menu is open | hardcoded-id | E02-E04, E06, E20 | clicked or typed | closed | only one overlay is open at a time |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Admin - Overview (F010) | User link in the admin header | — | TBD (draft) |
| Admin - Review content (F011), Admin - Setting (F012) | User link in the admin header | — | TBD (draft) |
| external | typed address `/admin/users` | admin session | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Go to Overview | E23 | — | Admin - Overview (this feature, SCR TBD (draft)) | redirect | TBD (draft) |
| Go to Review content | E23 | — | Admin - Review content (F011, TBD (draft)) | redirect | TBD (draft) |
| Go to Settings | E23 | — | Admin - Setting (F012, TBD (draft)) | redirect | TBD (draft) |
| View profile | E20 | — | Profile người khác (F007, TBD (draft)) | redirect | TBD (draft) |
| Export | E07 | — | (stays on screen) | file download | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | table with column headers; dropdowns as listboxes; search suggestions as a combobox; Actions button labelled with the user name |
| Keyboard navigation | [EXPECTED] | filters, search, suggestions, rows' Actions buttons and pager reachable by Tab and arrow keys |
| Focus management | [EXPECTED] | focus returns to the control that opened a dropdown or row menu when it closes |
| Screen reader compatibility | [EXPECTED] | cells read with their column header; empty and error states announced |
| Error announcement | [EXPECTED] | load and export failures use an alert region |

## 10. Responsive Behavior

Desktop only (AD01, R17): release acceptance at a minimum viewport width of 1280 px; narrower windows keep the desktop layout and the page scrolls horizontally. The wide table may also scroll horizontally inside 1280 px if its content is wider `[EXPECTED]`.
