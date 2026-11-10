---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# Functional Spec — F001_AppShellI18n

**Priority**: P0
**Type**: ui

**See also:** [`technical-spec.md`](./technical-spec.md) — planned handlers, shell variants, state machine, configuration.

## 1. Overview

**Problem:** Every Sunner page needs the same way to move around, reach notifications, rules and the kudo form, and read the site in Vietnamese or English; without one shared frame each page would invent its own.
**Solution:** One frame around every page: a header with three main links, notification bell, language switch and avatar menu; a footer with the same destinations plus copyright; a floating button for rules and writing a kudo; VN/EN switching that remembers the choice; friendly 403 and 404 pages; one shared look (colors, type, spacing).
**Scope:** Header, footer, floating action button, avatar menu, language switching with a remembered choice, 403 and 404 pages, shared design look, and the mount points other features plug into.
**Non-Scope:** Sign-in and logout actions (F002); countdown page (F003); page content and translated copy of each page (F004-F012); the notification panel itself (F009); the rules panel and secret box (F008); the write-kudo modal (F005); the admin header links Overview / Review content / User / Settings (F010); mobile and tablet layouts (out of release scope, AD01, R17).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | signed-in Sun* employee | move between sections, open notifications, rules or write a kudo, read in their language |
| Admin | signed-in Sunner with admin role | same as Sunner, plus reach the admin area |
| Visitor | person not signed in (Login page, error pages) | pick a language, understand an error |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Navigate the app | Reach any main section, own profile, admin area (admins), notifications, rules and the write-kudo form from any page | US001, US002, US003, US004 | FR-001, FR-003, FR-004, FR-101, FR-102, FR-103, FR-104, FR-201, FR-202, FR-601, FR-602 | BR-002, DEC-001, DEC-002, SM-001 | TBD (draft) |
| CAP-02 | Choose display language | Switch between Vietnamese and English and keep the choice | US005 | FR-002, FR-203, FR-401 | BR-001, BR-003 | TBD (draft) |
| CAP-03 | Recover from not-found and forbidden pages | Understand a missing or forbidden page and get back to Homepage | US006, US007 | FR-402, FR-403 | — | TBD (draft) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Where is the language choice remembered? | In the browser only (cookie); not saved on the account; order: cookie, then browser language, then Vietnamese — resolved (applied default AD01) | Simplest; works before sign-in (Login page has the switch) | no |
| D002 | What chrome does the Login page show? | Language switch and copyright line only — resolved (applied default AD01) | SCREENFLOW lists exactly those on Login | no |
| D003 | What chrome do 403/404 pages show? | Minimal frame (language switch and copyright) for everyone, signed in or not — revised by Codex R07 (was: full frame when signed in, minimal otherwise, AD01) | One minimal frame keeps the page structure simple and exposes no session controls | no |
| D004 | Behavior below desktop width | Desktop only (design frames are 1440 wide); release acceptance at a minimum window width of 1280 px; narrower windows keep the desktop layout and scroll sideways; no collapsed menu — resolved (applied default AD01; minimum width set by Codex R17) | Mobile/tablet are out of release scope | no |
| D005 | Language switch while the write-kudo form has unsent text | Block switching while the form is open — resolved (applied default AD01) | Avoids losing typed text; form belongs to F005 | no |
| D006 | Admin header links | Admin pages supply their own link set to the shared header (F010) — resolved (applied default AD01) | Admin links are admin-area content | no |
| D007 | Exact copy for nav labels, footer link 4, 403/404 messages | Use SCREENFLOW labels; error copy as proposed in screen specs; all copy lives in the Vietnamese and English JSON dictionaries — resolved (applied default AD01) | Figma text not readable yet | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** All pages use one shared set of colors, fonts, spacing and corner radius.
- **FR-002** Every word in the frame comes from the Vietnamese and English dictionaries; a missing English word shows the Vietnamese one.
- **FR-003** Every page gets the frame variant for its type: full, minimal (Login, "no access" and "page not found" pages), admin (admin area), or none (Countdown) (Codex R07).
- **FR-004** Pages are accepted on desktop windows at least 1280 px wide; a narrower window keeps the desktop layout and scrolls sideways (AD01, Codex R17).

### Navigation (1xx)

- **FR-101** The header offers About SAA 2025, Awards Information and Sun* Kudos, and highlights the one for the current section.
- **FR-102** The footer offers Home, Awards, Kudos and Community Standards, plus the copyright line.
- **FR-103** The logo in header and footer takes the user to Homepage.
- **FR-104** A floating button on full-frame pages opens two choices: rules and write a kudo.

### App Shell (2xx)

- **FR-201** The avatar menu lists Profile and Logout, and Admin for admins only.
- **FR-202** The bell opens the notification panel and shows a dot when there are unread notifications (count supplied by the notification feature).
- **FR-203** The language control shows the current language and offers Vietnamese and English.

### Interaction (4xx)

- **FR-401** The chosen language applies at once and is still applied on the next visit.
- **FR-402** An unknown address shows a "page not found" page with a way back to Homepage.
- **FR-403** A page the user may not open shows a "no access" page with a way back to Homepage. This page is checked by how it looks; the refusal status 403 is checked on the backend's admin data requests (Codex R18).

### Security (6xx)

- **FR-601** The Admin menu item appears only for admins, using the role the backend returns for the signed-in Sunner; the role is re-read when the Sunner comes back to the tab, so a role change shows without a reload; actual protection of admin pages and admin data is done by the backend (F002) (Codex R07).
- **FR-602** The avatar menu and bell are not shown to people who are not signed in.

## 5. Business Rules

- The saved language wins; if none, the browser language; if neither is supported, Vietnamese (BR-001).
- Hiding the Admin item is a convenience; typing an admin address as a non-admin still ends on the "no access" page (BR-002).
- Only Vietnamese and English are accepted; any other value is ignored (BR-003).
- An admin sees Profile, Admin, Logout; any other user sees Profile, Logout (DEC-001).
- Login, "no access" and "page not found" show the minimal frame, Countdown shows none, the admin area shows the admin frame, other signed-in pages show the full frame (DEC-002, Codex R07).
- The floating button is either closed or open; a click, Escape or an outside click closes it, a click on the button opens it (SM-001).

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| App Shell (header, footer, floating button, language and profile dropdowns) | TBD (draft) | logo, three links, bell, language control, avatar; footer links and copyright; floating button | navigate, open notifications, switch language, open profile/admin/logout, open rules or write a kudo |
| Error - Not found (404) | TBD (draft) | message that the page does not exist | go back to Homepage |
| Error - Forbidden (403) | TBD (draft) | message that the user has no access | go back to Homepage |

### User Journey

1. User arrives on any signed-in page and sees the header, footer and floating button around the content.
2. User clicks Sun* Kudos in the header — the Kudos page opens and that link is highlighted.
3. User picks EN in the language control — the page switches to English at once and stays English on later visits.
4. User opens the avatar menu and picks Profile — own profile opens.
5. User types a wrong address — the "page not found" page opens; one click returns to Homepage.

## 7. User Stories

### US001 — Navigate main sections from header and footer

**Actor:** Sunner
**Goal:** Reach Homepage, Awards, Kudos or Community Standards from any page.
**Business value:** Sunners find event content and Kudos without hunting.

**Acceptance Criteria:**
- [ ] Header shows About SAA 2025, Awards Information, Sun* Kudos; the current section is highlighted.
- [ ] Footer shows Home, Awards, Kudos, Community Standards and the copyright line.
- [ ] Logo returns to Homepage.

### US002 — Use the avatar menu

**Actor:** Admin
**Goal:** Open own profile, the admin area, or log out from the avatar.
**Business value:** One predictable place for account actions; admins reach management quickly.

**Acceptance Criteria:**
- [ ] A Sunner sees Profile and Logout.
- [ ] An admin also sees Admin.
- [ ] The menu closes on outside click or Escape.

### US003 — Open notifications from the bell

**Actor:** Sunner
**Goal:** See that something is new and open the notification panel.
**Business value:** Sunners notice hearts, secret boxes and spam warnings quickly.

**Acceptance Criteria:**
- [ ] Bell shows a dot when there are unread notifications.
- [ ] Clicking the bell opens the notification panel.

### US004 — Open rules or write a kudo from the floating button

**Actor:** Sunner
**Goal:** From any page, read the rules or start a kudo.
**Business value:** Raises kudo volume by keeping the entry point always in reach.

**Acceptance Criteria:**
- [ ] The floating button shows two choices when opened: rules and write a kudo.
- [ ] Picking a choice opens the matching panel and closes the button.

### US005 — Switch language

**Actor:** Visitor
**Goal:** Read the site in Vietnamese or English, including before signing in.
**Business value:** Everyone at Sun* can use the site in the language they prefer.

**Acceptance Criteria:**
- [ ] The language control offers Vietnamese and English and shows the current one.
- [ ] The page re-renders in the chosen language at once.
- [ ] The choice is still applied on the next visit.

### US006 — See a clear page for an unknown address

**Actor:** Sunner
**Goal:** Understand the page does not exist and get back.
**Business value:** A wrong link is a short detour, not a dead end.

**Acceptance Criteria:**
- [ ] A "page not found" page appears in the active language.
- [ ] A button returns to Homepage.

### US007 — See a clear page when access is not allowed

**Actor:** Sunner
**Goal:** Understand that the page is not available to them and get back.
**Business value:** Non-admins who reach admin addresses are told clearly, not shown a blank page.

**Acceptance Criteria:**
- [ ] A "no access" page appears in the active language.
- [ ] A button returns to Homepage.

## 8. Scenarios

### US001 — Happy Path

**Given** a signed-in Sunner on Homepage, **When** the Sunner clicks Sun* Kudos in the header, **Then** the Kudos page opens and that link is highlighted.

### US001 — Error: link to a page not yet available

**Given** a footer link whose page is not built yet, **When** the Sunner clicks it, **Then** the "page not found" page opens.

### US002 — Happy Path

**Given** an admin on any page, **When** the admin opens the avatar menu, **Then** Profile, Admin and Logout are listed.

### US002 — Error: non-admin opens an admin address

**Given** a Sunner who is not an admin, **When** the Sunner types an admin address, **Then** the "no access" page opens and the avatar menu has no Admin item.

### US003 — Happy Path

**Given** a Sunner with unread notifications, **When** the Sunner clicks the bell, **Then** the notification panel opens.

### US003 — Error: notifications not available

**Given** the notification panel cannot load, **When** the Sunner clicks the bell, **Then** the panel shows its own error message and the rest of the page is unaffected.

### US004 — Happy Path

**Given** a Sunner on any signed-in page, **When** the Sunner opens the floating button and picks "write a kudo", **Then** the write-kudo form opens.

### US004 — Error: dismissed by mistake

**Given** the floating button is open, **When** the Sunner presses Escape, **Then** the button closes and nothing else opens.

### US005 — Happy Path

**Given** the page is in Vietnamese, **When** the visitor picks EN, **Then** the page is in English and stays English on the next visit.

### US005 — Error: unsupported saved language

**Given** the browser holds an unsupported language value, **When** the page loads, **Then** the browser language is used if supported, otherwise Vietnamese.

### US006 — Happy Path

**Given** a Sunner types an unknown address, **When** the page loads, **Then** the "page not found" page appears and its button leads to Homepage.

### US006 — Error: language chosen is English

**Given** English is active, **When** the "page not found" page shows, **Then** all its text is in English.

### US007 — Happy Path

**Given** a Sunner without admin role, **When** an admin page is requested, **Then** the "no access" page appears and its button leads to Homepage.

### US007 — Error: not signed in

**Given** a visitor with no session, **When** a protected page is requested, **Then** the visitor is sent to sign-in instead of seeing the "no access" page.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Saved language is not Vietnamese or English | Ignored; browser language or Vietnamese is used | None — silent handling |
| English word missing | Vietnamese text for that item is shown | None — silent handling |
| Session ends while the page is open | Header stays until next navigation, then user is sent to sign-in | "Your session has ended. Please sign in again." *(copy to confirm)* |
| Floating button open and user clicks elsewhere | Button closes | None — silent handling |
| Visitor opens an admin address | "No access" page | "You do not have access to this page." *(copy to confirm)* |
| Address does not exist | "Page not found" page | "This page could not be found." *(copy to confirm)* |
| Language switched while the write-kudo form has text | Switching is blocked until the form is closed (D005) | "Close the form to change language." *(copy to confirm)* |
| Signed in, but the profile record is missing and cannot be recreated | Session ended; Login shows with a message, no back-and-forth between Login and Homepage (F002, Codex R22) | "Your profile could not be loaded. Please sign in again." *(copy to confirm)* |
| Role changed while the tab is open | Admin item appears or disappears when the Sunner returns to the tab (Codex R07) | None — silent handling |
| Window narrower than 1280 px | Desktop layout kept; page scrolls sideways (Codex R17) | None — silent handling |

## 10. Edge Behaviours to Verify

- **FR-003** → Countdown shows no header or footer; Login shows only language switch and copyright.
- **FR-101** → on each of the three main sections exactly one header link is highlighted.
- **FR-201** → admin account shows Admin in the menu; normal account does not.
- **FR-401** → after choosing English, closing the tab and returning keeps English.
- **FR-402** → an unknown address gives the "page not found" page in the active language.
- **FR-403** → a non-admin requesting an admin address gets the "no access" page (visual check; status code not asserted, Codex R18).
- **FR-004** → at 1280 px nothing is cut off; at 1024 px the page scrolls sideways instead of rearranging.
- **FR-602** → with no session, no avatar menu and no bell appear.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Exact visual values cannot be read from the design file yet; copy follows SCREENFLOW labels (D007) | Chrome may need visual rework once exact values are read | mitigated — copy settled by D007 (AD01); visual values read per screen at build |
| RISK-02 | risk | Header, footer and floating button are shared by every feature; a late change to their mount points forces rework in F005, F008, F009, F010 | Schedule slip across several features | [EXPECTED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002_GoogleAuth | feature | signed-in state, role, display name and avatar (read from the backend's current-user endpoint); logout action; 403 trigger | FR-201, FR-601, FR-602, FR-403 |
| Backend API service (Go) | internal-service | returns the signed-in Sunner's name, avatar and role for the header; the frame itself reads no database | FR-201, FR-601, FR-602 |
| F009_Notifications | feature | notification panel and unread count behind the bell | FR-202 |
| F008_KudosGamification | feature | rules panel opened from the floating button | FR-104 |
| F005_KudoCompose | feature | write-kudo form opened from the floating button | FR-104 |
| F010_AdminOverviewUsers | feature | admin header links | D006 |
| F004_StaticEventContent, F006_KudosLiveBoard, F007_SunnerProfile | feature | pages the links point to | FR-101, FR-102 |

## 13. Configuration

```text
SUPPORTED_LANGUAGES = Vietnamese, English   # the only two languages offered
DEFAULT_LANGUAGE    = Vietnamese            # used when nothing else is known
LANGUAGE_MEMORY     = 1 year                # how long the choice is remembered in the browser (proposed)
MIN_WINDOW_WIDTH    = 1280 px               # release acceptance width; narrower scrolls sideways (Codex R17)
```
