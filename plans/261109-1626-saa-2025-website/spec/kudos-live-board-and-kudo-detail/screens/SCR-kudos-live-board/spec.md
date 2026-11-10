---
status: draft
authored_by: takumi
created: 2026-11-09
---

# SCR-kudos-live-board — Screen Spec

**Screen**: SCR-kudos-live-board: Sun* Kudos - Live board
**Feature**: F006_KudosLiveBoard
**Type**: composite
**Route**: `/kudos` (Figma `2940:13431`, 1440×5862; Hashtag dropdown `721:5580`, Phòng ban dropdown `721:5684`, hover avatar info `721:5827` / `2268:35101`, Hashtag group `1002:13094`)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A signed-in Sunner browses recognition across the company — standout kudos, who is thanked most, every kudo newest first — and sees their own kudos numbers.
**Actors:** Sunner, Admin
**Entry Conditions:** Signed in; arrived from the header "Sun* Kudos" link, the homepage Kudos block, a notification, or the Close button of a kudo detail.
**Exit Conditions:** Opens a kudo detail, a Sunner profile, the Secret Box flow, the write-kudo window, or leaves through the header/footer.

## 2. Screen Layout

### Layout Sketch

Full-width page (1440 design width) inside the app shell: header on top, footer at the bottom, floating "Viết KUDOS" and Thể lệ buttons fixed to the viewport edge (shell, not part of this screen). Content flows top to bottom: key visual, HIGHLIGHT KUDOS, SPOTLIGHT BOARD, then a two-column area — ALL KUDOS feed on the left and a sidebar on the right. The sidebar stays beside the feed while it scrolls (sticky behavior `[EXPECTED]`). Breakpoints: TBD (draft).

```
┌──────────────────────────────────────────────────────┐
│ Shell header (fixed-top)                             │
├──────────────────────────────────────────────────────┤
│ R1: Key visual "Hệ thống ghi nhận và cảm ơn" KUDOS   │
├──────────────────────────────────────────────────────┤
│ R2: HIGHLIGHT KUDOS  [Hashtag ▾] [Phòng ban ▾]       │
│     [<]   ( enlarged kudo card )   [>]     2/5       │
├──────────────────────────────────────────────────────┤
│ R3: SPOTLIGHT BOARD  [search]   388 KUDOS            │
│     ( word cloud of Sunner names )                   │
├────────────────────────────────┬─────────────────────┤
│ R4: ALL KUDOS (scrollable)     │ R5: Sidebar         │
│  ( kudo card )                 │  my stats           │
│  ( kudo card )                 │  [Mở Secret Box]    │
│  ...  end marker               │  10 latest gifts    │
├────────────────────────────────┴─────────────────────┤
│ Shell footer                                         │
└──────────────────────────────────────────────────────┘
 - - - R6: floating avatar info card (on hover) - - -
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Key visual | static | no | TBD (draft) |
| R2 | Highlight Kudos | static | no | TBD (draft) |
| R3 | Spotlight Board | static | no | TBD (draft) |
| R4 | All Kudos feed | static | yes (page scroll, loads more) | TBD (draft) |
| R5 | Right sidebar | sticky `[EXPECTED]` | no | TBD (draft) |
| R6 | Avatar info card | floating | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Hệ thống ghi nhận và cảm ơn / KUDOS | image | — | Shown | Always | — | static | — | — | N/A |
| E02 | Hashtag filter | select | no | "All" | Always | Narrows Highlight by one hashtag | API field | hashtag name with # | "All" | `hashtags.name` |
| E03 | Phòng ban filter | select | no | "All" | Always | Narrows Highlight by one department (receiver's unit) | API field | unit name | "All" | `units.name` |
| E04 | Previous / Next | button | — | Previous disabled on 1st | Always | Moves the carousel one kudo (disabled at the ends) | — | — | — | N/A |
| E05 | Position indicator | display field | — | 1/n | Always | — | computed | "n/5" (n = real total, at most 5) | hidden | N/A |
| E06 | Highlight kudo card | list | — | Kudo with the highest weighted heart total | Always | Opens kudo detail | API field | see card elements; ordered by weighted hearts, newer on ties; kudos with zero hearts also rank (G12) | empty-state message | `kudos`, `kudo_heart_state` |
| E07 | Spotlight search | text input | no | Empty | Always | Emphasizes matching names | — | — | placeholder | N/A |
| E08 | Total counter "n KUDOS" | display field | — | Loaded total | Always | — | API field | number + "KUDOS" | 0 | `kudos` (public count) |
| E09 | Word cloud name | link | — | Size by kudos received | Always | Opens that Sunner's profile | API field | name, larger = more | "no result" message | `users.name` |
| E10 | Kudo card | list | — | Newest first | Always | Opens kudo detail | API field | see card elements | empty-state message | `kudos` |
| E11 | Sender and receiver block | display field | — | Name, unit code, badge | Always | Hover shows info card; click opens profile | API field | avatar + name + unit code (e.g. CECV2) | "Ẩn danh" for hidden sender | `users`, `units.code` (Codex R15) |
| E12 | Hero badge | image | — | Badge slot | Always | Hover shows badge info (F008) | F008 slot | — | hidden | N/A |
| E13 | Timestamp | display field | — | — | Always | — | API field | "HH:mm - MM/dd/yyyy" | dash | `kudos.created_at` |
| E14 | Title (Danh hiệu) | display field | — | — | Always | — | API field | truncated | dash | `kudos.title` |
| E15 | Content | display field | — | — | Always | — | API field | formatted text, truncated | dash | `kudos.content` |
| E16 | Images (up to 5) | image | — | — | Conditional | — | API field | thumbnails in order; signed links to random file names, nothing names the uploader (Codex R01) | hidden | `kudo_images`, `kudo_uploads.object_path` |
| E17 | Hashtag group | list | — | — | Always | — | API field | chips with # | hidden | `hashtags.name` |
| E18 | Heart count and button | button | — | Weighted total | Always | Hearts the kudo (F008) | F008 slot | number | 0 | `kudo_heart_state` |
| E19 | Copy Link | button | — | Enabled | Always | Copies the kudo address | — | — | — | N/A |
| E20 | My stats block | display field | — | Loaded numbers | Always | — | API field | four numbers (hearts = weighted total) | dash | `kudos`, `kudo_heart_state`, `secret_boxes` |
| E21 | Mở Secret Box | button | — | Enabled | Always | Starts the Secret Box flow (F008) | F008 slot | — | disabled when none | N/A |
| E22 | Latest gift recipients (10) | list | — | — | Always | Opens that Sunner's profile | API field | avatar + name of the 10 Sunners who most recently opened a secret box | empty message | `users`, `secret_boxes` |
| E23 | Avatar info card | display field | — | Closed | Conditional | — | API field | name, unit code, badge, counts | hidden for anonymous | `users`, `units.code` |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Filter by hashtag | E02 | select | — | Highlight reloads with the top 5 by hearts among matching kudos, from the first | TBD (draft) |
| Filter by department | E03 | select | — | Highlight reloads with the top 5 by hearts among matching kudos, from the first | TBD (draft) |
| Page highlights | E04 | click | Not at the ends | Shows previous/next kudo, indicator updates | TBD (draft) |
| Search Spotlight | E07 | type | — | Matching names emphasized, others dimmed | TBD (draft) |
| Load more | E10 | scroll to end | More pages exist | Next cards append | TBD (draft) |
| Preview Sunner | E11 | hover or focus | Sender not hidden | Info card (E23) opens after a short delay | TBD (draft) |
| Copy link | E19 | click | — | Button shows "Link copied" briefly | TBD (draft) |
| Retry | any section | click | Section in error | Section reloads | TBD (draft) |

### Happy Path

1. Sunner arrives; the key visual shows and the four sections load in parallel.
2. Sunner presses next in R2 and the second highlighted kudo shows, indicator 2/5.
3. Sunner picks a hashtag in E02; R2 reloads with matching kudos only.
4. Sunner types a name in R3's search; the name is emphasized in the cloud.
5. Sunner scrolls R4; more cards append until the end marker.
6. Sunner presses Copy Link on a card and sees "Link copied".

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 3 | Filters match nothing | R2 shows an empty state; filters stay set and can be cleared | TBD (draft) |
| Step 4 | Search matches nobody | "no result" text; nothing emphasized | TBD (draft) |
| Step 5 | Next page fails | Inline error with Retry under the last card | TBD (draft) |
| Step 6 | Clipboard blocked | Link shown selected for manual copy | TBD (draft) |

### Interaction Notes

- **Choosing a filter resets the carousel to the first kudo** — source: `TBD (draft)`
- **Filters affect only the Highlight section, not the feed or the cloud** (resolved D002) — source: `TBD (draft)`
- **Highlight is the "Kudos Quốc Dân" ranking; there is no separate Quốc Dân section** (G12) — source: `TBD (draft)`
- **Data loads on open and again when the tab regains focus; there is no live push** (resolved D012) — source: `TBD (draft)`
- **The info card closes when the pointer leaves both avatar and card** — source: `TBD (draft)`

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading (section) | First request for a section | Skeleton in that section only | none | TBD (draft) |
| loading more | Next feed page requested | Small spinner below the last card | none | TBD (draft) |
| empty (highlight) | No kudo matches | Message and a "clear filters" link | Clear filters | TBD (draft) |
| empty (feed) | No public kudos | Message inviting the first kudo | Use the floating Viết KUDOS button (shell) | TBD (draft) |
| empty (cloud) | No names | Message in place of the cloud | none | TBD (draft) |
| empty (recipients) | No gift recipients yet | Short message in the sidebar list | none | TBD (draft) |
| end | No more feed pages | Quiet end marker | none | TBD (draft) |
| error (section) | Section request fails | Message with Retry in that section | Retry | TBD (draft) |
| success (copy) | Link copied | "Link copied" on the button, clears itself | none | TBD (draft) |
| anonymous sender | Kudo sent anonymously, viewer not admin | Placeholder avatar, label "Ẩn danh", no hover or link | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E07 | Matches ignore case and Vietnamese accents | "No result" when nothing matches | change |
| E02, E03 | One value at a time; "All" clears it | Empty state when nothing matches | change |
| E19 | Needs clipboard permission | "Link copied" or "Press Ctrl+C to copy." (draft wording, D010) | click |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The kudo was sent anonymously and the viewer is not an admin | auth | E11, E23 | "Ẩn danh" label shown | Name, avatar, unit, link and hover card hidden | Admins see the real sender |
| The kudo has images | configuration | E16 | 1 to 5 images exist | No images | Row is omitted entirely |
| The viewer has no unopened secret boxes | configuration | E21 | — | — | Button disabled; the unopened count comes from F008 |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Shell header | "Sun* Kudos" link | Signed in | TBD (draft) |
| Homepage | "About Kudos" / Kudos block | Signed in | TBD (draft) |
| SCR-kudo-detail | "Đóng" | — | TBD (draft) |
| Notifications panel | A kudo-related notice | Signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Open kudo | E06, E10 | — | SCR-kudo-detail | modal (over this page) | TBD (draft) |
| Open Sunner profile | E09, E11, E22 | Sender not hidden | Profile screens (F007) | redirect | TBD (draft) |
| Open Secret Box | E21 | Unopened box exists | Secret box flow (F008) | modal | TBD (draft) |
| Write a kudo | Shell floating button | — | Write-kudo window (F005) | modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Carousel announced as a region with "n of 5"; filters labelled; cloud names exposed as a plain list of links |
| Keyboard navigation | [EXPECTED] | Filters, carousel buttons, search, cards, avatars and Copy Link reachable by Tab; hover card also opens on focus |
| Focus management | [EXPECTED] | Focus returns to the clicked card after the detail closes |
| Screen reader compatibility | [EXPECTED] | New cards loaded by scroll announced politely; section errors announced |
| Error announcement | [EXPECTED] | Section error messages use a live region |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
