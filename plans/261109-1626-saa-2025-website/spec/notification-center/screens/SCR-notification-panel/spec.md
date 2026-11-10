---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-notification-panel — Screen Spec

**Screen**: SCR-notification-panel: Tất cả thông báo (notification panel)
**Feature**: F009_Notifications
**Type**: composite
**Route**: panel anchored under the header bell, over any full-shell page (Figma `589:9132`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner opens it from the bell to see what happened to them (kudos, hearts, Secret Boxes, level-ups, warnings), spot what is unread, and open or clear notifications.
**Actors:** Sunner (admins see the same panel as any Sunner)
**Entry Conditions:** Signed-in Sunner clicked the bell in the header.
**Exit Conditions:** The panel is closed (click outside, Esc, bell again), or the Sunner opens a notification and moves on to its detail window or a target page.

## 2. Screen Layout

### Layout Sketch

A panel drops down from the bell at the right of the header, over the page content (dimming is TBD (draft)). Top: the title "Thông báo" and the "Đánh dấu đọc tất cả" action. Middle: a scrollable list of notification rows. Bottom: the "Xem tất cả" action. Desktop layout only, designed at 1440 wide.

```
                                   ┌────────────────────────────────┐
  [Header ......... [Bell] [VN] [Avatar]]                           │
                                   │ R1: Thông báo   Đánh dấu đọc   │
                                   │                 tất cả         │
                                   ├────────────────────────────────┤
                                   │ R2: (scrollable list)          │
                                   │  ● [icon] message...  2 giờ    │
                                   │    [icon] message...  1 ngày   │
                                   │    [icon] message...  3 tháng  │
                                   ├────────────────────────────────┤
                                   │ R3: Xem tất cả                 │
                                   └────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Panel header | static (top of panel) | no | TBD (draft) |
| R2 | Notification list | static | yes | TBD (draft) |
| R3 | Panel footer | static (bottom of panel) | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Title "Thông báo" | region label | — | — | Always | — | static | text | — | N/A |
| E02 | Đánh dấu đọc tất cả | button | — | Enabled when any unread | Always | Marks every unread notification read | static | — | — | N/A |
| E03 | Notification row | list | — | — | Conditional | Opens that notification | API field | newest first | hidden | MODEL: notifications (TBD (draft)) |
| E04 | Type icon | image | — | by kind | Conditional | — | computed | icon per kind | generic icon | N/A |
| E05 | Message text | display field | — | — | Conditional | — | computed | localized text from kind and values; may contain a link (spam warning) | dash | N/A |
| E06 | Relative time | display field | — | — | Conditional | — | computed | "2 giờ trước", "1 ngày trước", "3 tháng trước" | dash | N/A |
| E07 | Unread dot | display field | — | hidden | Conditional | — | API field | dot | hidden | N/A |
| E08 | Xem tất cả | link | — | — | Conditional | Shows the full history in this panel | static | — | — | N/A |
| E09 | Loading skeleton | message | — | — | Conditional | — | static | placeholder rows | — | N/A |
| E10 | Empty message | message | — | — | Conditional | — | static | text | — | N/A |
| E11 | Error message with Thử lại | message | — | — | Conditional | Retries loading | static | text + button | — | N/A |
| E12 | Older-items loader / retry | message | — | — | Conditional | Loads older items | static | spinner or retry | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation belongs in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Open notification | E03 | click | list shown | The row becomes read (dot gone); if marking fails the detail still opens, the dot stays and the failure is announced (Codex R19) | TBD (draft) |
| Mark all read | E02 | click | at least one unread | All dots disappear; the bell dot clears | TBD (draft) |
| Show full history | E08 | click | more items than shown | Older rows are added below as the Sunner scrolls | TBD (draft) |
| Retry loading | E11 | click | error shown | Loading starts again | TBD (draft) |
| Retry older items | E12 | click | older page failed | Loads that page again | TBD (draft) |
| Close panel | — | click outside / Esc / bell | panel open | Panel closes | TBD (draft) |

### Happy Path

1. The Sunner clicks the bell; the panel opens and shows a loading skeleton in R2.
2. Rows appear newest first, unread ones with a dot.
3. The Sunner clicks a row; the row loses its dot.
4. The Sunner presses "Đánh dấu đọc tất cả"; the remaining dots disappear.
5. The Sunner presses "Xem tất cả" and scrolls; older rows appear.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 2 | No notifications | Empty message replaces the list; mark-all disabled | TBD (draft) |
| Step 2 | Loading fails | Error message with retry | TBD (draft) |
| Step 4 | Marking fails | Dots stay; a short message appears and is announced; when opening one row, the detail window still opens (same rule as SCR-notification-detail, Codex R19) | TBD (draft) |
| Step 5 | Older page fails | Loaded rows stay; retry shown at the end | TBD (draft) |

### Interaction Notes

- **Opening the panel does not mark anything read; only opening a row or mark-all does** — source: TBD (draft)
- **Item text follows the language chosen in the header** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | list request in flight | skeleton rows in R2 | close | TBD (draft) |
| empty | no notifications | E10 message, mark-all disabled, no "Xem tất cả" | close | TBD (draft) |
| error | list request fails | E11 message with retry | retry, close | TBD (draft) |
| saving | mark-all in flight | E02 disabled with spinner | none | TBD (draft) |
| success | mark-all done | all dots gone, bell dot cleared | continue reading | TBD (draft) |
| loading-more | older page in flight | E12 spinner at list end | scroll | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E02 | Only available when something is unread | Button disabled, no message | change |
| E02 | Marking must succeed for the dots to clear | "Không thể đánh dấu đã đọc. Vui lòng thử lại." (wording pending) | server response |
| E03 | Opening must be recorded as read | Row keeps its dot and a short message appears if recording fails | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| A notification is unread | configuration | E07 | that row is unread | that row is read | Bell dot follows "any unread" |
| The Sunner has no notifications | configuration | E10 | list is empty | list has rows | Disables E02 and hides E08 |
| There is more history to show | configuration | E08 | more items exist than shown | everything is already shown | "Xem tất cả" loads older pages in this same panel (D001, resolved) |
| A message is a spam warning | configuration | E05 | kind is "kudo breaks community standards" | other kinds | Message contains an inline "Tiêu chuẩn cộng đồng" link |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`; rows not yet in the screen flow are `TBD (draft)`.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR-app-shell | Click the notification bell (E05 there) | signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Open notification | E03 | any kind except Secret Box notice | SCR-notification-detail | modal | TBD (draft) |
| Open Secret Box notice | E03 | Secret Box notice | Secret Box flow (F008) | modal | TBD (draft) |
| Follow community standards link | E05 | spam warning | Community Standards (F004) | redirect | TBD (draft) |
| Close | — | — | (stays on screen) | panel closes | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Panel as a labelled dialog; list items as buttons with unread state in the name |
| Keyboard navigation | [EXPECTED] | Tab through actions and rows; Enter opens a row; Esc closes |
| Focus management | [EXPECTED] | Focus moves into the panel on open and back to the bell on close |
| Screen reader compatibility | [EXPECTED] | Unread state and time read out with each row |
| Error announcement | [EXPECTED] | Load and mark failures announced politely |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
