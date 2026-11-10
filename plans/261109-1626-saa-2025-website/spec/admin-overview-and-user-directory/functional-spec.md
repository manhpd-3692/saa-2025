---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# Functional Spec — F010_AdminOverviewUsers

**Priority**: P3
**Type**: ui

**See also:** [`technical-spec.md`](./technical-spec.md) — planned handlers, counting algorithm, export, configuration.

## 1. Overview

**Problem:** Admins running the SAA 2025 kudos campaign cannot tell which units take part, who is active, or how far Sunners have progressed, so they cannot nudge quiet units or report results.
**Solution:** Two admin pages and a shared admin header. Overview shows one row per unit (plus an All row) with members, kudos sent and received, people with at least one kudo and secret boxes received, for a chosen date range, with Export. User shows every Sunner with their kudos, hearts, level, badges, last login and role, filterable by unit, level and role, searchable, with Export.
**Scope:** Overview table and date range; User directory table, filters, search and paging; export of both as files; admin header links (Overview, Review content, User, Settings).
**Non-Scope:** Editing users, changing roles (admins are seeded by email; there is no role-management UI) or unit membership; marking kudos Public or Spam (F011); campaigns (F012); the admin access gate itself and roles (F002); the shared header, language control and 403 page (F001); how level, badges, hearts and secret boxes are earned (F008); charts or dashboards; mobile and tablet layouts (out of release scope, AD01, R17 — desktop windows from 1280 px wide; narrower windows scroll sideways).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | signed-in Sunner with the admin role | see participation per unit, find and review individual Sunners, take the numbers out as a file |
| Sunner | signed-in user without the admin role | none here — is told "no access" if they reach an admin address (F001, F002) |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Monitor participation per unit | See per-unit and overall kudos activity for a date range, change the range, export the table | US001, US002, US003 | FR-101, FR-102, FR-103, FR-104, FR-401, FR-402, FR-602 | BR-001, BR-002, BR-003, BR-004, BR-006, SM-001 | TBD (draft) |
| CAP-02 | Review the user directory | Browse all Sunners, filter by unit, level and role, search by name or email, export the filtered list | US004, US005, US006 | FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-403 | BR-004, BR-005, BR-008, DEC-002, DEC-003 | TBD (draft) |
| CAP-03 | Move between admin sections | Use one admin header to switch between Overview, Review content, User and Settings | US007 | FR-001, FR-002 | DEC-001 | TBD (draft) |

Cross-cutting: FR-601 and BR-007 (every admin read path checks the admin role) apply to all three capabilities.

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Which date range does Overview open with? | Last 30 days ending today — resolved (applied default AD10) | The design only shows a sample range; a recent window is useful on first open | no |
| D002 | What counts in Overview? | Spam kudos excluded; "users with at least one kudo" = sent or received in the range; Total member = current headcount of the unit — resolved (applied default AD10) | Spam should not inflate participation; headcount is not a range-based figure | no |
| D003 | Users with no unit | Counted in the All row only; no row of their own — resolved (applied default AD10) | Keeps the unit list clean; All still totals everyone (so unit rows may not add up to All) | no |
| D004 | Export file format | CSV, UTF-8 with byte-order mark so Excel reads Vietnamese, built by the backend — resolved (applied default AD10) | Simplest; Excel opens it; XLSX adds a library for no stated need | no |
| D005 | Meaning of Level, Number of Badges and Time to get 6 Badges | Level = hero tier (New, Rising, Super, Legend) as the gamification feature derives it; Number of Badges = distinct secret-box icons collected, 0-6 (each opened box reveals exactly one of six icons with equal odds and repeats allowed, so a repeat adds no badge); Time to get 6 = time from the first opened box to the box that revealed the sixth distinct icon, dash if fewer than 6 — resolved (G09; applied default AD10) | Matches the gamification badge and icon model | no |
| D006 | Meaning of Total Heart | Weighted total of hearts received on the user's kudos: each heart counts with the weight fixed when it was given (highest active campaign multiplier, else 1) — the same number shown on cards, profiles and rankings — resolved (G08) | One definition of hearts across the app | no |
| D007 | Exact column and label copy | Use the design's English labels, with "Total user have atleast kudos" corrected to "Total users with at least one kudo"; Vietnamese copy supplied with the dictionaries — resolved (applied default AD10) | Figma text was read from the screen flow notes only | no |
| D008 | What the row "⋯" Actions menu contains | One item, "View profile" (opens the Sunner's profile). No role or account actions: Role is display only and admins are seeded by email, never granted from the app — resolved (G02; applied default AD10) | Frames show the icon but no menu; there is no role-management screen | no |
| D009 | Report time zone for date ranges | Asia/Ho_Chi_Minh — resolved (applied default AD10) | Event is in Vietnam; a day boundary must be unambiguous | no |
| D010 | What the "ID" column shows | A short form of the user id (first 8 characters) — resolved (applied default AD10) | No employee code exists in the data model; a short id is stable across filters | no |
| D011 | The User nav item's label | "User" (one design frame labels it "Role") — resolved (applied default AD10) | Page title in the design is "User" | no |
| D012 | What the time dropdown next to the range offers | Quick ranges: Last 7 days, Last 30 days, This month, Custom — resolved (applied default AD10) | Frame "Dropdown chọn thời gian" content not read | no |
| D013 | Sorting and page size on User | Ordered by name A-Z; 20 rows per page; no sortable headers — resolved (applied default AD10) | Smallest thing that works for a directory | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Every admin page shows the admin header: logo with "ADMIN", links Overview, Review content, User, Settings, then bell, language control and avatar; the link for the current page is highlighted.
- **FR-002** All admin text appears in Vietnamese or English according to the chosen language.

### Overview (1xx)

- **FR-101** Overview lists a first row "All" and one row per unit, with columns No, Unit, Total member, Total sent kudos, Total received kudos, Total user have atleast kudos, Total received secret box.
- **FR-102** Sent, received, "at least one kudo" and secret-box figures cover only the chosen date range; Total member is the unit's current headcount.
- **FR-103** The All row counts every person once, including people without a unit.
- **FR-104** Overview opens with a default range when none is given or the given one is invalid.

### User directory (2xx)

- **FR-201** User lists each Sunner with ID, name and avatar, email, kudos sent, kudos received, total hearts, level, number of badges, time to get 6 badges, last login, role and an Actions menu.
- **FR-202** The list can be narrowed by Unit, Level and Role; filters combine.
- **FR-203** A search box finds Sunners by name or email and suggests matches while typing.
- **FR-204** The list is split into pages.
- **FR-205** Each row has an Actions (⋯) menu with one item, View profile.
- **FR-206** Role is shown only; the page offers no way to change a role (admins are seeded by email).
- **FR-207** Total Heart is the weighted total of hearts received on the Sunner's public received kudos, the same figure as the profile's hearts received (F007) (each heart counted with the weight fixed when it was given); Number of Badges is the count of distinct secret-box icons collected, 0 to 6.

### Interaction (4xx)

- **FR-401** The admin picks a start day and an end day on a calendar or a quick range from a dropdown; the table then reloads for that range.
- **FR-402** Export on Overview downloads the table for the current range as a file.
- **FR-403** Export on User downloads every Sunner matching the current filters and search, not only the visible page.

### Security (6xx)

- **FR-601** Only admins can open these pages or receive their data or files; anyone else is refused — the pages show the "no access" page (checked visually) and the backend's data and file requests answer with status 403 (Codex R18).
- **FR-602** Text in exported files that would be read as a spreadsheet formula is made harmless.

## 5. Business Rules

- Kudos and secret boxes are counted by their date inside the chosen range, both end days included; headcount ignores the range (BR-001).
- Spam kudos are not counted anywhere on Overview (BR-002).
- The All row counts each person once, so it can be less than the sum of the unit rows (BR-003).
- In exported files, names, emails and unit names that begin with =, +, -, @ get a leading apostrophe (BR-004).
- Filters combine; search matches name or email, ignoring case (BR-005).
- The end day cannot be before the start day; an invalid range in the address falls back to the default (BR-006).
- Every admin page, export and suggestion request checks the admin role on its own in the backend — hiding a link is not protection (BR-007).
- Total Heart sums each received heart's fixed weight (1, or the campaign multiplier active when it was given); deleting a campaign later does not change it (BR-008).
- A "Time to get 6 Badges" value is shown only for a Sunner with all 6 badges; otherwise a dash (DEC-003).
- An empty User list shows "no user matches" when a filter or search is set, "no users yet" otherwise (DEC-002).
- Exactly one header link is highlighted: `/admin` Overview, `/admin/review` Review content, `/admin/users` User, `/admin/settings` Settings (DEC-001).
- The date picker moves from nothing chosen, to start chosen, to range chosen; closing it before an end day changes nothing (SM-001).

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Admin - Overview | TBD (draft) | admin header, title "Overview", date range, Export, table per unit | change date range, export |
| Admin - User | TBD (draft) | admin header, title "User", Unit / Level / Role filters, search, Export, user table, pager | filter, search, page, export, open row menu |

The date picker, "pick date", time dropdown, search-user dropdown and the Unit, Level and Role dropdowns are overlays inside these two screens, not separate screens.

### User Journey

1. Admin opens the avatar menu and picks Admin — Overview opens with the last 30 days.
2. Admin clicks the date range, picks a start and end day, applies — the table reloads.
3. Admin clicks Export — a file with the same table downloads.
4. Admin clicks User in the header — the directory opens, first page, A-Z.
5. Admin picks a unit and a role, types a name — the list narrows; Export downloads the narrowed list.

## 7. User Stories

### US001 — See participation per unit

**Actor:** Admin
**Goal:** See, for a period, how many kudos each unit sent and received and how many of its people took part.
**Business value:** Shows where the campaign works and which units need a nudge.

**Acceptance Criteria:**
- [ ] First row is All, then one row per unit, with the seven columns.
- [ ] Figures cover the chosen range; Total member is the current headcount.
- [ ] A unit without activity shows 0, not blank.

### US002 — Change the period

**Actor:** Admin
**Goal:** Look at any period, not only the default one.
**Business value:** Lets the admin compare weeks or report on the whole event.

**Acceptance Criteria:**
- [ ] A calendar lets the admin pick a start day then an end day.
- [ ] An end day before the start is not accepted.
- [ ] The table reloads for the applied range.

### US003 — Export the Overview

**Actor:** Admin
**Goal:** Take the Overview numbers into a spreadsheet.
**Business value:** Reports to management without retyping.

**Acceptance Criteria:**
- [ ] Export downloads a file with the table for the current range.
- [ ] The numbers equal the on-screen numbers.

### US004 — Browse the user directory

**Actor:** Admin
**Goal:** See every Sunner with their kudos, hearts, level, badges, last login and role.
**Business value:** Finds who is active, who has not logged in, and who has reached badge milestones.

**Acceptance Criteria:**
- [ ] The table shows the twelve columns, 20 rows a page, ordered by name.
- [ ] A Sunner with all 6 badges shows how long it took; others show a dash.
- [ ] A person who never logged in shows a dash for Last Logged in.
- [ ] Total Heart equals the weighted heart total shown elsewhere in the app; Role is text only, with no control to change it.

### US005 — Filter and search users

**Actor:** Admin
**Goal:** Narrow the list to a unit, level or role, or find one person.
**Business value:** Answers "who in unit X is Legend?" or "find this email" in seconds.

**Acceptance Criteria:**
- [ ] Unit, Level and Role dropdowns narrow the list together.
- [ ] Typing in the search box suggests matching people; Enter searches the typed text.
- [ ] No match shows an empty state with a way to clear filters.

### US006 — Export the user directory

**Actor:** Admin
**Goal:** Take the filtered user list into a spreadsheet.
**Business value:** Follow-up lists (for example inactive Sunners of a unit) can be shared.

**Acceptance Criteria:**
- [ ] The file holds every match of the current filters, not only one page.
- [ ] Columns match the table, without Actions.

### US007 — Switch between admin sections

**Actor:** Admin
**Goal:** Move between Overview, Review content, User and Settings.
**Business value:** One consistent way around the admin area.

**Acceptance Criteria:**
- [ ] The header shows the four links with the current one highlighted.
- [ ] A Sunner without admin role who types an admin address sees the "no access" page.

## 8. Scenarios

### US001 — Happy Path

**Given** two units with kudos in the last 30 days, **When** the admin opens Overview, **Then** the table shows All first and each unit's own figures.

### US001 — Error: data cannot be loaded

**Given** the backend does not answer, **When** the admin opens Overview, **Then** an error message with Retry replaces the table and the header still works.

### US002 — Happy Path

**Given** the admin opens the range picker, **When** the admin picks 2026-11-01 then 2026-11-08 and applies, **Then** the table reloads for those days.

### US002 — Error: end before start

**Given** the admin picked a start day, **When** the admin tries to pick an earlier end day, **Then** that day is not accepted and the picker keeps waiting for a valid end day.

### US003 — Happy Path

**Given** a range is applied, **When** the admin clicks Export, **Then** a file with the same rows and numbers downloads.

### US003 — Error: export fails

**Given** the server fails while building the file — before any row is sent, or after several rows have already been sent — **When** the admin clicks Export, **Then** no file is saved (never a cut-off file) and a short message says the export failed, with the option to try again (Codex N11).

### US004 — Happy Path

**Given** 45 Sunners, **When** the admin opens User, **Then** the first 20 show A-Z with a pager of three pages.

### US004 — Error: not an admin

**Given** a signed-in Sunner without admin role, **When** the Sunner opens the User address, **Then** the "no access" page appears and no user data is sent.

### US005 — Happy Path

**Given** the admin picked Unit CECV1 and Role admin, **When** the list reloads, **Then** only admins of CECV1 show.

### US005 — Error: nothing matches

**Given** a search that matches nobody, **When** the list reloads, **Then** "no user matches" appears with a Clear filters link.

### US006 — Happy Path

**Given** Unit CECV2 is selected, **When** the admin clicks Export, **Then** the file holds all CECV2 Sunners, even those on later pages.

### US006 — Error: name starts with a formula character

**Given** a Sunner named "=SUM(A1)", **When** the file is exported and opened in a spreadsheet, **Then** the name shows as text, not as a calculation.

### US007 — Happy Path

**Given** the admin is on User, **When** the admin clicks Settings, **Then** the Settings page opens with Settings highlighted.

### US007 — Error: section not built yet

**Given** Review content or Settings is not available yet, **When** the admin clicks it, **Then** the "page not found" page appears.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Range in the address is missing, malformed or reversed | Default range used | None — silent handling |
| Range has no kudos at all | Every unit shows 0 | None — zeros are shown |
| Sunner has no unit | Counted in All; no unit row; Unit filter cannot select them | None — silent handling |
| Page number beyond the last page | Last page shown | None — silent handling |
| Search text has % or _ | Treated as plain characters | None — silent handling |
| Same Sunner both sends and receives in range | Counted once in "at least one kudo" | None — silent handling |
| Non-admin requests an export or suggestion address directly | Request refused, nothing returned | "You do not have access to this page." *(copy to confirm)* |
| Never logged in | Last Logged in shows a dash | None — dash shown |
| Query or export fails, or takes too long (over 5 s for a page, 20 s for an export, Codex R23) | Inline error with Retry; no partial file — an export that fails after part of the file was sent is cut off by the server and the browser keeps nothing, because it saves the file only once it has fully arrived (Codex N11) | "Could not load the data. Try again." *(copy to confirm)* |
| Sunner received hearts during a since-deleted campaign | Total Heart still counts those hearts with their original weight | None — silent handling |
| Sunner opened 9 boxes but collected only 4 distinct icons | Number of Badges shows 4; Time to get 6 Badges shows a dash | None — dash shown |

## 10. Edge Behaviours to Verify

- **FR-101** → All is the first row; every unit is listed even with zero activity.
- **FR-102** → a kudo sent on the last day of the range is counted; one sent the day after is not; headcount does not change with the range.
- **FR-103** → All people count equals the number of distinct Sunners, including those without a unit.
- **FR-104** → `/admin?from=bad` opens with the default range, no error.
- **FR-202** → Unit + Level + Role together return the intersection.
- **FR-203** → typing one character shows no suggestions; two or more do.
- **FR-401** → an end day earlier than the start cannot be applied.
- **FR-402** → exported numbers equal the table for the same range.
- **FR-403** → export of a 45-user filter result has all matching rows, not 20.
- **FR-207** → a kudo with one weight-1 heart and one weight-2 heart adds 3 to the receiver's Total Heart; a repeated icon does not raise Number of Badges.
- **FR-601** → a user-role account gets "no access" on both pages and on all three file or suggestion addresses.
- **FR-602** → an exported name starting with `=` opens as text.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Level, badges, time to 6 badges and hearts are defined by F008; F010 reads them through F008's shared backend queries (weighted heart total, hero tier, opened box icons) instead of a second definition | Rework of the user query and Level filter if F008's read model changes | [EXPECTED] mitigated by reusing F008's queries |
| RISK-02 | risk | Admin aggregate reads cross every Sunner's kudos; a missing role check on a file or suggestion address would leak personal data | Exposure of emails and activity of all Sunners | [EXPECTED] mitigated by BR-007: the backend admin middleware guards every admin endpoint |
| RISK-03 | risk | Exact visual values and Vietnamese copy are not read from the design; the time dropdown and Actions menu content are settled (D012, D008) | Wording and small layout changes late in build | [EXPECTED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002_GoogleAuth | feature | admin role (seeded by email), backend admin middleware and `/admin/*` sign-in redirect, `users` and `units` data, last login time; the browser-to-backend rules that let file downloads keep their file name (Codex R06) | FR-601, FR-201, FR-206, FR-402, FR-403 |
| F001_AppShellI18n | feature | admin page frame that imports this feature's admin link list and highlights the current link (Codex R07), language dictionaries, 403 and 404 pages | FR-001, FR-002 |
| F005_KudoCompose | feature | `kudos` rows that are counted | FR-102 |
| F008_KudosGamification | feature | weighted heart totals (`kudo_heart_state`), secret boxes and opened icons, hero tier — read through its shared backend queries | FR-201, FR-207, D005, D006 |
| F011_AdminKudoModeration | feature | kudo status `spam` that Overview excludes; target of the Review content link | BR-002, DEC-001 |
| F012_AdminCampaigns | feature | target of the Settings link | DEC-001 |
| F007_SunnerProfile | feature | profile page opened from the row menu (default) | FR-205, D008 |

## 13. Configuration

```text
DEFAULT_RANGE            = last 30 days ending today   # Overview opens with this (AD10)
REPORT_TIME_ZONE         = Asia/Ho_Chi_Minh            # where a "day" starts and ends (AD10)
USERS_PER_PAGE           = 20                          # AD10
SEARCH_SUGGEST_MIN_CHARS = 2                           # suggestions start from this many characters
EXPORT_FORMAT            = CSV (UTF-8 with BOM)        # AD10; built by the backend
```
