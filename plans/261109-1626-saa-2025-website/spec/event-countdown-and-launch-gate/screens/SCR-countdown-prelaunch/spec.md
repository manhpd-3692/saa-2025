---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-countdown-prelaunch — Screen Spec

**Screen**: SCR-countdown-prelaunch (code allocated at promote): Countdown - Prelaunch
**Feature**: F003_EventCountdownGate
**Type**: atomic
**Route**: `/countdown`
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A visitor who opens the site before the event starts sees how many days, hours and minutes remain until it opens.
**Actors:** Sunner (visitor), signed in or not
**Entry Conditions:** The event start time is still in the future, and the visitor opened any page (the site redirects them here) or this address directly.
**Exit Conditions:** The countdown reaches the start moment and the visitor is moved to the Homepage; or the visitor opens this page after the start time and is moved on immediately.

## 2. Screen Layout

### Layout Sketch

Full-screen dark page (#00101A) with no header, footer or navigation. A colourful abstract wave artwork fills the right side, covered by a gradient so text stays readable. A centred block holds the title and, below it, three countdown units side by side. Design source: Figma frame `2268:35127`.

```
┌─────────────────────────────────────────────────┐
│ R1: Background art + gradient (static, full)    │
│        ┌───────────────────────────────┐        │
│        │ R2: Countdown content (centre)│        │
│        │   "Sự kiện sẽ bắt đầu sau"    │        │
│        │  [0 7]    [1 2]    [3 5]      │        │
│        │  DAYS     HOURS    MINUTES    │        │
│        └───────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Background and gradient | static | no | TBD (draft) |
| R2 | Countdown content | static | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Background artwork | image | — | Shown | Always | — | static | cover-fit | — | N/A |
| E02 | Gradient overlay | region label | — | Shown | Always | — | static | — | — | N/A |
| E03 | Title "Sự kiện sẽ bắt đầu sau" | text | — | Shown | Conditional | — | static | white, bold | — | N/A |
| E04 | Days digits (two boxes) | display field | — | 00 | Conditional | — | computed | two digits, zero-padded | — | TBD (draft) |
| E05 | Hours digits (two boxes) | display field | — | 00 | Conditional | — | computed | two digits, zero-padded | — | TBD (draft) |
| E06 | Minutes digits (two boxes) | display field | — | 00 | Conditional | — | computed | two digits, zero-padded | — | TBD (draft) |
| E07 | Unit labels DAYS / HOURS / MINUTES | text | — | Shown | Conditional | — | static | uppercase, bold | — | N/A |
| E08 | "Coming soon" message | message | — | Hidden | Conditional | — | static | — | — | N/A |
| E09 | Screen-reader time announcement | message | — | Hidden visually | Always | — | computed | e.g. "7 days 12 hours 35 minutes" | — | N/A |

Days digits widen to three boxes when more than 99 days remain (decision D005 in the feature spec, resolved).

## 4. User Actions

### Available Actions

N/A — no elements carry a discrete user-triggered action.

### Happy Path

1. The page opens with the dark background and artwork already visible.
2. The title and the three units appear with the current remaining days, hours and minutes.
3. The numbers update by themselves as time passes, with no user input.
4. At the start moment the countdown ends and the visitor is handed to another screen (see `## 8. Navigation`).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 2 | Start time cannot be loaded | Title and digits hidden; "Coming soon" message shown (E08) | TBD (draft) |
| Step 2 | Event already started | Page never renders content; visitor is moved on at once | TBD (draft) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Page arriving | Background and gradient visible immediately; digits show 00 until data lands (usually server-supplied, so brief) | none | TBD (draft) |
| active countdown | Start time loaded, still in future | Title, digits and labels visible; digits tick | none | TBD (draft) |
| error | Start time cannot be loaded | "Coming soon" message, no digits | none | TBD (draft) |
| complete | Remaining time reaches 0 ms, or a re-check on tab focus reports the event has started | Optional short fade, then the visitor is moved to the Homepage (launch mode only, Codex R08); during the final minute the digits already read 00 00 00 and the page waits | none | TBD (draft) |
| empty | Not applicable — the page displays one value set, not a list | — | — | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The start time is available | configuration | E03, E04, E05, E06, E07 | start time loaded | start time unavailable | Fallback is E08 |
| The start time is unavailable | configuration | E08 | start time unavailable | start time loaded | Message only, no countdown |
| The browser supports background blur | hardcoded-id | E04, E05, E06 | blur supported: frosted glass boxes | not supported: solid semi-transparent boxes | Fallback look accepted (applied default AD14) |

## 8. Navigation

> `## 8. Navigation` is the **per-screen projection** of `screen-flow.md § Screen Access Paths`; no destination here is invented. Paths come from `docs/SCREENFLOW.md` (Login → Gate → Countdown; Countdown → Home).

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external (direct address) | Visitor opens the site or this address | Event not started | TBD (draft) |
| Any page | Automatic redirect | Event not started | TBD (draft) |
| Login | Successful Google sign-in | Event not started | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Countdown reaches zero | — | Start time reached | Homepage SAA | redirect | TBD (draft) |
| Page opened after start | — | Event already started | Homepage SAA | redirect | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Polite live region announces the remaining time when the minute changes |
| Keyboard navigation | [EXPECTED] | No interactive elements; nothing to tab to |
| Focus management | [EXPECTED] | None needed; page is informational |
| Screen reader compatibility | [EXPECTED] | Page language marked Vietnamese; announcement reads full words, not digit boxes |
| Error announcement | [EXPECTED] | "Coming soon" message announced politely |

## 10. Responsive Behavior

Release acceptance is desktop only (AD01, Codex R17): minimum viewport width 1280 px; below that the page keeps its desktop layout and scrolls horizontally. The mobile and tablet rows below are kept as design history only.

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| mobile (<768px) | E04, E05, E06 | Out of release scope (AD01, R17). Inherited: digit boxes scale down; units may stack vertically | TBD (draft) |
| mobile (<768px) | R1 | Out of release scope (AD01, R17). Inherited: background artwork repositioned | TBD (draft) |
| tablet (768-1024px) | E04, E05, E06 | Out of release scope (AD01, R17). Inherited: slightly smaller boxes; horizontal layout kept | TBD (draft) |
| desktop (>=1280px) | R1, R2 | Full layout; artwork fully visible on the right | TBD (draft) |
| below 1280px | R1, R2 | Desktop layout unchanged; horizontal scroll (Codex R17) | TBD (draft) |
