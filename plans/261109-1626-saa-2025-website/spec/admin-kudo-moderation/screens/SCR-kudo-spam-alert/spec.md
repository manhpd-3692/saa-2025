---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-kudo-spam-alert — Screen Spec

**Screen**: SCR-kudo-spam-alert: KUDO spam / Alert Overlay
**Feature**: F011_AdminKudoModeration
**Type**: atomic
**Route**: `/kudos/[id]` (overlay on the kudo detail page of F006; Figma `3127:24099`, `3127:24672`)
**Generated**: 2026-11-10

## 1. Overview

**Purpose:** The author of a kudo that an admin marked Spam is told that it is hidden and why, and is pointed to the community standards.
**Actors:** Author (the Sunner who sent the kudo)
**Entry Conditions:** Signed-in Sunner opens the detail of their own kudo while its status is Spam, for example from the spam-warning notification.
**Exit Conditions:** The author closes the overlay (the kudo detail stays behind it), follows the standards link, or leaves the page.

## 2. Screen Layout

### Layout Sketch

The author's kudo detail is shown dimmed. A centred alert card lies on top: a warning icon, a heading, a short explanation, a link "Tiêu chuẩn cộng đồng" and a close control. Desktop layout only.

```
┌──────────────────────────────────────────────────────────────┐
│ R1 Kudo detail, dimmed (F006)                                │
│        ┌────────────────────────────────────┐                │
│        │ R2 Alert card                      │                │
│        │ ⚠  Your kudo was hidden            │                │
│        │ text …  Tiêu chuẩn cộng đồng       │                │
│        │                         [ Close ]  │                │
│        └────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Kudo detail behind the overlay | static | no | TBD (draft) |
| R2 | Alert card | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Alert icon | icon | — | — | Conditional | — | static | warning icon | — | N/A |
| E02 | Heading | label | — | — | Conditional | — | static | short statement that the kudo is hidden (copy per D014) | — | N/A |
| E03 | Explanation | text | — | — | Conditional | — | static | says the kudo breaks the community standards and is no longer on the live board | — | N/A |
| E04 | Standards link "Tiêu chuẩn cộng đồng" | link | — | — | Conditional | Opens the Community Standards page | static | link text | — | N/A |
| E05 | Close | button | — | Enabled | Conditional | Closes the overlay | — | — | — | N/A |

## 4. User Actions

> **Scope:** within-screen interactions only. Cross-screen navigation is in `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Close the alert | E05 | click, or Escape | — | Overlay closes; the kudo detail is readable | TBD (draft) |
| Read the standards | E04 | click | — | Community Standards page opens | TBD (draft) |

### Happy Path

1. The author opens their own Spam kudo from the warning notification.
2. The overlay shows over the kudo detail.
3. The author follows "Tiêu chuẩn cộng đồng" to read the rules, or closes the overlay to read their kudo.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 2 | The kudo was restored to Public before the page loaded | No overlay | TBD (draft) |
| Step 2 | The viewer is an admin | No overlay; a plain "marked as spam" notice shows in the detail page's notice slot | TBD (draft) |
| Step 2 | The viewer is neither author nor admin | Not-found page of the detail screen; no overlay | TBD (draft) |

### Interaction Notes

- **The overlay appears each time the author opens the kudo while it is Spam, not once only** (D005, resolved) — source: TBD (draft)
- **Editing the kudo stays unavailable while it is Spam** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| shown | author opens own Spam kudo | alert card over the dimmed detail | Close, follow link | TBD (draft) |
| closed | Close or Escape | overlay gone, detail readable | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E02, E03 | Text comes from the VN/EN dictionaries | Wording to be supplied *(copy to confirm)* | load |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The viewer sent the kudo and it is Spam | auth | whole overlay | both true | kudo is Public, or viewer is not the sender | an admin sees only the plain notice of the detail page |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Notification detail (F009) | action button of the spam-warning notice opens the kudo (D005, resolved) | author of a Spam kudo | TBD (draft) |
| Kudo detail (F006) | open the kudo by address or link | author of a Spam kudo | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Read the standards | E04 | — | Community Standards (F004, TBD (draft)) | redirect | TBD (draft) |
| Close | E05 | — | (stays on the kudo detail) | overlay closes | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | alert dialog with heading as its label |
| Keyboard navigation | [EXPECTED] | focus moves into the card on open; Tab cycles link and Close; Escape closes |
| Focus management | [EXPECTED] | focus is trapped while open and returns to the page when closed |
| Screen reader compatibility | [EXPECTED] | the alert text is announced on open |

## 10. Responsive Behavior

N/A — desktop only (shared decision of the app shell).
