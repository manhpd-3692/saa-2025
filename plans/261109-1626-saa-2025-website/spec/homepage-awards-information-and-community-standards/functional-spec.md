---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P1
**Type**: ui

**See also:** [`technical-spec.md`](./technical-spec.md) — actions, data reads and verification for Dev/QA.

## 1. Overview

**Problem:** Sunners need one place to learn what Sun* Annual Awards 2025 ("Root Further") is, when and where it happens, which six awards exist and what they are worth, and which conduct rules apply to Kudos.
**Solution:** Three read-only pages: a Homepage that introduces the event and links onward, an Awards Information page that details the six awards, and a Community Standards page that lists the content rules and security standards.
**Scope:** The Sunner learns about the event and its rules: homepage content, the six-award system, and the community standards text.
**Non-Scope:** Header, footer and floating action button (F001); sign-in and access control (F002); the standalone pre-launch countdown page (F003); writing or browsing Kudos (F005/F006); any admin editing of this content.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A signed-in Sun* employee attending or following SAA 2025 | Understand the event, the awards and the community rules |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Explore the event homepage | See the event branding, countdown, event info, about text, award cards and Kudos teaser, and move on to Awards or Kudos | US001, US002, US005 | FR-001, FR-002, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-403, FR-601 | DEC-001 | Homepage SAA |
| CAP-02 | Browse the award system | Jump between the six awards via a sticky menu and read each award's description, quantity and prize | US003 | FR-102, FR-301, FR-302, FR-303, FR-304, FR-305, FR-401, FR-402 | BR-001, BR-002, BR-003, DEC-002 | Awards Information |
| CAP-03 | Read the community standards | Read the ten content rules and the security standards | US004 | FR-103, FR-351, FR-352 | — | Community Standards |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | What does the homepage countdown count down to, given the pre-launch gate sends everyone to the countdown page until the event starts? And what shows at zero? | Count to the ceremony time, the seeded `ceremony_at` on the event record (the launch gate and Countdown page keep using the start time); at zero every unit shows 00 — resolved (G13) | Homepage is only reachable after launch, so reusing the launch time would always read zero | no |
| D002 | Where do event date, venue and livestream note come from? | Read from the shared event record (same row as F003), served by the backend's public current-event endpoint — resolved (applied default AD04) | One source of truth; changed only by seed/database change (F003 D006) | no |
| D003 | Exact wording of the ten content rules and the security standards (not in the docs; only in the design) | Transcribe from Figma frame `1161:8944` at build time, Vietnamese first — resolved (applied default AD04) | Cannot be invented | no |
| D004 | Are English texts available for the about section, award descriptions and community standards? | Vietnamese is the master; show Vietnamese where English is missing — resolved (applied default AD04) | Avoids blocking launch on translation | no |
| D005 | Is the Kudos teaser block static copy or does it show live Kudos figures? | Static copy only — resolved (applied default AD04) | Live figures belong to the Kudos board (F006); YAGNI | no |
| D006 | Are awards static content shipped with the app or a managed table? | Static content shipped with the website (no table, no admin editing) — resolved (applied default AD04) | Six fixed awards; no admin screen edits them | no |
| D007 | Is page-view or click analytics required for these pages? | None — resolved (applied default AD04) | Not requested in the feature list; YAGNI | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** The six awards are defined once and every page that shows them reads that single definition.
- **FR-002** All text on the three pages follows the language the user selected (Vietnamese or English); where English copy is not yet available, the Vietnamese master text is shown (D004).

### Navigation (1xx)

- **FR-101** The Homepage is the landing page a signed-in Sunner reaches once the event has started.
- **FR-102** Awards Information opens from the header, footer, the homepage "ABOUT AWARDS" button and each homepage award card, and can open directly at one specific award.
- **FR-103** Community Standards opens from the footer link and from a spam-warning notification.

### Homepage SAA (2xx)

- **FR-201** The page opens with a hero showing the Root Further branding and key visual.
- **FR-202** A countdown block shows days, hours and minutes until the ceremony time stored on the event record, under a "Coming soon" label; once the ceremony time is reached every unit shows 00 and the countdown stops. This countdown never moves the visitor to another page, even though the site has already launched (Codex R08).
- **FR-203** An event info block shows date, venue and livestream note, read from the shared event record.
- **FR-204** Two buttons, "ABOUT AWARDS" and "ABOUT KUDOS", lead to the Awards Information page and the Kudos board.
- **FR-205** A long-form text explains the "Root Further" theme of the event.
- **FR-206** Six award cards show image, name and short description, each with a "Chi tiet" link to that award on the Awards Information page.
- **FR-207** A Sun* Kudos block introduces the recognition movement with a "Chi tiet" button to the Kudos board.

### Awards Information (3xx)

- **FR-301** The page shows a key visual and the title "He thong giai thuong SAA 2025".
- **FR-302** A sticky menu lists the six awards in fixed order: Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP.
- **FR-303** Each award has a detail card with image, name, description, quantity with unit, and prize value.
- **FR-304** Signature 2025 - Creator shows two prize values, individual and team, separated by "Or".
- **FR-305** A Sun* Kudos block with a "Chi tiet" button to the Kudos board closes the page.

### Community Standards (35x)

- **FR-351** The page lists ten numbered content rules, each with a title and an explanation.
- **FR-352** The page also lists the security standards.

### Interaction (4xx)

- **FR-401** Choosing a menu item scrolls smoothly to that award and puts it in the address so the link can be shared.
- **FR-402** The menu item of the award currently on screen is highlighted while the user scrolls.
- **FR-403** The countdown keeps updating while the page is open.

### Security (6xx)

- **FR-601** All three pages are available to signed-in users only.

## 5. Business Rules

- The six awards appear in one fixed order with the same names and prizes on every page that shows them (BR-001).
- Signature 2025 - Creator is the only award with two prize values, individual and team; all others have one (BR-002).
- An award link that does not match any award opens the page at the top without an error (BR-003).
- The countdown counts to the ceremony time and shows zero-padded days, hours and minutes while time remains; at or after the ceremony time every unit shows 00 and it stops, with no redirect (DEC-001, Codex R08).
- The highlighted menu item is the topmost award at least 30% on screen, or the first award before any card is reached (DEC-002).

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Homepage SAA | TBD (draft) | Hero, countdown, event info, about text, six award cards, Kudos teaser | Go to Awards Information or the Kudos board; open an award |
| Awards Information | TBD (draft) | Title, sticky six-item menu, six award detail cards, Kudos teaser | Jump to an award; scroll; go to the Kudos board |
| Community Standards | TBD (draft) | Ten content rules and security standards | Read; use header/footer to leave |

### User Journey

1. Sunner signs in after the event has started and lands on the Homepage SAA, seeing the countdown, event info and the six award cards.
2. Sunner clicks "Chi tiet" on an award card — Awards Information opens scrolled to that award.
3. Sunner uses the sticky menu to read the other awards, then clicks the Kudos button to continue to the Kudos board.
4. Later, from the footer or a spam-warning notification, Sunner opens Community Standards and reads the rules.

## 7. User Stories

### US001_ExploreHomepage — See the event at a glance

**Actor:** Sunner
**Goal:** See what the event is, when and where it happens, and how long remains.
**Business value:** Builds awareness and anticipation of SAA 2025 among all staff.

**Acceptance Criteria:**
- [ ] Hero, countdown, event info and about text are visible on the homepage.
- [ ] The countdown changes while the page stays open.

### US002_OpenAwardFromHomepage — Go from a homepage award to its detail

**Actor:** Sunner
**Goal:** Open the details of one award straight from the homepage.
**Business value:** Turns curiosity about an award into the full criteria and prize info.

**Acceptance Criteria:**
- [ ] Each of the six cards leads to the matching award on Awards Information.
- [ ] "ABOUT AWARDS" opens Awards Information at the top.

### US003_BrowseAwardSystem — Read all six awards

**Actor:** Sunner
**Goal:** Compare the six awards and jump to the one I care about.
**Business value:** Staff understand what each award recognizes and what it pays.

**Acceptance Criteria:**
- [ ] Menu item click scrolls to the card and highlights the item.
- [ ] Scrolling by hand moves the highlight in award order.
- [ ] Signature 2025 - Creator shows both prize values.

### US004_ReadCommunityStandards — Know the Kudos conduct rules

**Actor:** Sunner
**Goal:** Read what counts as acceptable and as spam content, and the security standards.
**Business value:** Reduces spam Kudos and gives moderators (F011) a shared reference.

**Acceptance Criteria:**
- [ ] Ten numbered rules and the security standards are shown.
- [ ] The page opens from the footer link.

### US005_DiscoverKudosFromContent — Move from event content to Kudos

**Actor:** Sunner
**Goal:** Learn about Sun* Kudos and go to it from the homepage or awards page.
**Business value:** Drives participation in the recognition movement.

**Acceptance Criteria:**
- [ ] The Kudos block and "ABOUT KUDOS" button on the homepage lead to the Kudos board.
- [ ] The Kudos block on Awards Information leads to the Kudos board.

## 8. Scenarios

### US001_ExploreHomepage — Happy Path

**Given** the event has started and I am signed in, **When** I open the homepage, **Then** I see the hero, countdown, event info, about text, six award cards and the Kudos block.

### US001_ExploreHomepage — Error: event data unavailable

**Given** event details cannot be loaded, **When** I open the homepage, **Then** the countdown and event info show "Event details are temporarily unavailable" with a retry, and the rest of the page still shows.

### US002_OpenAwardFromHomepage — Happy Path

**Given** I am on the homepage, **When** I click "Chi tiet" on the Best Manager card, **Then** Awards Information opens scrolled to Best Manager.

### US003_BrowseAwardSystem — Happy Path

**Given** I am on Awards Information, **When** I click "MVP" in the menu, **Then** the page scrolls to the MVP card and "MVP" is highlighted.

### US003_BrowseAwardSystem — Error: unknown award link

**Given** I open an award link that matches no award, **When** the page loads, **Then** it shows from the top with no error message.

### US004_ReadCommunityStandards — Happy Path

**Given** I am signed in, **When** I click "Tieu chuan chung" in the footer, **Then** the ten rules and security standards are shown.

### US005_DiscoverKudosFromContent — Happy Path

**Given** I am on the homepage, **When** I click "ABOUT KUDOS", **Then** I arrive at the Kudos board.

### US005_DiscoverKudosFromContent — Error: not signed in

**Given** my session has expired, **When** I click any of these pages' links, **Then** I am sent to the sign-in page.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Award image fails to load | A placeholder with the award name replaces the image; layout stays put | "Image unavailable" |
| Text not yet translated to the chosen language | Vietnamese text is shown for that part | "None — silent handling" |
| Event details fail to load | Countdown and event info blocks show a fallback with retry; other content unaffected | "Event details are temporarily unavailable. Try again." |
| Award link matches no award | Page opens at the top | "None — silent handling" |
| Not signed in | Redirected to sign-in | "Please sign in to continue." |
| Ceremony time reached while the page is open | Countdown stops at 00 days, 00 hours, 00 minutes; nothing else changes | "None — silent handling" |
| Narrow phone screen | Out of release scope (AD01, R17). Inherited design: award menu becomes a horizontal tab row; cards stack in one column | "None — layout change only" |
| Browser window narrower than 1280 px | Desktop layout kept; the page scrolls horizontally (AD01, Codex R17) | "None — layout unchanged" |
| Site already open but ceremony still ahead | Countdown keeps counting to the ceremony time; the visitor stays on the homepage (Codex R08) | "None — silent handling" |

## 10. Edge Behaviours to Verify

- **FR-001** → The award names, order and prizes on the homepage match those on Awards Information.
- **FR-102** → An award link opens Awards Information at that award; an invalid one opens at the top.
- **FR-202** → Countdown numbers match the time left to the ceremony time (not the site start time), keep changing, and read 00 00 00 once it passes.
- **FR-202** → Between the site start and the ceremony time (demo data `live`), the countdown runs and nothing redirects; after returning to the tab, the numbers correct to server time; with demo data `after-ceremony`, it shows 00 00 00 at once (Codex R08, R16).
- **FR-203** → With no event record, the countdown and event info show the fallback with retry and the rest of the homepage renders (Codex R16).
- **FR-304** → Only Signature 2025 - Creator shows two prize values with "Or" between them.
- **FR-402** → Highlight follows manual scrolling in award order.
- **FR-351** → Exactly ten numbered rules appear.
- **FR-601** → A signed-out visitor to any of the three pages is sent to sign-in.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Ten content rules and security standards text is not available in the docs | Copy could drift from the design if re-typed by hand | mitigated — transcribed from Figma frame `1161:8944` at build time (D003) |
| RISK-02 | risk | Homepage countdown target may clash with the pre-launch gate (page only visible after launch) | Countdown could always read zero | resolved — counts to the separate ceremony time (D001) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_AppShellI18n | feature | Header, footer, floating button and language selection frame all three pages | FR-002, FR-102, FR-103 |
| F002_GoogleAuth | feature | Only signed-in users may open these pages | FR-601 |
| F003_EventCountdownGate | feature | Shared countdown display and arithmetic (this feature adds its own ceremony-mode wrapper, Codex R08), seed scenarios, and the shared event record (ceremony time, venue, livestream note) it owns and serves | FR-202, FR-203 |
| F006_KudosLiveBoard | feature | Destination of the Kudos buttons | FR-204, FR-207, FR-305 |
| F009_Notifications | feature | Spam-warning notification links to Community Standards | FR-103 |
| F011_AdminKudoModeration | feature | Moderators mark spam by these standards | US004 |

## 13. Configuration

```text
AWARD_TOP_TALENT          = 10 individuals x 7.000.000 VND
AWARD_TOP_PROJECT         = 2 teams x 15.000.000 VND
AWARD_TOP_PROJECT_LEADER  = 3 individuals x 7.000.000 VND
AWARD_BEST_MANAGER        = 1 individual x 10.000.000 VND
AWARD_SIGNATURE_2025      = 1 individual or team: 5.000.000 VND (individual) / 8.000.000 VND (team)
AWARD_MVP                 = 1 individual x 15.000.000 VND
ACTIVE_MENU_VISIBILITY    = 30%   # share of an award card on screen before its menu item is highlighted
MIN_VIEWPORT_WIDTH        = 1280 px  # desktop-only acceptance; narrower windows scroll horizontally (Codex R17)
```
