---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-own-profile — Screen Spec

**Screen**: SCR-own-profile: Profile bản thân
**Feature**: F007_SunnerProfile
**Type**: composite
**Route**: `/profile` (Figma `362:5037`, 1440×4660; filter dropdown `763:4728`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner sees their own recognition record: who they are, which icons they collected, how many kudos and hearts they have, and the kudos they received or sent. From here they can open a secret box.
**Actors:** Sunner (Admin sees the same page)
**Entry Conditions:** Signed in; chose Profile in the header avatar menu. The pre-launch gate may divert earlier (Countdown feature).
**Exit Conditions:** Opened a kudo's detail; opened the secret-box flow; opened a teammate's profile from a card avatar; left through the header or footer.

## 2. Screen Layout

### Layout Sketch

Header and footer come from the App Shell. A tall single column: a header block, a counts block, then the KUDOS section whose cards run down the page.

```
┌────────────────────────────────────────────────────────┐
│ (App Shell header)                                      │
├────────────────────────────────────────────────────────┤
│ R1: [avatar]  Name                                      │
│                Unit code (e.g. CECV2)                   │
│                [icon][icon][icon][icon][icon][icon]     │
├────────────────────────────────────────────────────────┤
│ R2: Kudos received  Kudos sent  Hearts received         │
│     Boxes opened    Boxes unopened   [ Mở Secret Box ]  │
├────────────────────────────────────────────────────────┤
│ R3: KUDOS                          [ Đã nhận        ▾ ] │
│ R4: ┌ kudo card ┐                                       │
│     ├ kudo card ┤  …                                    │
│     └ [ Xem thêm ]                                      │
│ - - R5: filter dropdown options (floating) - - -        │
├────────────────────────────────────────────────────────┤
│ (App Shell footer)                                      │
└────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Identity header | static | no | TBD (draft) |
| R2 | Counts block | static | no | TBD (draft) |
| R3 | KUDOS title and filter | static | no | TBD (draft) |
| R4 | Kudo list | static | page scroll | TBD (draft) — cards are owned by the Kudos Board feature |
| R5 | Filter dropdown options | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Avatar | image | — | Initial-letter fallback | Always | — | TBD (draft) | round image | fallback shown | TBD (draft) |
| E02 | Name | text | — | — | Always | — | TBD (draft) | raw | — | N/A |
| E03 | Unit code | text | — | — | Conditional (has a unit) | — | Go `GET /api/v1/users/{id}/profile` `user.unitCode` (`units.code`, F002; Codex R15) | e.g. CECV2 | hidden | `units.code` |
| E04 | Collected icons row | icon list | — | All slots shown, uncollected ones dimmed (to confirm) | Always | Hover shows icon description | TBD (draft) | one slot per icon of the set | dimmed slots | TBD (draft) |
| E05 | Icon hover description | tooltip | — | Hidden | Conditional (hover) | — | owned by the Gamification feature | text | — | TBD (draft) |
| E06 | Kudos received | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.kudosReceived` | integer | 0 | N/A |
| E07 | Kudos sent | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.kudosSent` | integer | 0 | N/A |
| E08 | Hearts received | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.heartsReceived` | integer; weighted total from the Gamification feature over kudos received (a x2 heart counts 2) | 0 | D008 |
| E09 | Secret boxes opened | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.boxesOpened` (owner only) | integer | 0 | N/A |
| E10 | Secret boxes unopened | stat | — | 0 | Always | — | Go `GET /api/v1/users/{id}/profile` `counts.boxesUnopened` (owner only) | integer | 0 | N/A |
| E11 | "Mở Secret Box" | button | — | Disabled when unopened is 0 | Always | Opens the secret-box flow | owned by the Gamification feature | — | disabled | TBD (draft) |
| E12 | Section title "KUDOS" | heading | — | — | Always | — | static | raw | — | N/A |
| E13 | Filter dropdown | dropdown | yes | "Đã nhận" | Always | Opens options (E14) | TBD (draft) | label of current choice | — | TBD (draft) |
| E14 | Filter options | menu | — | Hidden | Conditional | Pick "Đã nhận" or "Đã gửi" | static | two items, current marked | — | N/A |
| E15 | Kudo card | card | — | — | Conditional (has kudos) | Press opens the kudo detail; avatar opens a teammate's profile | Kudos Board feature | card | see E17 | TBD (draft) |
| E16 | "Xem thêm" (load more) | button | — | Enabled | Conditional (more pages exist) | Appends next 10 cards | TBD (draft) | — | hidden | N/A |
| E17 | Empty message | message | — | Hidden | Conditional (no kudos for the filter) | — | static | text | — | N/A |
| E18 | List error banner with retry | message + button | — | Hidden | Conditional (load failed) | Retry | static | text | — | N/A |
| E19 | Counts error message with retry | message + button | — | Hidden | Conditional (Go returned `counts: null`, `countsUnavailable: true`; Codex R15) | Retry | static | text | — | N/A |

Wording of "Đã nhận", "Đã gửi", "Xem thêm" and all messages is to be confirmed against the design (D011).

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Open filter | E13 | click | — | Options list opens | TBD (draft) |
| Change filter | E14 | click row | — | List reloads from first page; dropdown label and address update | TBD (draft) |
| Load more | E16 | click | More pages exist | Next 10 cards appended | TBD (draft) |
| Open kudo | E15 | click card | — | Kudo detail opens | TBD (draft) |
| Open teammate's profile | E15 avatar | click | Sender or recipient not anonymous-masked | Teammate's profile opens | TBD (draft) |
| Open secret box | E11 | click | Unopened boxes at least 1 | Secret-box flow opens over the page | TBD (draft) |
| Read icon description | E04 | hover | — | Tooltip E05 shows | TBD (draft) |
| Retry | E18, E19 | click | After an error | Reloads that part | TBD (draft) |

### Happy Path

1. Sunner chooses Profile in the avatar menu; R1–R3 show at once, cards appear in R4.
2. Sunner reads counts in R2.
3. Sunner opens the dropdown E13 and picks "Đã gửi"; the list reloads.
4. Sunner presses "Xem thêm" to see older kudos.
5. Sunner presses a card and the kudo detail opens.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 1 | Address carries a filter | The dropdown shows that filter and the list matches | TBD (draft) |
| Step 3 | No kudos for the filter | E17 replaces the cards | TBD (draft) |
| Step 4 | No more pages | E16 hidden | TBD (draft) |
| Any list load | Request fails | E18 shows; cards already shown stay | TBD (draft) |
| Opening the box flow | Flow closed | Counts E06–E10 and icons E04 refresh | TBD (draft) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | First paint of list; filter change; load more | Skeleton cards (first page); spinner on E16 (load more) | filter stays usable | TBD (draft) |
| empty | No kudos for the filter | E17 message | change filter | TBD (draft) |
| error | List request failed | E18 banner | retry | TBD (draft) |
| error | Counts failed | E19 message in R2; header and list unaffected | retry | TBD (draft) |
| no-box | Unopened boxes is 0 | E11 disabled | none on E11 | TBD (draft) |
| new-user | No activity yet | Counts 0, icons dimmed, empty list | — | TBD (draft) |
| anonymous-card | Kudo sent anonymously | Card shows an anonymous sender, avatar not pressable | open kudo | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E13 / E14 | Only "Đã nhận" or "Đã gửi"; an unknown value in the address falls back to "Đã nhận" | Silent fallback | page open |
| E11 | Needs at least 1 unopened box | Button disabled | page open, after flow closes |
| E18 | Server may refuse (session ended) | Session end sends the Sunner to Login; other failures show "Could not load kudos. Please try again." (wording pending) | list request |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Own profile only | auth | E10, E11 | Viewer is the profile owner | Teammate's profile (separate screen) | D001 (resolved, AD07) |
| Unopened boxes | hardcoded-id | E11 | Enabled when unopened at least 1 | Disabled at 0 | D009 (resolved, AD07) |
| Has unit | hardcoded-id | E03 | Sunner has a unit | No unit | — |
| More pages | hardcoded-id | E16 | Another page exists | Last page | — |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`. It is not a second source of truth. Source for this draft: `docs/SCREENFLOW.md` navigation graph.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Header avatar menu (Dropdown-profile) | "Profile" | Signed in | TBD (draft) |
| Teammate-style address with own id | Redirect | Signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Open kudo | E15 | — | View Kudo (kudo detail) | opens detail | TBD (draft) |
| Open teammate | E15 avatar | Not masked | Profile người khác | opens teammate's profile | TBD (draft) |
| Mở Secret Box | E11 | Unopened at least 1 | Secret-box flow | opens over this page | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Dropdown as a labelled listbox button; stats as labelled values; cards as list items; collected and uncollected icons named in text |
| Keyboard navigation | [EXPECTED] | Tab order header, counts, button, dropdown, cards, load more; Enter/Space open the dropdown; arrows move in it; Esc closes |
| Focus management | [EXPECTED] | Focus returns to the dropdown trigger after choosing; after "Xem thêm" focus moves to the first new card |
| Screen reader compatibility | [EXPECTED] | List update after a filter change announced ("n kudos loaded"); disabled button states why |
| Hover alternative | [EXPECTED] | Icon descriptions also reachable by keyboard focus, not only hover |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
