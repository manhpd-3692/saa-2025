---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-HomepageSaa — Screen Spec

**Screen**: SCR-HomepageSaa: Homepage SAA (Figma `2167:9026`)
**Feature**: F004_StaticEventContent
**Type**: composite
**Route**: `/`
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A signed-in Sunner lands here after the event starts to see the event branding, time remaining, event details, the six awards and the Kudos movement.
**Actors:** Sunner
**Entry Conditions:** Signed-in session and event already started.
**Exit Conditions:** The Sunner leaves for Awards Information, the Kudos board, or another page via header/footer.

## 2. Screen Layout

### Layout Sketch

Full-width dark page over a key visual. Header (fixed top, shared shell) and footer (shared shell) frame five stacked content regions; a floating action button (shared shell) stays fixed bottom-right. Award cards form a 3-column grid. Release acceptance is desktop only (minimum width 1280 px; narrower windows keep this layout with horizontal scroll); inherited tablet/mobile grids are out of release scope (AD01, R17).

```
┌───────────────────────────────────────────┐
│ R1: Header (fixed-top, shared shell)      │
├───────────────────────────────────────────┤
│ R2: Hero — logo, countdown, event info,   │
│     CTAs [ABOUT AWARDS] [ABOUT KUDOS]     │
├───────────────────────────────────────────┤
│ R3: About the event (long-form text)      │
├───────────────────────────────────────────┤
│ R4: Award system — 3 x 2 award cards      │
├───────────────────────────────────────────┤
│ R5: Sun* Kudos promo block                │
├───────────────────────────────────────────┤
│ R6: Footer (shared shell)        [FAB]    │
└───────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | fixed-top | no | TBD (draft) |
| R2 | Hero | static | yes | TBD (draft) |
| R3 | About the event | static | yes | TBD (draft) |
| R4 | Award system | static | yes | TBD (draft) |
| R5 | Sun* Kudos promo | static | yes | TBD (draft) |
| R6 | Footer | static | yes | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Root Further logo | image | — | Shown | Always | — | static | raw | hidden | N/A |
| E02 | "Coming soon" label | region label | — | Shown | Always | — | static | raw | — | N/A |
| E03 | Days / Hours / Minutes | display field | — | 00 | Always | — | computed (time left to the event ceremony time) | two-digit zero-padded; 00 once the ceremony time is reached, then stops; never redirects (Codex R08) | 00 | N/A |
| E04 | Event date | display field | — | — | Always | — | event record (ceremony time) | localized date and time | dash | N/A |
| E05 | Venue | display field | — | — | Always | — | event record | raw | dash | N/A |
| E06 | Livestream note | display field | — | — | Always | — | event record | raw | hidden | N/A |
| E07 | ABOUT AWARDS | button | — | Enabled | Always | Opens Awards Information | — | — | — | N/A |
| E08 | ABOUT KUDOS | button | — | Enabled | Always | Opens the Kudos board | — | — | — | N/A |
| E09 | About-event text | display field | — | — | Always | — | static | long text | hidden | N/A |
| E10 | Section title "Sun* annual awards 2025 / He thong giai thuong" | region label | — | Shown | Always | — | static | raw | — | N/A |
| E11 | Award card (x6, Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP) | list | — | Shown | Always | Opens that award on Awards Information | static | image, name, short description | placeholder with award name | N/A |
| E12 | "Chi tiet" link on each award card | link | — | Enabled | Always | Opens that award on Awards Information | — | — | — | N/A |
| E13 | Kudos title and description | display field | — | — | Always | — | static | raw | hidden | N/A |
| E14 | Kudos "Chi tiet" | button | — | Enabled | Always | Opens the Kudos board | — | — | — | N/A |
| E15 | Kudos logo | image | — | Shown | Always | — | static | raw | hidden | N/A |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Watch countdown | E03 | passive | page open | Values update while the page is open; they stop at 00 once the ceremony time is reached and the visitor stays on this screen (Codex R08) | TBD (draft) |
| Open awards | E07 | click | — | Leaves screen (see § 8) | TBD (draft) |
| Open Kudos | E08, E14 | click | — | Leaves screen (see § 8) | TBD (draft) |
| Open award detail | E11, E12 | click | — | Leaves screen (see § 8) | TBD (draft) |
| Retry event details | E03-E06 | click retry | Event data failed to load | Blocks reload | TBD (draft) |

### Happy Path

1. Sunner arrives and sees the hero in R2 with the countdown ticking and event details.
2. Sunner scrolls through R3 to read the about text.
3. In R4 Sunner clicks "Chi tiet" on an award card, which hands off to Awards Information.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Page load | Event data cannot be loaded | R2 countdown and event info show a fallback with retry; R3-R5 render normally | TBD (draft) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Event data in flight | Skeleton in countdown and event info blocks | none | TBD (draft) |
| empty | Event data returned without date/venue | Dash in missing fields | none | TBD (draft) |
| error | Event data failed | "Event details are temporarily unavailable. Try again." with retry | retry | TBD (draft) |
| saving | — | N/A (screen writes nothing) | — | TBD (draft) |
| success | Data loaded | All blocks populated, countdown running | all CTAs | TBD (draft) |
| image-error | An award image fails | Placeholder with award name | none | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Livestream note is offered only when the event has one | configuration | E06 | Event has a livestream note | No livestream note | Data source is the shared event record (feature decision D002, resolved) |
| Layout adapts to screen width | responsive | E11 | — | — | Out of release scope (AD01, R17); see § 10 |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Login | Successful sign-in | Event started | TBD (draft) |
| Countdown - Prelaunch | Countdown reaches zero | — | TBD (draft) |
| Any screen (header/footer) | "About SAA 2025" | — | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Open awards | E07 | — | Hệ thống giải (Awards Information) | redirect | TBD (draft) |
| Open award detail | E11, E12 | — | Hệ thống giải at the chosen award | redirect | TBD (draft) |
| Open Kudos | E08, E14 | — | Sun* Kudos - Live board | redirect | TBD (draft) |
| Header / footer / floating button links | shared shell | — | TBD (draft) — owned by F001 | redirect or modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Landmarks for regions; descriptive labels on each award card link |
| Keyboard navigation | [EXPECTED] | Tab through header, CTAs, award cards, footer |
| Focus management | [EXPECTED] | No trap; focus starts at top of main content |
| Screen reader compatibility | [EXPECTED] | Heading hierarchy; countdown not announced every second |
| Error announcement | [EXPECTED] | Event-data error announced politely |

## 10. Responsive Behavior

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| desktop (>=1280px) | R4 | 3-column award grid | TBD (draft) |
| below 1280px | all | Desktop layout unchanged; horizontal scroll (Codex R17) | TBD (draft) |
| tablet (768-1024px) | R4 | Out of release scope (AD01, R17). Inherited: 2-column grid; condensed header | TBD (draft) |
| mobile (<768px) | R4 | Out of release scope (AD01, R17). Inherited: single column; header collapses | TBD (draft) |
