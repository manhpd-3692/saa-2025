---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-other-profile — Screen Spec

**Screen**: SCR-other-profile: Profile người khác
**Feature**: F007_SunnerProfile
**Type**: composite
**Route**: `/profile/[userId]` (Figma `362:5097`; filter dropdown `763:4728`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner looks at a teammate's recognition record — identity, collected icons, counts and kudos — without being able to act on it.
**Actors:** Sunner (Admin sees the same page, plus real senders of anonymous kudos)
**Entry Conditions:** Signed in; pressed a visible sender or recipient avatar on a kudo card.
**Exit Conditions:** Opened a kudo's detail; opened another teammate's profile from a card avatar; left through the header or footer. Opening one's own id leads to the own profile instead.

## 2. Screen Layout

### Layout Sketch

Same single column as the own profile (SCR-own-profile) with the box button and unopened figure removed.

```
┌────────────────────────────────────────────────────────┐
│ (App Shell header)                                      │
├────────────────────────────────────────────────────────┤
│ R1: [avatar]  Name                                      │
│                Unit code                                │
│                [icon][icon][icon][icon][icon][icon]     │
├────────────────────────────────────────────────────────┤
│ R2: Kudos received   Kudos sent   Hearts received       │
│     Boxes opened (D001: hidden, see § 7)                │
├────────────────────────────────────────────────────────┤
│ R3: KUDOS                          [ Đã nhận        ▾ ] │
│ R4: ┌ kudo card ┐ … [ Xem thêm ]                         │
│ - - R5: filter dropdown options (floating) - - -        │
└────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Identity header | static | no | TBD (draft) |
| R2 | Counts block | static | no | TBD (draft) |
| R3 | KUDOS title and filter | static | no | TBD (draft) |
| R4 | Kudo list | static | page scroll | TBD (draft) — cards owned by the Kudos Board feature |
| R5 | Filter dropdown options | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Avatar | image | — | Initial-letter fallback | Always | — | TBD (draft) | round image | fallback shown | TBD (draft) |
| E02 | Name | text | — | — | Always | — | TBD (draft) | raw | — | N/A |
| E03 | Unit code | text | — | — | Conditional (has a unit) | — | Go `GET /api/v1/users/{id}/profile` `user.unitCode` (`units.code`, F002; Codex R15) | e.g. CECV2 | hidden | `units.code` |
| E04 | Collected icons row | icon list | — | Uncollected slots dimmed (to confirm) | Always | Hover shows description (tooltip owned by the Gamification feature) | TBD (draft) | one slot per icon | dimmed slots | TBD (draft) |
| E05 | Kudos received | stat | — | 0 | Always | — | TBD (draft) | integer | 0 | N/A |
| E06 | Kudos sent | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.kudosSent` | integer, excludes their anonymous kudos unless the viewer is an admin | 0 | N/A |
| E07 | Hearts received | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.heartsReceived` | integer; weighted total from the Gamification feature over kudos received (a x2 heart counts 2) | 0 | D008 |
| E08 | Section title "KUDOS" | heading | — | — | Always | — | static | raw | — | N/A |
| E09 | Filter dropdown | dropdown | yes | "Đã nhận" | Always | Opens options (E10) | TBD (draft) | label of current choice | — | TBD (draft) |
| E10 | Filter options | menu | — | Hidden | Conditional | Pick "Đã nhận" or "Đã gửi" | static | two items | — | N/A |
| E11 | Kudo card | card | — | — | Conditional (has kudos) | Press opens the kudo detail; visible avatars open that Sunner's profile | Kudos Board feature | card | see E13 | TBD (draft) |
| E12 | "Xem thêm" | button | — | Enabled | Conditional (more pages) | Appends next 10 cards | TBD (draft) | — | hidden | N/A |
| E13 | Empty message | message | — | Hidden | Conditional (no kudos) | — | static | text | — | N/A |
| E14 | List error banner with retry | message + button | — | Hidden | Conditional | Retry | static | text | — | N/A |
| E15 | Counts error message with retry | message + button | — | Hidden | Conditional (Go returned `counts: null`, `countsUnavailable: true`; Codex R15) | Retry | static | text | — | N/A |

There is no "Mở Secret Box" button, no unopened-boxes figure, and no email address on this screen. Wording is pending design (D011).

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Open filter | E09 | click | — | Options list opens | TBD (draft) |
| Change filter | E10 | click row | — | List reloads from first page; label and address update | TBD (draft) |
| Load more | E12 | click | More pages | Next 10 cards appended | TBD (draft) |
| Open kudo | E11 | click card | — | Kudo detail opens | TBD (draft) |
| Open another profile | E11 avatar | click | Sender or recipient not masked | That Sunner's profile opens (own id leads to own profile) | TBD (draft) |
| Read icon description | E04 | hover or focus | — | Tooltip shows | TBD (draft) |
| Retry | E14, E15 | click | After an error | Reloads that part | TBD (draft) |

### Happy Path

1. Sunner presses a teammate's avatar on a kudo card; the profile opens with R1–R3 and cards in R4.
2. Sunner reads the counts and collected icons.
3. Sunner picks "Đã gửi" in the dropdown to see what the teammate gave.
4. Sunner presses a card and the kudo detail opens.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 1 | Id is the viewer's own | Own profile opens instead | TBD (draft) |
| Step 1 | Id unknown | Not-found page replaces this screen | TBD (draft) |
| Step 3 | Teammate sent only anonymous kudos, viewer not admin | List empty (E13) and sent count 0 | TBD (draft) |
| Any list load | Request fails | E14 shows; cards already shown stay | TBD (draft) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | First paint; filter change; load more | Skeleton cards; spinner on E12 | filter stays usable | TBD (draft) |
| empty | No kudos for the filter | E13 message | change filter | TBD (draft) |
| error | List failed | E14 banner | retry | TBD (draft) |
| error | Counts failed | E15 in R2; header and list unaffected | retry | TBD (draft) |
| anonymous-card | Kudo received anonymously (viewer not admin) | Card shows an anonymous sender, avatar not pressable | open kudo | TBD (draft) |
| not-found | Unknown id | Not-found page (App Shell) | go elsewhere | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| Address id | Must be an existing Sunner | Not-found page | page open |
| E09 / E10 | Only "Đã nhận" or "Đã gửi"; unknown value falls back to "Đã nhận" | Silent fallback | page open |
| E14 | Server may refuse (session ended) | Session end sends to Login; other failures "Could not load kudos. Please try again." (wording pending) | list request |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Teammate, not owner | auth | Secret-box button and unopened figure | Never on this screen | Always | D001 (resolved, AD07); boxes opened figure also hidden; Go omits box figures for non-owners |
| Viewer is admin | auth | Real sender on anonymous cards; anonymous kudos in "sent" and E06 | Viewer has the admin role | Other viewers | D010 (resolved, AD07; G04); enforced by the shared Go `maskSender` |
| Has unit | hardcoded-id | E03 | Sunner has a unit | No unit | — |
| More pages | hardcoded-id | E12 | Another page exists | Last page | — |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`. It is not a second source of truth. Source for this draft: `docs/SCREENFLOW.md` navigation graph.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Sun* Kudos - Live board | Sender or recipient avatar on a kudo card | Not masked; signed in | TBD (draft) |
| View Kudo (kudo detail) | Avatar on the detail view | Not masked; signed in | TBD (draft) |
| Another profile's kudo card | Avatar on a card | Not masked; signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Open kudo | E11 | — | View Kudo (kudo detail) | opens detail | TBD (draft) |
| Open another Sunner | E11 avatar | Not masked | Profile người khác (or own profile for own id) | opens profile | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Dropdown as labelled listbox button; stats as labelled values; cards as list items |
| Keyboard navigation | [EXPECTED] | Tab order header, counts, dropdown, cards, load more; arrows and Esc in the dropdown |
| Focus management | [EXPECTED] | Focus returns to the trigger after choosing; after "Xem thêm" focus moves to the first new card |
| Screen reader compatibility | [EXPECTED] | List update after a filter change announced; anonymous sender read as "anonymous" |
| Hover alternative | [EXPECTED] | Icon descriptions reachable by keyboard focus |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
