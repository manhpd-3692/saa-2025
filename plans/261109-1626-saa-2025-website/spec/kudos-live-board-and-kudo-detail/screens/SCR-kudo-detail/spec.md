---
status: draft
authored_by: takumi
created: 2026-11-09
---

# SCR-kudo-detail — Screen Spec

**Screen**: SCR-kudo-detail: View Kudo
**Feature**: F006_KudosLiveBoard
**Type**: atomic
**Route**: `/kudos/[id]` (Figma `520:18779`); shown over the Live board when opened from it, full page when a copied link is opened directly (resolved D005)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A signed-in Sunner reads one kudo in full, copies its link to share, and closes it.
**Actors:** Sunner, Admin
**Entry Conditions:** Signed in; clicked a kudo card on the Live board, or opened a copied kudo link; the kudo is public, or the viewer is its sender or an admin.
**Exit Conditions:** Pressed "Đóng" (back to the Live board), opened a Sunner profile, or started editing their own kudo.

## 2. Screen Layout

### Layout Sketch

One enlarged kudo card centered over a dimmed Live board (or over a fresh board when opened by link). The card reads top to bottom: sender → receiver block, timestamp, title, content, images, hashtags, heart count, then a button row with "Copy Link" and "Đóng". Long content scrolls inside the card. Breakpoints: TBD (draft).

```
┌─────────────────────────────────────────────────┐
│ R1: [sender avatar/name/unit/badge] → [receiver] │
│     10:00 - 10/30/2025                           │
├─────────────────────────────────────────────────┤
│ R2: Title (Danh hiệu)                            │
│     Content (scrolls if long)                    │
│     [img][img][img][img][img]                    │
│     #hashtag #hashtag                            │
├─────────────────────────────────────────────────┤
│ R3: ♥ 12                 [ Copy Link ] [ Đóng ]  │
└─────────────────────────────────────────────────┘
 over: dimmed Live board (R0, modal backdrop)
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R0 | Backdrop | fixed | no | TBD (draft) |
| R1 | People and time | static | no | TBD (draft) |
| R2 | Kudo body | static | yes (long content) | TBD (draft) |
| R3 | Hearts and actions | static | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Sender | display field | — | Name, unit code, badge | Always | Click opens profile; hover shows info card | API field | avatar + name + unit code | "Ẩn danh" with placeholder avatar | `users`, `units.code` (Codex R15) |
| E02 | Receiver | display field | — | Name, unit code, badge | Always | Click opens profile; hover shows info card | API field | avatar + name + unit code | dash | `users`, `units.code` |
| E03 | Hero badges | image | — | Badge slots | Always | Hover shows badge info (F008) | F008 slot | — | hidden | N/A |
| E04 | Timestamp | display field | — | — | Always | — | API field | "HH:mm - MM/dd/yyyy" | dash | `kudos.created_at` |
| E05 | Title (Danh hiệu) | display field | — | — | Always | — | API field | full text | dash | `kudos.title` |
| E06 | Content | display field | — | — | Always | — | API field | formatted text with links and mentions | dash | `kudos.content` |
| E07 | Images (up to 5) | image | — | — | Conditional | — | API field | in the sender's order; signed links to random file names, nothing names the uploader (Codex R01) | hidden | `kudo_images`, `kudo_uploads.object_path` |
| E08 | Hashtag group | list | — | — | Always | — | API field | chips with # | hidden | `hashtags.name` |
| E09 | Heart count and button | button | — | Weighted total | Always | Hearts the kudo (F008) | F008 slot | number | 0 | `kudo_heart_state` |
| E10 | Copy Link | button | — | Enabled | Always | Copies this kudo's address | — | — | — | N/A |
| E11 | Đóng | button | — | Enabled | Always | Closes the view | — | — | — | N/A |
| E12 | Edit entry | button | — | Hidden | Conditional | Opens the write window prefilled (F005); sits next to Đóng | — | — | — | N/A |
| E13 | Spam notice | message | — | Hidden | Conditional | — | F011 slot | — | hidden | `kudos.status` |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Copy link | E10 | click | — | Button shows "Link copied" briefly | TBD (draft) |
| Close | E11 | click or Esc | — | The view closes | TBD (draft) |
| Preview Sunner | E01, E02 | hover or focus | Sender not hidden | Info card opens after a short delay | TBD (draft) |
| Edit | E12 | click | Viewer is the sender and the kudo is not marked spam | Write window opens over this view | TBD (draft) |

### Happy Path

1. Sunner clicks a kudo card on the Live board and the enlarged card opens in R1–R3.
2. Sunner reads title, content and images.
3. Sunner presses Copy Link in R3 and sees "Link copied".
4. Sunner presses Đóng and the view closes.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 1 | Kudo missing, or not public and viewer not sender/admin | The shell's not-found page shows instead of the card | TBD (draft) |
| Step 1 | Link opened directly | The card shows over a freshly loaded board | TBD (draft) |
| Step 3 | Clipboard blocked | Link shown selected for manual copy | TBD (draft) |

### Interaction Notes

- **Pressing Esc or clicking the backdrop closes the view like Đóng** `[EXPECTED]` — source: `TBD (draft)`
- **Closing returns the reader to the same place on the board** — source: `TBD (draft)`

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Kudo request in flight | Card skeleton | Đóng | TBD (draft) |
| error | Request fails | Message with Retry inside the card | Retry, Đóng | TBD (draft) |
| not found | Kudo missing or not viewable | The shell's not-found page | Go home (shell) | TBD (draft) |
| success (copy) | Link copied | "Link copied" on the button, clears itself | none | TBD (draft) |
| anonymous sender | Kudo sent anonymously, viewer not admin | Placeholder avatar and "Ẩn danh"; no hover or link | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E10 | Needs clipboard permission | "Link copied" or "Press Ctrl+C to copy." (draft wording, D010) | click |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The kudo was sent anonymously and the viewer is not an admin | auth | E01 | "Ẩn danh" shown | Name, avatar, unit, link, hover card hidden | Admins see the real sender |
| The viewer is the sender and the kudo is not marked spam | auth | E12 | Edit entry shown next to Đóng | Hidden for everyone else | Resolved D008 (F005 D015) |
| The kudo is marked spam and the viewer is its sender or an admin | auth | E13 | Notice from the spam handling feature (F011) shown | Hidden for public kudos | Overlay content belongs to F011 |
| The kudo has images | configuration | E07 | 1 to 5 images exist | No images | Row is omitted |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR-kudos-live-board | Click a kudo card | — | TBD (draft) |
| External | A copied kudo link | Signed in (otherwise sign-in first, then back here) | TBD (draft) |
| Notifications panel | A kudo-related notice | Signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Close | E11 | — | SCR-kudos-live-board | redirect (or back to the board underneath) | TBD (draft) |
| Open Sunner profile | E01, E02 | Sender not hidden | Profile screens (F007) | redirect | TBD (draft) |
| Edit kudo | E12 | Viewer is the sender and the kudo is not marked spam | Write-kudo window (F005) | modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Container is a labelled dialog whose name is the kudo title |
| Keyboard navigation | [EXPECTED] | Tab order: people, content links, hearts, Copy Link, Đóng; Esc closes |
| Focus management | [EXPECTED] | Focus moves into the dialog on open, is trapped, and returns to the clicked card on close |
| Screen reader compatibility | [EXPECTED] | Images carry text alternatives; the anonymous label is read as "Anonymous" |
| Error announcement | [EXPECTED] | "Link copied" and error messages use a live region |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
