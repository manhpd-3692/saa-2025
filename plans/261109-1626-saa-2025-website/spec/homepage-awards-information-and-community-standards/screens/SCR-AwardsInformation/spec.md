---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-AwardsInformation — Screen Spec

**Screen**: SCR-AwardsInformation: Hệ thống giải (Figma `313:8436`)
**Feature**: F004_StaticEventContent
**Type**: composite
**Route**: `/awards`
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A signed-in Sunner reads the full SAA 2025 award system — what each of the six awards recognizes, how many are given and what they pay.
**Actors:** Sunner
**Entry Conditions:** Signed-in session; reached from header/footer, the homepage, or a shared award link.
**Exit Conditions:** The Sunner goes to the Kudos board or leaves via header/footer.

## 2. Screen Layout

### Layout Sketch

Dark page with a key visual banner (decorative only), a title block, then two columns: a sticky award menu on the left that stays below the header, and six award cards on the right separated by dividers. A Sun* Kudos promo block and the shared footer close the page.

```
┌───────────────────────────────────────────┐
│ R1: Header (fixed-top, shared shell)      │
├───────────────────────────────────────────┤
│ R2: Key visual banner                     │
│ R3: Title "He thong giai thuong SAA 2025" │
├──────────────┬────────────────────────────┤
│ R4: Menu     │ R5: Award cards (scroll)   │
│ (sticky)     │  Top Talent ... MVP        │
├──────────────┴────────────────────────────┤
│ R6: Sun* Kudos promo block                │
├───────────────────────────────────────────┤
│ R7: Footer (shared shell)                 │
└───────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | fixed-top | no | TBD (draft) |
| R2 | Key visual banner | static | yes | TBD (draft) |
| R3 | Title | static | yes | TBD (draft) |
| R4 | Award menu | sticky | no | TBD (draft) |
| R5 | Award cards | static | yes | TBD (draft) |
| R6 | Sun* Kudos promo | static | yes | TBD (draft) |
| R7 | Footer | static | yes | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Key visual banner | image | — | Shown | Always | — | static | cover-fit, centered | hidden | N/A |
| E02 | Subtitle "Sun* Annual Awards 2025" and title | region label | — | Shown | Always | — | static | raw | — | N/A |
| E03 | Menu item (x6, one per award) | link | — | First item active | Always | Scrolls to that award | static | name | — | N/A |
| E04 | Award image | image | — | Shown | Always | — | static | square, about 336 px | placeholder with award name | N/A |
| E05 | Award name | display field | — | — | Always | — | static | raw | — | N/A |
| E06 | Award description | display field | — | — | Always | — | static | long text | hidden | N/A |
| E07 | Quantity and unit | display field | — | — | Always | — | static | two-digit count + Individual/Team/Individual or team | — | N/A |
| E08 | Prize value | display field | — | — | Always | — | static | `7.000.000 VND` style | — | N/A |
| E09 | Second prize value with "Or" divider (Signature 2025 - Creator only) | display field | — | — | Conditional | — | static | `8.000.000 VND` | hidden | N/A |
| E10 | Kudos title and description | display field | — | — | Always | — | static | raw | hidden | N/A |
| E11 | Kudos "Chi tiet" | button | — | Enabled | Always | Opens the Kudos board | — | — | — | N/A |

Award data: Top Talent 10 individuals, 7.000.000 VND each; Top Project 2 teams, 15.000.000; Top Project Leader 3 individuals, 7.000.000; Best Manager 1 individual, 10.000.000; Signature 2025 - Creator 1 individual or team, 5.000.000 (individual) or 8.000.000 (team); MVP 1 individual, 15.000.000.

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Jump to award | E03 | click | — | Smooth scroll to the card; item highlighted; address updated | TBD (draft) |
| Follow scroll | E03 | scroll | — | Highlight moves to the award mostly on screen | TBD (draft) |
| Open Kudos | E11 | click | — | Leaves screen (see § 8) | TBD (draft) |

### Happy Path

1. Sunner arrives; the first menu item in R4 is highlighted.
2. Sunner clicks "Best Manager" in R4; R5 scrolls to that card and the item is highlighted.
3. Sunner scrolls down R5; the highlight follows the card on screen until MVP.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Page load | Address names an award | Page scrolls to that award | TBD (draft) |
| Page load | Address names no known award | Page stays at top, no message | TBD (draft) |
| Scroll | No card yet 30% on screen | First menu item stays highlighted | TBD (draft) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Page assets loading | Skeleton award cards; header and footer render at once | none | TBD (draft) |
| empty | No awards available (should not occur; content is static) | "No awards available" | none | TBD (draft) |
| error | An award image fails | Placeholder with award name | none | TBD (draft) |
| saving | — | N/A (screen writes nothing) | — | TBD (draft) |
| success | Content shown | Six cards, menu interactive | all | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Second prize value is shown only for Signature 2025 - Creator | hardcoded-id | E09 | Award is Signature 2025 - Creator | Any other award | Uses dual-prize card variant |
| Menu turns into tab row on small screens | responsive | E03 | — | — | Out of release scope (AD01, R17); see § 10 |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Homepage SAA | "ABOUT AWARDS" button, award card, "Chi tiet" | — | TBD (draft) |
| Any screen (header/footer) | "Awards Information" | — | TBD (draft) |
| External or shared link | Address with an award name | — | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Open Kudos | E11 | — | Sun* Kudos - Live board | redirect | TBD (draft) |
| Header / footer links | shared shell | — | TBD (draft) — owned by F001 | redirect or modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Menu as navigation landmark; each card an article; active item `aria-current` |
| Keyboard navigation | [EXPECTED] | Tab through menu, then cards, Kudos button |
| Focus management | [EXPECTED] | After a menu jump, focus moves to the target card heading |
| Screen reader compatibility | [EXPECTED] | Heading hierarchy; prize values read with currency |
| Error announcement | [EXPECTED] | None needed beyond image fallback text |

## 10. Responsive Behavior

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| desktop (>=1280px) | R4, R5 | Two columns; menu sticky | TBD (draft) |
| below 1280px | all | Desktop layout unchanged; horizontal scroll (Codex R17) | TBD (draft) |
| tablet (768-1024px) | R4 | Out of release scope (AD01, R17). Inherited: menu becomes a top tab bar; cards single column | TBD (draft) |
| mobile (<768px) | R4, R5 | Out of release scope (AD01, R17). Inherited: horizontally scrollable tabs; cards stack full width | TBD (draft) |
