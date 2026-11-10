---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-error-forbidden — Screen Spec

**Screen**: SCR-error-forbidden: Error page - 403 (Figma `2182:9291`)
**Feature**: F001_AppShellI18n
**Type**: atomic
**Route**: shown under any `/admin/*` address when a signed-in user's role is not admin — rendered by `app/admin/layout.tsx` as a plain component (AD15), not a route of its own
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** Tells a signed-in Sunner that the page they requested is not available to them and gets them back to Homepage.
**Actors:** Sunner
**Entry Conditions:** The user has a session but lacks the role needed for the requested page (for example a non-admin requesting an admin address); the role is the one the backend returns for the signed-in user.
**Exit Conditions:** The user clicks the way back to Homepage, or uses the language switch of the minimal frame.

## 2. Screen Layout

### Layout Sketch

Same layout as the "page not found" screen: centered message block inside the minimal frame (language switch and copyright; D003 as revised by Codex R07), with "403", a short message and one button. The admin layout shows this instead of the admin header and the admin page. Desktop only (AD01, R17).

```
┌──────────────────────────────┐
│ R1: Language switch          │
├──────────────────────────────┤
│ R2: Message block (centered) │
│      403                     │
│      message                 │
│      [ Back to Homepage ]    │
├──────────────────────────────┤
│ R3: Copyright line           │
└──────────────────────────────┘
```

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Error code "403" | display field | — | — | Always | — | static | raw | — | N/A |
| E02 | Message "You do not have access to this page." *(copy to confirm)* | message | — | — | Always | — | static | localized text | — | N/A |
| E03 | Back to Homepage | button | — | enabled | Always | Goes to Homepage | static | localized text | — | N/A |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Go back to Homepage | E03 | click | — | leaves this screen | TBD (draft) |

### Happy Path

1. User sees E01 and E02 in the message block.
2. User clicks E03 — the Homepage opens.

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| default | access refused | message block shown; acceptance is visual only — the document's HTTP status code is not asserted (Codex R18) | E03 | TBD (draft) |
| English | active language is English | all text in English | E03 | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

N/A — no conditional UI detected.

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| any admin page address | request by a user without the admin role | signed in, not admin | TBD (draft) |
| any admin page (client) | a Go `/api/v1/admin/...` call answers HTTP 403 | role lost since the page loaded | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Back to Homepage | E03 | — | Homepage SAA | redirect | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | message block is the main landmark; heading carries the message |
| Keyboard navigation | [EXPECTED] | E03 reachable by Tab, Enter activates |
| Focus management | [EXPECTED] | focus starts at the top of the message block |
| Screen reader compatibility | [EXPECTED] | `lang` follows the active language |
| Error announcement | [EXPECTED] | the message is a heading, no live region needed |

## 10. Responsive Behavior

Desktop only (AD01, R17): minimum viewport width 1280 px; narrower windows keep the desktop layout with horizontal scroll.
