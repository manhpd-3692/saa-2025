---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-hero-badge-and-campaign-hover — Screen Spec

**Screen**: SCR-hero-badge-and-campaign-hover: Hover overlays for hero badge tiers and the heart campaign
**Feature**: F008_KudosGamification
**Type**: atomic
**Route**: floating overlays on any page that shows a hero badge or the campaign badge (Figma New Hero `3241:14991`, Rising Hero `3241:14995`, Super Hero `3241:14999`, Legend Hero `3241:15003`, campaign `3241:15021`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner hovers a hero badge to learn which tier it is and what it takes, or hovers the campaign badge to learn about a running heart boost.
**Actors:** Sunner
**Entry Conditions:** Signed-in Sunner hovers or keyboard-focuses a hero badge (kudo card on the Live board or in a profile's kudo lists, avatar hover card — never the profile header, F007 D006, Codex N10) or the campaign badge while a campaign is active.
**Exit Conditions:** Pointer or focus leaves the badge and the overlay disappears.

## 2. Screen Layout

### Layout Sketch

A small tooltip-style card anchored next to the badge it explains, above the page content. Hero overlay: tier name and the sender range. Campaign overlay: campaign name, multiplier and the start–end period. One overlay is open at a time. Responsive breakpoints: TBD (draft).

```
          ┌────────────────────────────┐
 [badge]  │ R1: Tier name              │
   ▲      │     "1–4 senders" range    │
   └──────┴────────────────────────────┘
          ┌────────────────────────────┐
 [x2]     │ R2: Campaign x2 heart      │
   ▲      │     start – end time       │
   └──────┴────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Hero badge overlay | floating | no | TBD (draft) |
| R2 | Campaign overlay | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Hero badge (trigger) | image | — | Tier artwork | Conditional | Hover or focus opens E02 | API field | tier artwork; `heroTier` computed in Go on every read and carried in the host screen's response | hidden | TBD (draft) |
| E02 | Tier name | display field | — | New Hero / Rising Hero / Super Hero / Legend Hero | Conditional | — | computed | raw | hidden | TBD (draft) |
| E03 | Tier requirement | display field | — | "1–4 senders", "5–9 senders", "10–20 senders", "more than 20 senders" | Conditional | — | static | raw | hidden | TBD (draft) |
| E04 | Campaign badge (trigger) | image | — | "x2" style badge | Conditional | Hover or focus opens E05 | API field | raw | hidden | TBD (draft) |
| E05 | Campaign name | display field | — | e.g. "Campaign x2 heart" | Conditional | — | API field | raw | hidden | TBD (draft) |
| E06 | Campaign multiplier | display field | — | e.g. "x2" | Conditional | — | API field | "x" + whole number 2–10; with overlapping campaigns, the highest one (the weight a heart gets now) | hidden | TBD (draft) |
| E07 | Campaign period | display field | — | start and end date-time | Conditional | — | API field | date-time format TBD (draft) | hidden | TBD (draft) |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Show tier info | E01 | hover or focus | Sunner has a tier | Overlay with E02, E03 appears | TBD (draft) |
| Show campaign info | E04 | hover or focus | A campaign is active | Overlay with E05, E06, E07 appears | TBD (draft) |
| Hide overlay | E01, E04 | pointer leaves, blur, Esc | — | Overlay disappears | TBD (draft) |

### Happy Path

1. Sunner moves the pointer onto a hero badge in R1's anchor spot.
2. After a short delay the overlay appears with the tier name and requirement.
3. Sunner moves the pointer away and the overlay disappears.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 1 | Sunner hovers the campaign badge | Campaign overlay (R2) appears instead | TBD (draft) |
| Step 1 | Sunner has no tier | No badge, so no overlay | TBD (draft) |

### Interaction Notes

- **Keyboard focus shows the same overlay as hover** — source: `TBD (draft)` (assumed, not in design)
- **Touch devices: not designed; mobile and tablet are out of scope** — source: `TBD (draft)`

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | tier or campaign still loading | badge not shown yet | none | TBD (draft) |
| empty | Sunner has no tier / no active campaign | no badge, no overlay | none | TBD (draft) |
| error | tier or campaign display lookup fails | badge hidden, page keeps working; a failed campaign badge load never changes heart weight — each heart does its own campaign check and is refused (not saved at weight 1) if that check fails (Codex R09) | none | TBD (draft) |
| saving | N/A — nothing is submitted | — | — | TBD (draft) |
| success | overlay shown | tier or campaign details visible | move away to dismiss | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Sunner has received kudos from at least one colleague | configuration | E01, E02, E03 | One or more distinct senders | No senders | Data-driven, not an access rule |
| A heart campaign is running now | configuration | E04, E05, E06, E07 | Current time is within the campaign window | No campaign active | Campaign set by admin (F012); data from Go `GET /api/v1/campaigns/active` |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`; it is not a second source of truth. Destinations not yet in `screen-flow.md` are `TBD (draft)`.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR-kudos-live-board (F006) | Hover a hero badge on a kudo card or avatar card | Sunner has a tier | TBD (draft) |
| SCR-own-profile / SCR-other-profile (F007) | Hover the badge on a kudo card in the profile's kudo lists (the profile header has no badge, F007 D006, Codex N10) | Sunner has a tier | TBD (draft) |
| SCR-kudos-live-board (F006) | Hover the campaign badge next to the heart control | A campaign is active (functional D013, resolved) | TBD (draft) |

### Exits

N/A — this screen has no exits (terminal screen).

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Badge has an accessible name (tier or campaign); overlay is a tooltip described-by the badge |
| Keyboard navigation | [EXPECTED] | Badge focusable; focus opens the overlay, Esc closes |
| Focus management | [EXPECTED] | Focus stays on the badge; overlay never takes focus |
| Screen reader compatibility | [EXPECTED] | Tier name and requirement read as the badge description |
| Error announcement | [EXPECTED] | N/A — no errors are raised on this screen |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
