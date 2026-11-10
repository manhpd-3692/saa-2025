---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-secret-box-modal — Screen Spec

**Screen**: SCR-secret-box-modal: Secret Box (unopened, opening, result)
**Feature**: F008_KudosGamification
**Type**: composite
**Route**: modal over `/kudos` and `/profile` (Figma unopened `1466:7069`, `1466:7676`; click action `1466:7024`, `1466:7593`; result `2995:15708`, `2995:15733`, `2995:15754`; 8 standby variants `1466:7614`, `1466:7635`, `2995:15777`, `3066:15629`, `3241:15069`, `3241:15083`, `3241:15097`, `3241:15113`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner who earned Secret Boxes opens one, sees which of the 6 icons it holds, and watches their collection grow.
**Actors:** Sunner
**Entry Conditions:** Signed-in Sunner pressed "Mở Secret Box" on the Live board sidebar or on their own profile (the button is disabled by the host page when no box is unopened).
**Exit Conditions:** Window closed; one box opened and its icon revealed (the result stays visible until the Sunner closes or opens the next box).

## 2. Screen Layout

### Layout Sketch

Centered window over a dimmed page. Top: heading "KHÁM PHÁ SECRET BOX CỦA BẠN". Center: the box illustration (clickable) with the hint "Click vào box để mở". Below: unopened count "Secretbox chưa mở 05" and the collected-icons strip (n of 6). After opening, the center shows the revealed icon (result frames). Responsive breakpoints: TBD (draft).

```
┌───────────────────────────────────────────┐
│ R1: KHÁM PHÁ SECRET BOX CỦA BẠN      [x?] │
├───────────────────────────────────────────┤
│ R2:        [   SECRET BOX   ]             │
│            Click vào box để mở            │
│            (after click: revealed icon)   │
├───────────────────────────────────────────┤
│ R3: Secretbox chưa mở 05                  │
│     [icon][icon][icon][ ][ ][ ]  n / 6    │
└───────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Heading | static | no | TBD (draft) |
| R2 | Box and result stage | static | no | TBD (draft) |
| R3 | Counter and collection strip | static | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Heading "KHÁM PHÁ SECRET BOX CỦA BẠN" | region label | — | — | Always | — | static | raw | — | N/A |
| E02 | Secret box | image | — | Closed box | Conditional | Click opens one box | static | — | — | N/A |
| E03 | Hint "Click vào box để mở" | message | — | — | Conditional | — | static | raw | hidden | N/A |
| E04 | Unopened counter "Secretbox chưa mở 05" | display field | — | Number of unopened boxes | Always | — | API field | zero-padded 2 digits | "00" | `unopened` from Go `GET /api/v1/me/secret-boxes` |
| E05 | Revealed icon | image | — | — | Conditional | — | API field | icon artwork + name | hidden | `icon` from Go `POST /api/v1/me/secret-boxes/open` (response `{ boxId, icon, summary: { unopened, opened, distinctIcons } }`); drawn on the server, equal 1/6 odds, repeats allowed (BR-008) |
| E06 | Icon name | display field | — | — | Conditional | — | API field | uppercase icon name | hidden | BR-008 |
| E07 | Collection strip | list | — | 6 slots, collected ones filled | Always | — | API field | n / 6 | all slots empty | `collectedIcons` from `GET`, `summary.distinctIcons` from the open response; after a replayed open the strip is refreshed from `GET` because the replayed summary is the stored snapshot of that open (Codex N12) |
| E08 | Completion message | message | — | Shown when all 6 are held | Conditional | — | computed | raw | hidden | N/A |
| E09 | Empty message | message | — | "You have no Secret Box to open." (wording to confirm) | Conditional | — | static | raw | — | N/A |
| E10 | Close control | button | — | Enabled | Always | Closes the window | — | — | — | N/A |
| E11 | Open next box | button | — | Enabled | Conditional | Returns to the unopened stage (E02) | — | — | — | N/A |

<!-- E10/E11 labels are not confirmed in the survey. Standby frames show the box per collected-icon state; result frames show the revealed icon with the updated collection (functional D012, resolved by default AD08). -->

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Open a box | E02 | click | At least one unopened box | A new `Idempotency-Key` (UUID) is created for this opening intent and sent as a header; opening state, then revealed icon (E05, E06); counter (E04) drops by one; strip (E07) updates (Codex R12) | TBD (draft) |
| Open next box | E11 | click | Unopened count above zero after a reveal | Stage returns to the closed box | TBD (draft) |
| Close window | E10 | click, Esc | — | Window closes | TBD (draft) |

### Happy Path

1. Sunner presses "Mở Secret Box"; the window opens on the closed box with the counter showing how many are unopened.
2. Sunner clicks the box in R2.
3. The box opens and R2 shows the revealed icon and its name.
4. R3 counter drops by one and the strip shows the icon among the collected ones.
5. Sunner closes the window, or opens the next box.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 1 | No unopened box | Empty message (E09) instead of the box; nothing to click | TBD (draft) |
| Step 3 | The icon was already collected | Icon shown; strip count unchanged | TBD (draft) |
| Step 4 | The icon completes all 6 | Completion message (E08) shown | TBD (draft) |
| Step 2 | The open request fails or its answer is lost | Box returns to closed with an error message and Retry; Retry resends the **same** `Idempotency-Key`, so if the first open was saved the server returns that open's stored result exactly (same box, icon and summary) and no second box is used; the window then refreshes the counter and strip with `GET /api/v1/me/secret-boxes` so they show the current inventory (Codex R12, N12) | TBD (draft) |
| Step 4 | Two opens finish the set at once (e.g. two tabs) | Completion is recorded once; only one completion notice arrives (Codex R11) | TBD (draft) |

### Interaction Notes

- **A second click while the box is opening is ignored** — source: `TBD (draft)`
- **One `Idempotency-Key` per opening intent: kept until that intent shows a result, reused by Retry, replaced only for the next box (Open next box, E11)** — source: Codex R12
- **Standby frames follow the collected-icon state; a result frame shows the revealed icon and the updated collection** — source: functional D012 (resolved, applied default AD08)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | window opens, summary loading | counter and strip as skeleton | close | TBD (draft) |
| ready | summary loaded, unopened above zero | closed box, hint, counter, strip | click box, close | TBD (draft) |
| opening | click on box | opening animation, box not clickable | none | TBD (draft) |
| revealed | open succeeded | icon and name, updated counter and strip | open next (if any), close | TBD (draft) |
| empty | unopened count is zero | empty message, no box | close | TBD (draft) |
| error | summary or open request fails | error message with retry; counter unchanged until the server answers; Retry of an open reuses the same `Idempotency-Key` (Codex R12) | retry, close | TBD (draft) |
| completed | all 6 icons held | completion message with the strip full | close | TBD (draft) |
| saving | open in flight | same as opening | none | TBD (draft) |
| success | reveal finished | same as revealed | open next, close | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E02 | A box can be opened only when the Sunner has an unopened one | "You have no Secret Box to open." | server response `409` |
| E02 | Session must be valid | "Your session has expired. Please sign in again." | server response `401` |
| E02 | Opening failed for another reason | "Could not open the box. Please try again." (wording to confirm) | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The Sunner has an unopened box and has not just opened one | configuration | E02, E03 | Window is in ready state | After reveal, or when no box is left | State-driven (data), not an access rule |
| A box was just opened | configuration | E05, E06, E11 | Revealed state | Ready, empty, loading | E11 only when more boxes remain |
| No unopened box | configuration | E09 | Empty state | Otherwise | — |
| All 6 icons are held | configuration | E08 | Completed state | Otherwise | Prize is given out offline |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`; it is not a second source of truth. Destinations not yet in `screen-flow.md` are `TBD (draft)`.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR-kudos-live-board (F006) | "Mở Secret Box" in the right sidebar | At least one unopened box | TBD (draft) |
| SCR-own-profile (F007) | "Mở Secret Box" in the stats block | At least one unopened box | TBD (draft) |
| SCR-notifications (F009) | "Secret Box received" notice, sent after a box is granted | Notice exists | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Close window | E10 | — | (stays on page underneath) | window closes | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Labelled dialog; box is a button with label "Open Secret Box"; icon has the icon name as text |
| Keyboard navigation | [EXPECTED] | Box reachable by Tab and opened with Enter or Space; Esc closes |
| Focus management | [EXPECTED] | Focus enters the window on open, returns to the trigger button on close |
| Screen reader compatibility | [EXPECTED] | Reveal result and counter change announced politely |
| Error announcement | [EXPECTED] | Error messages announced as alerts |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
