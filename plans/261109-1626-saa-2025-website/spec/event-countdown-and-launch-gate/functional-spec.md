---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# Functional Spec — F003_EventCountdownGate

**Priority**: P1
**Type**: mixed

**See also:** [`technical-spec.md`](./technical-spec.md) — actions, key entities, and verification for a Dev/QA/SA audience.

## 1. Overview

**Problem:** Before the Sun* Annual Awards 2025 event opens, the website must not expose the full site, and Sunners need to see how long until it opens.
**Solution:** Until the configured event start time, every page sends the visitor to a standalone full-screen countdown (days, hours, minutes); at the start moment the visitor is taken to the Homepage automatically, and after the start the countdown page itself just forwards to the Homepage.
**Scope:** The pre-launch redirect rule, the countdown page, the automatic hand-over to the Homepage, and the stored event record (start time and ceremony time) that drives them.
**Non-Scope:** The countdown block shown inside the Homepage, which counts to the ceremony time and never redirects (owned by F004; it reuses this feature's shared countdown display and arithmetic but not its hand-over behavior, Codex R08), sign-in and roles (F002), header/footer/language switch (F001), and any admin screen for editing the start time.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner (visitor) | Any person opening the site, signed in or not | See when the event opens and get into the site as soon as it does |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Event countdown and launch gate | See a live countdown before the event opens and be taken to the Homepage when it does | US001, US002, US003 | FR-001, FR-002, FR-101, FR-102, FR-103, FR-201, FR-202, FR-203, FR-204, FR-401, FR-402, FR-403, FR-601 | BR-001, BR-002, BR-003, DEC-001, DEC-002, DEC-003, DEC-004, SM-001 | TBD (draft) |

**Single-capability rationale:** US001, US002 and US003 all serve the one outcome of moving a visitor from the closed prelaunch state into the open site at the event start time.

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | When exactly does the hand-over happen, and how is the last minute shown? | Hand over at the exact start instant; minutes are rounded down, so the last minute reads 00 00 00 — resolved (applied default AD03) | Design says "reaches zero" but also shows no seconds; exact instant avoids early or late entry | no |
| D002 | Which pages stay reachable before launch? | Sign-in page, the sign-in (OAuth) callback, static assets and the countdown page itself; the event status is served by the Go backend outside the website's page routes, so it needs no exemption — resolved (applied default AD03) | Flow shows Login before the gate, so sign-in must work pre-launch | no |
| D003 | What happens if the event start time cannot be read (missing record or outage)? | Fail open: the site loads normally; the countdown page shows "Coming soon" without digits. The site-wide check waits at most 1.5 seconds for the start time before failing open (Codex R23) — resolved (applied default AD03) | A data fault must not lock out every visitor; matches design fallback | no |
| D004 | Which language does the countdown page use (it has no language switch)? | Follow the visitor's saved language from F001, Vietnamese when none — resolved (applied default AD03) | Header is absent so no control exists on the page | no |
| D005 | What if more than 99 days remain? | Days box widens to three digits — resolved (applied default AD03) | Two-digit boxes would truncate | no |
| D006 | Who changes the start time, and is there an on/off switch for prelaunch? | Stored in the database event record and set by seed/database change only; no admin screen, no extra switch — resolved (G03, applied default AD03) | F012 manages campaigns, not the event; YAGNI | no |
| D007 | Can admins bypass the gate before launch? | No bypass — resolved (applied default AD03) | Keeps the rule single and testable | no |
| D008 | Is the "Digital Numbers" font licensed for web use? | Ship it only after licensing is confirmed; otherwise use a free monospace/LED font — resolved (applied default AD03) | Design lists licensing as an open item | no |
| D009 | What is the real event start date and time? | The design sample 15 Dec 2025 18:00 Asia/Ho_Chi_Minh is the production placeholder until the real value is given; changing it is a data change, not a code change. Development and demo runs use relative seed scenarios instead (`prelaunch`, `live` default, `after-ceremony`, Codex R16) — resolved (applied default AD03) | Only source available; the value is data, not code | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** The system keeps one current event record in the database with a name, a start date-time (when the site opens) and a ceremony date-time (the Homepage countdown target, used by F004).
- **FR-002** Both date-times carry their timezone and are loaded as seeded initial data when the site is set up. Seed scenarios set them relative to the seeding moment: `prelaunch` (start in 2 days, ceremony in 20 days), `live` default (started 1 day ago, ceremony in 14 days), `after-ceremony` (started 30 days ago, ceremony 1 day ago); the production placeholder start is 15 Dec 2025 18:00 Asia/Ho_Chi_Minh (D009, Codex R16).

### Navigation (1xx)

- **FR-101** Before the start time, a request for any page that is not on the allowed list is sent to the countdown page.
- **FR-102** After the start time, a request for the countdown page is sent to the Homepage.
- **FR-103** Sign-in pages, the sign-in callback, static assets and the countdown page stay reachable before the start time (D002).

### Countdown - Prelaunch (2xx)

- **FR-201** The page shows the title "Sự kiện sẽ bắt đầu sau" and three units labelled DAYS, HOURS and MINUTES.
- **FR-202** Each unit shows two digits with leading zero; more than 99 days is handled per D005.
- **FR-203** The page is standalone: no header, footer or navigation.
- **FR-204** When the start time is unavailable the page shows a "Coming soon" message and no digits.

### Interaction (4xx)

- **FR-401** The displayed values refresh on their own, without reloading the page.
- **FR-402** Remaining time is measured against the server clock, not the visitor's device clock.
- **FR-403** At the start moment (remaining time reaches zero, or a re-check reports the event has started) the visitor is taken to the Homepage without a full page reload. Only this launch countdown moves the visitor; the Homepage ceremony countdown (F004) never does (Codex R08).

### Security (6xx)

- **FR-601** The countdown page and the event status are viewable without signing in.

## 5. Business Rules

- The event counts as launched only when the server time is at or after the start time; before that it is upcoming (BR-001)
- Only days, hours and minutes are shown, each rounded down; seconds are never shown (BR-002)
- The server clock is the reference for remaining time, so a wrong device clock changes nothing (BR-003)
- Allowed pages (see D002) always load, even before launch (DEC-001)
- Any other page before launch sends the visitor to the countdown (DEC-002)
- If the start time cannot be read, the site loads normally instead of blocking visitors (DEC-003)
- The countdown page shows the countdown, forwards to the Homepage, or shows "Coming soon", depending on the event state (DEC-004)
- The countdown page is either counting down, complete (hand-over done), or unavailable (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Countdown - Prelaunch (draft folder `SCR-countdown-prelaunch`) | TBD (draft) | Dark full-screen page, abstract art on the right, title and three glass-style digit units | Nothing to click; waits, and is moved on automatically |

### User Journey

1. Before launch, a visitor opens any page and arrives at the Countdown - Prelaunch screen, seeing days, hours and minutes remaining.
2. The numbers update on their own as time passes.
3. At the start moment the visitor is taken to the Homepage, where the full site is available.

## 7. User Stories

### US001 — See the countdown before the event opens

**Actor:** Sunner (visitor)
**Goal:** Know how long until the event opens, whatever page I tried to open.
**Business value:** Builds anticipation and keeps the unreleased site private until launch.

**Acceptance Criteria:**
- [ ] Opening any page before the start time shows the countdown page.
- [ ] The page shows days, hours and minutes with no header or footer.

### US002 — Enter the site automatically at launch

**Actor:** Sunner (visitor)
**Goal:** Be taken into the site the moment the event opens, without refreshing.
**Business value:** Removes manual refreshing and gives every Sunner the same launch moment.

**Acceptance Criteria:**
- [ ] The numbers update on their own.
- [ ] At the start moment the Homepage appears without a full reload.
- [ ] A wrong device clock does not change the moment.

### US003 — Skip the countdown after launch

**Actor:** Sunner (visitor)
**Goal:** Reach the Homepage even from an old countdown link or bookmark.
**Business value:** Avoids a dead-end page once the event is open.

**Acceptance Criteria:**
- [ ] Opening the countdown address after the start time lands on the Homepage.

## 8. Scenarios

### US001 — Happy Path

**Given** the start time is in the future, **When** a visitor opens the Homepage address, **Then** the countdown page appears with days, hours and minutes.

### US001 — Error: start time unavailable

**Given** the event start time cannot be read, **When** a visitor opens any page, **Then** the page loads normally, and the countdown address shows "Coming soon" without digits.

### US002 — Happy Path

**Given** a visitor is on the countdown page, **When** the start moment arrives, **Then** the Homepage is shown without a full reload.

### US002 — Error: device clock is wrong

**Given** the visitor's device clock is hours ahead or behind, **When** the countdown runs, **Then** the remaining time still matches the real time to launch.

### US003 — Happy Path

**Given** the event has started, **When** a visitor opens the countdown address, **Then** the Homepage is shown.

### US003 — Error: stale open tab

**Given** a countdown tab stayed hidden past the start time, **When** the visitor returns to it, **Then** the Homepage is shown right away.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Start time record missing or unreadable | Site is not blocked; countdown page shows fallback | "Coming soon" |
| Visitor loads a page at the exact start moment | Treated as launched; page loads normally | None — silent handling |
| Device clock wrong or tab asleep | Server clock re-checked when the tab is visible again | None — silent handling |
| More than 99 days remain | Days unit widens to three digits | None — silent handling |
| Browser lacks background blur | Digit boxes use a solid semi-transparent fill | None — silent handling |
| Less than one minute remains | Digits read 00 00 00; the page waits for the exact start moment before moving on | None — silent handling |
| Event-status check does not answer (stalled backend) | After at most 1.5 seconds the site loads normally (Codex R23) | None — silent handling |
| Browser window narrower than 1280 px | Desktop layout kept; the page scrolls horizontally (AD01, Codex R17) | None — layout unchanged |
| Operator changes the start time in the database while visitors wait | Visitors see the new time after their next page load (the gate may lag up to its 60-second cache period) | None — silent handling |

## 10. Edge Behaviours to Verify

- **FR-101** → before launch, the Homepage, Awards and Kudos addresses all land on the countdown; sign-in still works.
- **FR-102** → after launch, the countdown address lands on the Homepage.
- **FR-204** → with the event record removed, the countdown address shows "Coming soon" and no digits.
- **FR-402** → set the device clock one day off; the digits still match the real remaining time.
- **FR-403** → the Homepage appears at the start moment without a full page reload; with the start 30 seconds away, the digits read 00 00 00 and the page waits for the exact moment (Codex R16).
- **FR-102** → between the start and the ceremony time, the countdown address lands on the Homepage, whose ceremony countdown keeps running (Codex R08).
- **D003** → with the backend stalled, a page loads after at most 1.5 seconds (Codex R23).
- **FR-202** → digits keep two places (07, not 7).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | A wrong start time or a gate fault could hide the whole site or open it early | Every visitor affected at launch | mitigated — production placeholder value until the real one is given (D009); deterministic seed scenarios for demos and tests (Codex R16); gate fails open within 1.5 s (D003, Codex R23) |
| RISK-02 | risk | Licensing of the "Digital Numbers" font is unconfirmed (D008) | Legal exposure or fallback look | mitigated — free LED/monospace fallback unless licensing is confirmed (D008) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002_GoogleAuth | feature | Sign-in must stay reachable before launch; the gate runs ahead of the sign-in check | FR-103, FR-601 |
| F001_AppShellI18n | feature | Saved language choice and shared styling base; shell is deliberately not shown here | FR-203, D004 |
| F004_StaticEventContent | feature | Homepage is the hand-over destination; its own countdown block reads the ceremony time from the same event record | FR-001, FR-102, FR-403 |
| Event record (`events`) | data | The single seeded source of the start time (this feature) and the ceremony time (F004) | FR-001, FR-002 |
| "Digital Numbers" font and background artwork | external-service | Required by the design for the LED-style digits and page art | FR-201, D008 |

## 13. Configuration

```text
EVENT_START = 2025-12-15 18:00 Asia/Ho_Chi_Minh   # production placeholder (D009); a data change, not code
SEED_SCENARIO = live                              # prelaunch | live (default) | after-ceremony; relative times (Codex R16)
LAUNCH_GATE_CACHE = 60 seconds                    # how long the gate reuses the start time it read
LAUNCH_GATE_LOOKUP_TIMEOUT = 1.5 seconds          # gate waits this long for the start time, then fails open (Codex R23)
MIN_VIEWPORT_WIDTH = 1280 px                      # desktop-only release acceptance; narrower windows scroll horizontally (Codex R17)
```
