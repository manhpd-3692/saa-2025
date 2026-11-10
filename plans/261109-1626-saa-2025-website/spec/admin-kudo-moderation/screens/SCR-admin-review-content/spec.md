---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-admin-review-content — Screen Spec

**Screen**: SCR-admin-review-content: Admin - Review content
**Feature**: F011_AdminKudoModeration
**Type**: composite
**Route**: `/admin/review` (proposed; Figma `722:16251`, search state `832:13197` at `/admin/review?q=`; overlays `1002:15394`, `1002:15428`, `1002:15464`, `1002:15559`, `2492:9140`, `773:26373`, `773:26295`)
**Generated**: 2026-11-10

## 1. Overview

**Purpose:** An admin looks through every kudo, narrows the list by sender, receiver, status, date or a search phrase, and marks each kudo Spam or Public according to the community standards.
**Actors:** Admin
**Entry Conditions:** Signed-in user with the admin role; reached from the Review content link of the admin header or by typing the address.
**Exit Conditions:** The admin leaves through an admin header link, the logo or the avatar menu.

## 2. Screen Layout

### Layout Sketch

An admin header runs across the top. Below it a title "Review content" and a filter bar: Sender and Receiver dropdowns, a Status dropdown, a date range control and a search box. The main area is a wide table; each row ends with a status pill and an Action button. A pager sits under the table. Dropdowns, the calendar and the Action menu float below their control. Desktop layout only.

```
┌──────────────────────────────────────────────────────────────┐
│ R1 Admin header (fixed-top)                                  │
├──────────────────────────────────────────────────────────────┤
│ R2 Title + filter bar (static)                               │
│ Review content  [Sender v][Receiver v][Status v][dates][ 🔍 ]│
│                 ┌ R5 dropdown / calendar / action menu ┐     │
├──────────────────────────────────────────────────────────────┤
│ R3 Kudo table (static)                                       │
│ ID|Sender|Receiver|Content|Hashtags|Time|Status|Action       │
├──────────────────────────────────────────────────────────────┤
│ R4 Pager (static)                                            │
└──────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Admin header | fixed-top | no | TBD (draft) |
| R2 | Title and filter bar | static | no | TBD (draft) |
| R3 | Kudo table | static | yes | TBD (draft) |
| R4 | Pager | static | no | TBD (draft) |
| R5 | Dropdown, calendar and action menu overlay | floating | yes | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Page title "Review content" | region label | — | — | Always | — | static | — | — | N/A |
| E02 | Sender filter | select with search | no | none chosen | Always | Narrows by sender | API field | avatar + name | placeholder text | users |
| E03 | Receiver filter | select with search | no | none chosen | Always | Narrows by receiver | API field | avatar + name | placeholder text | users |
| E04 | Status filter | select | no | none chosen (all) | Always | Narrows to Public or Spam | static | Public / Spam | placeholder text | kudos.status |
| E05 | Date range | date range input | no | empty | Always | Narrows by creation date | — | `YYYY-MM-DD → YYYY-MM-DD` | placeholder text | kudos.created_at |
| E06 | Calendar | overlay | — | — | Conditional | Picks start then end day | — | calendar | hidden | N/A |
| E07 | Search box | text input | no | Empty | Always | Searches title and body text | — | raw | placeholder text | kudos |
| E08 | ID | display field | — | — | Always | — | computed | first 8 characters of the kudo id | dash | kudos |
| E09 | Sender | display field | — | — | Always | — | API field | avatar + name, "Anonymous" marker when the kudo is anonymous | dash | users, kudos.is_anonymous |
| E10 | Receiver | display field | — | — | Always | — | API field | avatar + name | dash | users |
| E11 | Content | display field | — | — | Always | — | API field | title in capitals, then the start of the body (about 120 characters, cut with …) | dash | kudos |
| E12 | Hashtags | display field | — | — | Always | — | API field | hashtag chips | dash | hashtags |
| E13 | Time | display field | — | — | Always | — | API field | `YYYY-MM-DD HH:mm` | dash | kudos.created_at |
| E14 | Status pill | display field | — | — | Always | — | API field | Public / Spam, different colours | dash | kudos.status |
| E15 | Action button | button | — | Enabled | Always | Opens the row's action menu | — | — | — | N/A |
| E16 | Action menu item | menu item | — | — | Conditional | "Mark as Spam" on a Public row; "Mark as Public" on a Spam row | static | — | hidden | kudos.status |
| E17 | Spam confirmation | inline dialog | — | — | Conditional | Confirms or cancels marking Spam (D003, resolved) | static | short warning that the author will be notified | hidden | N/A |
| E18 | Pager | region label | — | page 1 | Conditional | Changes page | route param | page numbers | hidden when one page | N/A |
| E19 | Empty or error message | message | — | — | Conditional | Clear filters / Retry | — | — | — | N/A |
| E20 | Header nav links | link | — | Review content highlighted | Always | Goes to an admin section | static | — | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation is in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Choose a sender | E02 | click item, or type to narrow the list | — | Table reloads, page 1 | TBD (draft) |
| Choose a receiver | E03 | click item, or type to narrow the list | — | Table reloads, page 1 | TBD (draft) |
| Choose a status | E04 | click item | — | Table reloads, page 1 | TBD (draft) |
| Pick a date range | E05, E06 | click start day, then end day | end not before start | Table reloads, page 1 | TBD (draft) |
| Search | E07 | Enter | — | Table reloads, page 1 | TBD (draft) |
| Clear filters | E19 | click | empty list with filters set | All filters and search reset | TBD (draft) |
| Open row menu | E15 | click | — | E16 opens beside the row | TBD (draft) |
| Mark as Spam | E16 | click | row is Public | E17 asks to confirm; after confirm the request carries the row's moderation version and the item is disabled while saving; the pill becomes Spam (Codex R13) | TBD (draft) |
| Mark as Public | E16 | click | row is Spam | Request carries the row's moderation version; item disabled while saving; pill becomes Public (Codex R13) | TBD (draft) |
| Change page | E18 | click | more than one page | Next page loads | TBD (draft) |
| Retry | E19 | click | load failed | Table reloads | TBD (draft) |

### Happy Path

1. Admin opens the page; R3 shows the newest 20 kudos.
2. Admin picks a sender in R2 and the Spam status; the table narrows to page 1 of the matches.
3. Admin opens a Public row's Action menu and chooses Mark as Spam, then confirms.
4. The row's pill becomes Spam and its menu now offers Mark as Public.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 2 | No kudo matches | Empty state "no kudo matches" with Clear filters | TBD (draft) |
| Step 1 | No kudos exist | Empty state "no kudos yet" | TBD (draft) |
| Step 3 | Admin cancels the confirmation | Nothing changes | TBD (draft) |
| Step 3 | Another admin already decided this kudo (backend answers 409 `stale_decision` with the current row) | Row is replaced with the returned current status, version and decider; its menu follows the new status; a short message says the kudo was changed by another admin (Codex R13) | TBD (draft) |
| Step 3 | The kudo no longer exists (backend answers 404 `kudo_not_found`) | Table refreshes and the row disappears; nothing changed (C03, Codex N08) | TBD (draft) |
| Step 3 | Saving fails | Short error; row keeps its old status | TBD (draft) |

### Interaction Notes

- **Filters and search are kept in the address, so a reload or a shared link shows the same table** — source: TBD (draft)
- **Escape or a click outside closes any open dropdown, calendar or menu; only one is open at a time** — source: TBD (draft)
- **A row that no longer matches the filters after a decision stays until the next load** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | page, filter, search or page change | skeleton rows | none | TBD (draft) |
| empty (filtered) | filters or search set, no match | E19 "no kudo matches" | Clear filters | TBD (draft) |
| empty (none) | no kudos exist | E19 "no kudos yet" | none | TBD (draft) |
| error | data cannot be loaded | E19 error message | Retry | TBD (draft) |
| deciding | decision sent | the row's Action button shows a busy state | none on that row | TBD (draft) |
| decision failed | save fails | short message "Could not update. Try again." | Choose again | TBD (draft) |
| decision stale | 409 `stale_decision` | row refreshed from the response; short message "This kudo was just changed by another admin." *(copy to confirm)*, announced in the alert region (Codex R13) | Choose again on the refreshed row | TBD (draft) |
| options loading | typing in E02 or E03 | small spinner in the list | keep typing | TBD (draft) |
| options empty | no person matches | list shows "no match" | keep typing | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E05, E06 | End day cannot be before the start day | The earlier day is not selectable | change |
| E07 | Search is plain text; special characters are not interpreted | None | submit |
| E17 | Marking Spam warns the author | "The author will be notified. Mark as Spam?" *(copy to confirm)* | click |
| E16 | Decision saved | Pill and menu update | server response |
| E16 | Decision is stale (another admin changed the kudo since it was loaded) | Row refreshed to the current status; "This kudo was just changed by another admin." *(copy to confirm)* (Codex R13) | server response 409 |
| E19 | Load failure | "Could not load the data. Try again." *(copy to confirm)* | server response |
| E19 | No match | "No kudo matches your filters." *(copy to confirm)* | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The viewer is an admin | auth | whole screen | role is admin | any other role sees the "no access" page instead | page protection is the access gate's job, not this screen's; the Go admin endpoints also refuse non-admins with 403 via F002's `RequireAdmin` on `users.role` (Codex R05) |
| The row is Public | hardcoded-id | E16 "Mark as Spam" | status is Public | status is Spam | — |
| The row is Spam | hardcoded-id | E16 "Mark as Public" | status is Spam | status is Public | — |
| The kudo is anonymous | hardcoded-id | E09 "Anonymous" marker | kudo is anonymous | otherwise | real sender is shown to admins only (G04) |
| The list has more than one page | configuration | E18 | more than 20 matches | one page or none | page size is a proposed setting |
| The list is empty or failed | configuration | E19 | no rows or load error | rows exist | replaces the table body |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Admin - Overview (F010), Admin - User (F010), Admin - Setting (F012) | Review content link in the admin header | — | TBD (draft) |
| external | typed address `/admin/review` | admin session | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Go to Overview | E20 | — | Admin - Overview (F010, TBD (draft)) | redirect | TBD (draft) |
| Go to User | E20 | — | Admin - User (F010, TBD (draft)) | redirect | TBD (draft) |
| Go to Settings | E20 | — | Admin - Setting (F012, TBD (draft)) | redirect | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | table with column headers; dropdowns as listboxes; Action button labelled with the kudo's title; status pill has text, not colour alone |
| Keyboard navigation | [EXPECTED] | filters, search, calendar, row Action buttons, menu items and pager reachable by Tab and arrow keys |
| Focus management | [EXPECTED] | focus returns to the Action button when its menu or the confirmation closes |
| Screen reader compatibility | [EXPECTED] | cells read with their column header; decision results announced |
| Error announcement | [EXPECTED] | load and save failures use an alert region |

## 10. Responsive Behavior

N/A — desktop only (shared decision of the app shell); the table is wide and scrolls horizontally if the window is narrower than its content `[EXPECTED]`.
