---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-app-shell — Screen Spec

**Screen**: SCR-app-shell: App Shell (header, footer, floating action button, language and profile dropdowns)
**Feature**: F001_AppShellI18n
**Type**: composite
**Route**: full variant = `app/(shell)/layout.tsx` around signed-in pages (Figma `313:9137`, `313:9139`, `721:4942`, `721:5223`, `721:5277`); minimal variant = `app/(minimal)/layout.tsx` on Login and the same minimal chrome on 403/404; admin variant = `app/admin/layout.tsx`; absent on `/countdown`. The root `app/layout.tsx` carries no chrome (Codex R07).
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** Gives every Sunner the same way to move between sections, open notifications, switch language, reach their profile and start a kudo or read the rules, from any page.
**Actors:** Sunner, Admin, Visitor (minimal variant only)
**Entry Conditions:** A page other than Countdown is being shown; full and admin variants need a signed-in session, minimal variant (Login, 403 and 404 pages, signed in or not) does not.
**Exit Conditions:** The user follows a link, picks a menu item, opens a panel/modal owned by another feature, or changes language and stays on the page.

## 2. Screen Layout

### Layout Sketch

A fixed header runs across the top, page content fills the middle, the footer closes the page, and a floating action button sits bottom-right above content. Dropdowns (language, avatar) float below the header's right side. Desktop layout only, designed at 1440 wide; release acceptance at a minimum viewport width of 1280 px, narrower windows keep this layout with horizontal scroll (AD01, R17).

```
┌─────────────────────────────────────────────────────────────┐
│ R1 Header (fixed-top)                                       │
│ [Logo] [About SAA 2025][Awards Information][Sun* Kudos]     │
│                          [Bell] [VN v] [Avatar]             │
├─────────────────────────────────────────────────────────────┤
│ R2 Page content (owned by each page)                        │
│                                                             │
│                                              ┌────────────┐ │
│                                              │ R4 FAB     │ │
├──────────────────────────────────────────────┴────────────┴─┤
│ R3 Footer: [Logo] Home | Awards | Kudos | Community Stds     │
│ Copyright                                                   │
└─────────────────────────────────────────────────────────────┘
  - - R5 dropdowns (language / avatar): floating under header - -
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | fixed-top | no | TBD (draft) |
| R2 | Page content slot | static | yes | TBD (draft) |
| R3 | Footer | static | no | TBD (draft) |
| R4 | Floating action button | fixed bottom-right | no | TBD (draft) |
| R5 | Dropdowns (language, avatar) | floating below R1 | no | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Logo (header) | link | — | — | Full | Goes to Homepage | static | — | — | N/A |
| E02 | About SAA 2025 | link | — | normal (selected when the current pathname matches, via client `NavLinks` + `usePathname()`, Codex R07) | Full | Goes to Homepage | static | — | — | N/A |
| E03 | Awards Information | link | — | normal | Full | Goes to Awards Information | static | — | — | N/A |
| E04 | Sun* Kudos | link | — | normal | Full | Goes to Kudos live board | static | — | — | N/A |
| E05 | Notification bell | button | — | no dot | Full | Opens notification panel (F009) | TBD (draft) | — | no dot | N/A |
| E06 | Unread dot | display field | — | hidden | Conditional | — | TBD (draft) | — | hidden | N/A |
| E07 | Language control | button | — | current language | Always (also Login) | Opens language dropdown | store state | code + flag | — | N/A |
| E08 | Language option VN | button | — | — | Conditional | Switches to Vietnamese | static | — | — | N/A |
| E09 | Language option EN | button | — | — | Conditional | Switches to English | static | — | — | N/A |
| E10 | Avatar button | button | — | user avatar | Full | Opens avatar menu | TBD (draft) | image | initials | N/A |
| E11 | Menu item Profile | button | — | — | Conditional | Opens own profile | static | — | — | N/A |
| E12 | Menu item Admin | button | — | — | Conditional | Opens admin overview | static | — | — | N/A |
| E13 | Menu item Logout | button | — | — | Conditional | Ends session (F002) | static | — | — | N/A |
| E14 | Footer link Home | link | — | — | Full | Goes to Homepage | static | — | — | N/A |
| E15 | Footer link Awards | link | — | — | Full | Goes to Awards Information | static | — | — | N/A |
| E16 | Footer link Kudos | link | — | — | Full | Goes to Kudos live board | static | — | — | N/A |
| E17 | Footer link Community Standards | link | — | — | Full | Goes to Community Standards | static | — | — | N/A |
| E18 | Copyright line | display field | — | — | Always | — | static | text | — | N/A |
| E19 | Floating action button | button | — | closed | Full | Opens/closes the two choices | static | — | — | N/A |
| E20 | FAB item Thể lệ | button | — | — | Conditional | Opens rules panel (F008) | static | — | — | N/A |
| E21 | FAB item Viết KUDOS | button | — | — | Conditional | Opens write-kudo form (F005) | static | — | — | N/A |

<!-- Footer link labels and exact copyright wording [EXPECTED]: to be confirmed against Figma. Header/footer link names differ slightly between source docs ("Awards" vs "Award" Information; "Tiêu chuẩn chung" vs "Tiêu chuẩn cộng đồng"). -->

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Open language dropdown | E07 | click | — | E08, E09 appear under E07 | TBD (draft) |
| Pick language | E08, E09 | click | — | dropdown closes; page re-renders in chosen language; E07 shows new code | TBD (draft) |
| Open avatar menu | E10 | click | signed in | E11, E13 (and E12 for admins) appear | TBD (draft) |
| Close any dropdown | E07, E10 | outside click, Escape | dropdown open | dropdown closes | TBD (draft) |
| Open notifications | E05 | click | signed in | notification panel opens (owned by F009) | TBD (draft) |
| Open FAB | E19 | click | full variant | E20 and E21 appear | TBD (draft) |
| Close FAB | E19 | click, Escape, outside click | FAB open | E20 and E21 hide | TBD (draft) |
| Pick rules / write kudo | E20, E21 | click | FAB open | FAB closes; matching panel opens (F008 / F005) | TBD (draft) |

### Happy Path

1. User lands on a signed-in page and sees R1 header, R3 footer and R4 button around the content.
2. User clicks E07 and picks EN in R5 — the page re-renders in English.
3. User clicks E19 in R4 and picks "Viết KUDOS" — the write-kudo form opens over the page.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 2 | E07 pick equals current language | dropdown closes, nothing changes | TBD (draft) |
| Avatar menu | user is admin | E12 listed between E11 and E13 | TBD (draft) |

### Interaction Notes

- **Only one dropdown or the FAB choices are open at a time; opening one closes the others** — source: TBD (draft)
- **Keyboard: Tab reaches header, content, footer, FAB in that order; Enter/Space activate; Escape closes** — source: TBD (draft)

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | session summary being read from the backend's current-user endpoint | header renders links and language control at once; avatar shows a placeholder circle | all links, language | TBD (draft) |
| empty | no notifications | bell without dot | open bell | TBD (draft) |
| error | session summary cannot be read (Go error or no answer within 5 s, Codex R23) | header shows links and language only; avatar and bell hidden | links, language | TBD (draft) |
| profile missing | session summary answers `profile_not_provisioned` | one re-provision attempt; on failure no header or footer renders — the page shows only the client recovery step, which signs the session out in the browser and then replaces the page with Login showing a message (F002, Codex R22, N06) | none | TBD (draft) |
| refreshed | window regains focus | session summary re-read; avatar, name and Admin item updated without reload (Codex R07) | all | TBD (draft) |
| saving | language change in flight | dropdown closes, page content dims briefly | none | TBD (draft) |
| success | language changed | page re-rendered in new language, E07 updated | continue | TBD (draft) |
| minimal variant (Login, 403, 404) | route is Login or an error page | only E07 and E18 shown | E07 | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Viewer is signed in | auth | E01-E05, E10, E14-E17, E19 | signed in, full variant | not signed in | minimal variant keeps E07, E18 only |
| Viewer is an admin | auth | E12 | role returned by the backend is admin | any other role | hiding is cosmetic; page and data protection is F002's, enforced by the backend |
| Write-kudo form is open | configuration | E07 | — | form open (E07 disabled) | language switching is blocked while the form is open (D005) |
| Language dropdown open | responsive | E08, E09 | E07 clicked | outside click, Escape, pick | — |
| FAB open | responsive | E20, E21 | E19 clicked | outside click, Escape, pick | — |
| Unread notifications exist | configuration | E06 | at least one unread | none unread | count supplied by F009 |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| every signed-in page | page renders | session present | TBD (draft) |
| Login page, 403 and 404 pages (minimal variant) | page renders | any | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Go Homepage | E01, E02, E14 | — | Homepage SAA | redirect | TBD (draft) |
| Go Awards | E03, E15 | — | Hệ thống giải | redirect | TBD (draft) |
| Go Kudos | E04, E16 | — | Sun* Kudos - Live board | redirect | TBD (draft) |
| Go Community Standards | E17 | — | Tiêu chuẩn cộng đồng | redirect | TBD (draft) |
| Open notifications | E05 | signed in | Tất cả thông báo | modal | TBD (draft) |
| Go Profile | E11 | signed in | Profile bản thân | redirect | TBD (draft) |
| Go Admin | E12 | admin | Admin - Overview | redirect | TBD (draft) |
| Logout | E13 | signed in | Login | redirect | TBD (draft) |
| Open rules | E20 | FAB open | Thể lệ panel | modal | TBD (draft) |
| Write kudo | E21 | FAB open | Viết Kudo modal | modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | landmarks for header, nav, footer; labels on bell, avatar, language control, FAB; menu roles on dropdowns |
| Keyboard navigation | [EXPECTED] | every control reachable by Tab; Enter/Space activate; Escape closes dropdowns and FAB |
| Focus management | [EXPECTED] | focus moves into an opened dropdown and returns to its trigger on close; focus goes to the opened panel after a FAB pick |
| Screen reader compatibility | [EXPECTED] | `lang` attribute follows the active language; current nav link marked as current page |
| Error announcement | [EXPECTED] | language change announced politely via a live region |

## 10. Responsive Behavior

Desktop only (AD01, R17): minimum viewport width 1280 px; narrower windows keep the desktop layout with horizontal scroll. No collapsed header or mobile/tablet menu is in release scope.
