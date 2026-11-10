---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-rules-panel — Screen Spec

**Screen**: SCR-rules-panel: Thể lệ (rules side panel)
**Feature**: F008_KudosGamification
**Type**: atomic
**Route**: side panel over any full-frame page (Figma `3204:6051`); no URL of its own
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner reads how hero badges, Secret Boxes and Kudos Quốc Dân work, and can jump straight to writing a kudo.
**Actors:** Sunner
**Entry Conditions:** Signed-in Sunner chose "Thể lệ" in the floating action button on a full-frame page.
**Exit Conditions:** Panel closed with Đóng, or closed because Viết KUDOS was pressed and the write window opened.

## 2. Screen Layout

### Layout Sketch

A panel docked to the side of the page over a dimmed backdrop. Top: title. Middle (scrollable): three rule blocks one under another. Bottom: two buttons, Đóng and Viết KUDOS, kept visible. Responsive breakpoints: TBD (draft).

```
┌─────────────────────────────┐
│ R1: Title "Thể lệ"          │
├─────────────────────────────┤
│ R2: Block 1 NGƯỜI NHẬN      │
│     tiers New/Rising/...    │
│     Block 2 NGƯỜI GỬI       │
│     6 icons, 5 hearts/box   │
│     Block 3 KUDOS QUỐC DÂN  │  (scrollable)
├─────────────────────────────┤
│ R3:      [ Đóng ][Viết KUDOS]│
└─────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Title | static | no | TBD (draft) |
| R2 | Rule blocks | static | yes | TBD (draft) |
| R3 | Actions | sticky | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Panel title | region label | — | "Thể lệ" (wording to confirm) | Always | — | static | raw | — | N/A |
| E02 | Block heading "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC" | region label | — | — | Always | — | static | raw | — | N/A |
| E03 | Hero badge explanation | message | — | Based on how many colleagues send you Kudos you get a Hero badge shown on your profile | Always | — | static | raw | — | Design copy kept verbatim; in the product the badge shows on the Sunner's kudo cards (including the kudo lists on their profile), not in the profile header (F007 D006, Codex N10) |
| E04 | New Hero tier row | display field | — | "New Hero: 1–4 senders" | Always | — | static | raw | — | TBD (draft) |
| E05 | Rising Hero tier row | display field | — | "Rising Hero: 5–9 senders" | Always | — | static | raw | — | TBD (draft) |
| E06 | Super Hero tier row | display field | — | "Super Hero: 10–20 senders" | Always | — | static | raw | — | TBD (draft) |
| E07 | Legend Hero tier row | display field | — | "Legend Hero: more than 20 senders" | Always | — | static | raw | — | TBD (draft) |
| E08 | Block heading "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN" | region label | — | — | Always | — | static | raw | — | N/A |
| E09 | Secret Box explanation | message | — | Each Kudo you send can receive hearts; every 5 hearts gives 1 Secret Box with a chance to get one of 6 icons; collecting all 6 wins a mystery prize at SAA 2025 | Always | — | static | raw | — | BR-006, BR-008 (hearts are weighted; equal odds, repeats allowed) |
| E10 | Icon list | list | — | REVIVAL, TOUCH OF LIGHT, STAY GOLD, FLOW TO HORIZON, BEYOND THE BOUNDARY, ROOT FURTHER | Always | — | static | raw | — | N/A |
| E11 | Block heading "KUDOS QUỐC DÂN" | region label | — | — | Always | — | static | raw | — | N/A |
| E12 | Kudos Quốc Dân explanation | message | — | The 5 Kudos with the most hearts across Sun* become national Kudos and get a special prize | Always | — | static | raw | — | BR-009; these 5 are the unfiltered Highlight on SCR-kudos-live-board (F006) |
| E13 | Đóng | button | — | Enabled | Always | Closes the panel | — | — | — | N/A |
| E14 | Viết KUDOS | button | — | Enabled | Always | Closes the panel and opens the write-kudo window | — | — | — | N/A |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Close panel | E13 | click | — | Panel closes, page underneath is as it was | TBD (draft) |
| Start writing a kudo | E14 | click | — | Panel closes (write window opens, see § 8) | TBD (draft) |
| Dismiss | R2 backdrop | click outside, Esc key | — | Panel closes | TBD (draft) |

### Happy Path

1. Sunner opens the panel from the floating button; it slides in over the page.
2. Sunner scrolls through the three rule blocks in R2.
3. Sunner presses Đóng in R3 and the panel closes.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 3 | Sunner presses Viết KUDOS instead | Panel closes at once | TBD (draft) |
| Step 2 | Content taller than the panel | R2 scrolls, R3 stays visible | TBD (draft) |

### Interaction Notes

- **Pressing Esc or clicking the dimmed backdrop closes the panel like Đóng** — source: `TBD (draft)` (assumed, not in design)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| default | panel opened | all three blocks shown in the user's language | Đóng, Viết KUDOS, scroll | TBD (draft) |
| loading | N/A — content is static, no async call | — | — | TBD (draft) |
| empty | N/A — blocks are fixed text | — | — | TBD (draft) |
| error | language dictionary entry missing | falls back to Vietnamese text | Đóng, Viết KUDOS | TBD (draft) |
| saving | N/A — nothing is submitted | — | — | TBD (draft) |
| success | N/A — read-only panel | — | — | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

N/A — no conditional UI detected.

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`; it is not a second source of truth. Destinations not yet in `screen-flow.md` are `TBD (draft)`.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR-app-shell (floating action button, F001) | Choose "Thể lệ" | Full-frame page, signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Close panel | E13 | — | (stays on page underneath) | panel closes | TBD (draft) |
| Start writing a kudo | E14 | — | SCR-write-kudo-modal | modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Panel is a labelled dialog; title is its label |
| Keyboard navigation | [EXPECTED] | Tab through Đóng and Viết KUDOS; Esc closes |
| Focus management | [EXPECTED] | Focus moves into the panel on open and returns to the floating button on close |
| Screen reader compatibility | [EXPECTED] | Block headings use heading levels; tier rows read as a list |
| Error announcement | [EXPECTED] | N/A — no errors are raised on this screen |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
