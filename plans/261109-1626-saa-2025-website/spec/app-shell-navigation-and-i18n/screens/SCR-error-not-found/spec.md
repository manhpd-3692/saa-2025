---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-error-not-found — Screen Spec

**Screen**: SCR-error-not-found: Error page - 404 (Figma `1378:5063`)
**Feature**: F001_AppShellI18n
**Type**: atomic
**Route**: shown for any address that does not exist
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** Tells a Sunner who followed a wrong or outdated address that the page does not exist and gets them back to Homepage.
**Actors:** Sunner, Visitor
**Entry Conditions:** The requested address matches no page.
**Exit Conditions:** The user clicks the way back to Homepage, or uses the language switch of the minimal frame.

## 2. Screen Layout

### Layout Sketch

A single centered message block inside the minimal frame, for every viewer, signed in or not (D003 as revised by Codex R07; the root `app/not-found.tsx` wraps itself in the same minimal chrome as Login): large "404", short message, one button. Desktop only (AD01, R17).

```
┌──────────────────────────────┐
│ R1: Language switch          │
├──────────────────────────────┤
│ R2: Message block (centered) │
│      404                     │
│      message                 │
│      [ Back to Homepage ]    │
├──────────────────────────────┤
│ R3: Copyright line           │
└──────────────────────────────┘
```

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Error code "404" | display field | — | — | Always | — | static | raw | — | N/A |
| E02 | Message "This page could not be found." *(copy to confirm)* | message | — | — | Always | — | static | localized text | — | N/A |
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
| default | unknown address | message block shown, page status is "not found" | E03 | TBD (draft) |
| English | active language is English | all text in English | E03 | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Frame variant | configuration | R1, R3 | always (minimal frame: language switch and copyright) | — | D003 revised by Codex R07: no full frame on this page |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| any page or typed address | request for an address that does not exist | — | TBD (draft) |

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
