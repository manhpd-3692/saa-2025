---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-notification-detail — Screen Spec

**Screen**: SCR-notification-detail: View thông báo (notification detail)
**Feature**: F009_Notifications
**Type**: atomic
**Route**: window over the notification panel (Figma `589:9152`); content in this spec is the team's default until the frame is read in detail
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner reads one notification in full and takes the next step it points to (view the kudo, read the community standards, go to their profile).
**Actors:** Sunner
**Entry Conditions:** The Sunner selected a notification in the panel, and it is not a Secret Box notice (those go straight to the Secret Box flow).
**Exit Conditions:** The window is closed (back to the panel), or the Sunner follows the action or link to another page.

## 2. Screen Layout

### Layout Sketch

A centered window over the dimmed panel and page. Top: the notification's type icon and title area. Middle: the full message text with any inline link, and the time. Bottom: one action button and a close control. Desktop layout only.

```
┌──────────────────────────────────────────┐
│ R1: [icon]  Title                  [ X ] │
├──────────────────────────────────────────┤
│ R2: Full message text ...                │
│     ... inline link ...                  │
│     Time: 12/11/2025 14:05               │
├──────────────────────────────────────────┤
│ R3:                    [ Action button ] │
└──────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Window header | static | no | TBD (draft) |
| R2 | Message body | static | yes | TBD (draft) |
| R3 | Window footer | static | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Type icon | image | — | by kind | Always | — | computed | icon per kind | generic icon | N/A |
| E02 | Title | display field | — | — | Always | — | computed | localized text per kind | dash | N/A |
| E03 | Full message | display field | — | — | Always | — | computed | localized text from kind and values | dash | N/A |
| E04 | Inline link "Tiêu chuẩn cộng đồng" | link | — | — | Conditional | Opens Community Standards | static | — | — | N/A |
| E05 | Time | display field | — | — | Always | — | API field | absolute date and time | dash | N/A |
| E06 | Action button | button | — | — | Conditional | Goes to the notification's target | computed | label per kind (e.g. view kudo) | — | N/A |
| E08 | Unavailable message | message | — | — | Conditional | — | static | text | — | N/A |
| E09 | Close | button | — | — | Always | Closes the window | static | — | — | N/A |

There is no admin review notice and no Hợp lệ / Tạm ẩn / Reject buttons on this window (G10); E07 is intentionally unused.

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation belongs in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Close | E09 | click / Esc / click outside | — | Window closes, panel shows again | TBD (draft) |
| Follow action | E06 | click | target is available | Leaves the window (see Navigation) | TBD (draft) |
| Follow standards link | E04 | click | spam warning | Opens Community Standards | TBD (draft) |

### Happy Path

1. The Sunner opens a notification in the panel; this window appears over it with the full message and time (R1, R2).
2. The notification is shown as read in the panel behind once marking it read succeeds; if marking fails it keeps its unread dot (Codex R19).
3. The Sunner presses the action button in R3.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 3 | The kudo or target is no longer available | E06 replaced by E08 | TBD (draft) |
| Step 1 | Notification has no target (generic message) | No E06 | TBD (draft) |

### Interaction Notes

- **Opening this window asks to mark the notification read; the window opens even when that fails, the unread dot stays and the failure is announced — same as the panel (Codex R19)** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | none — content is already in hand from the panel | N/A | N/A | TBD (draft) |
| error | marking as read failed | window still open; short message below the text, announced politely; text stays readable; the item keeps its unread dot in the panel and the bell count is unchanged (Codex R19) | close, follow action | TBD (draft) |
| success | window shown | full content visible | close, follow action | TBD (draft) |
| unavailable | target kudo hidden or removed | E08 instead of E06 | close | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E08 | Target must still be viewable | "This kudo is no longer available." | server response |
| E03 | Read state must be recorded | "Could not mark as read." (wording pending) | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The message has a rules link | configuration | E04 | kind is "kudo breaks community standards" | other kinds | Opens Community Standards |
| The notification has a target | configuration | E06 | kind has a target and it is available | generic kind or unavailable target | E08 replaces it when unavailable |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`; rows not yet in the screen flow are `TBD (draft)`.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR-notification-panel | Select a notification row | not a Secret Box notice | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Close | E09 | — | SCR-notification-panel | window closes | TBD (draft) |
| Follow standards link | E04 | spam warning | Community Standards (F004) | redirect | TBD (draft) |
| Follow action | E06 | kudo-related notice | Kudo detail (F006) | TBD (draft) | TBD (draft) |
| Follow action | E06 | level or icon notice | Own profile (F007) | TBD (draft) | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Labelled dialog with the title as its name |
| Keyboard navigation | [EXPECTED] | Tab order text link, action, close; Esc closes |
| Focus management | [EXPECTED] | Focus trapped inside; returns to the opened row on close |
| Screen reader compatibility | [EXPECTED] | Message and time read in order |
| Error announcement | [EXPECTED] | Read-state failure announced politely |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
