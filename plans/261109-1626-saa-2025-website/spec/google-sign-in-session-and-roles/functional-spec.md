---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P0
**Type**: mixed

## 1. Overview

**Problem:** The SAA 2025 site is for Sun* employees only. It must know who each visitor is, keep them signed in, and keep regular Sunners out of the admin area.
**Solution:** A Sunner signs in with their Google account, gets a lasting session and a profile record with a role (user or admin). Protected pages need a session; the admin area needs the admin role.
**Scope:** Google sign-in and the Login screen, first-time profile creation, staying signed in, logging out, and role-based access to pages (login and countdown public, all other pages signed-in only, admin area admin only).
**Non-Scope:** Header, avatar menu and the logout button itself, language switch, 403/404 pages (App Shell feature); the pre-launch countdown and its redirect (Countdown feature); admin screens (Admin features); profile pages (Profile feature); password or email sign-in; an in-app way to grant admin.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A Sun* employee, signed in or not | Get into the site with their Google account and stay in until they log out |
| Admin | A Sunner whose profile carries the admin role | Reach the admin area in addition to everything a Sunner can do |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Sign in with Google | Sign in with a Google account from the Login screen and get a profile on first visit | US001 | FR-001, FR-002, FR-102, FR-201, FR-202, FR-203, FR-401, FR-604, FR-605 | BR-001, BR-002, BR-003 | Login (code TBD (draft)) |
| CAP-02 | Stay signed in and log out | Remain signed in across visits and end the session with Logout | US003, US006 | FR-003, FR-104, FR-402, FR-403, FR-404 | SM-001 | — |
| CAP-03 | Role-based access to pages | Reach only the pages their sign-in state and role allow | US002, US004, US005 | FR-101, FR-103, FR-601, FR-602, FR-603 | BR-004, DEC-001, DEC-002, DEC-003 | — |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Which Google accounts may sign in (company domain only, or any Google account)? | Only Google accounts on the company domain `@sun-asterisk.com`; any other account is refused at sign-in, and the backend refuses it again on every request — resolved (G01) | The site is for Sun* employees only; a fixed rule leaves no "open to everyone" setting to forget | no |
| D002 | How does someone become admin? | Admins are seeded by email: the backend holds a list of admin email addresses; a listed email gets the admin role when its profile is created or at its next sign-in; everyone else starts as user; there is no role-management screen — resolved (G02) | No admin-management screen is designed; the first admins exist without anyone editing the database by hand | no |
| D003 | How does a Sunner get a unit (department)? | Empty at first sign-in; filled from seed data or by the team — resolved (applied default AD02) | Google gives no unit information; unit filters elsewhere must tolerate "no unit" | no |
| D004 | How long does a session last and is there an idle timeout? | Provider defaults with silent renewal; no idle timeout — resolved (applied default AD02) | Nothing in the design asks for a shorter session | no |
| D005 | Can Login be opened before the event starts, and where does the user land after signing in then? | Login and countdown are both open before launch; after sign-in the user goes to the Homepage address and the launch gate sends them to the countdown — resolved (applied default AD02) | Matches the screen flow (Login, then launch gate); keeps gate logic in one feature | no |
| D006 | Final wording (Vietnamese and English) of the sign-in failure messages | English wording in § 9 is a placeholder; final copy is supplied by design — resolved (applied default AD02) | Copy is not in the design survey | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Every signed-in Sunner has exactly one profile record holding name, email, avatar, role and unit.
- **FR-002** Google is the only way to sign in; there is no password or email-link option, and every other sign-in method is switched off in the sign-in service (Codex R21).
- **FR-003** A signed-in Sunner stays signed in across page loads and browser tabs, and the session is renewed automatically until logout or expiry.

### Navigation (1xx)

- **FR-101** A visitor who opens a signed-in-only page is taken to Login and, after signing in, returned to the page they asked for.
- **FR-102** After a successful sign-in the Sunner lands on the Homepage (the launch gate may show the countdown first).
- **FR-103** A signed-in Sunner who opens Login is taken to the Homepage instead, unless Login was opened to show a sign-in problem (Codex R22).
- **FR-104** Logging out takes the Sunner to Login.

### Login (2xx)

- **FR-201** Login shows the "ROOT FURTHER" key visual, the "LOGIN With Google" button, the language switch and the footer copyright.
- **FR-202** Pressing the button starts Google sign-in and shows a loading state; a second press during loading does nothing.
- **FR-203** If sign-in is cancelled or fails, the Sunner stays on Login with a clear message and can try again.

### Interaction (4xx)

- **FR-401** The first sign-in creates the profile from the Google name, email and avatar, with the admin role when the email is on the seeded admin list and the user role otherwise; each later sign-in updates the last-login time and refreshes name and avatar.
- **FR-402** Logging out ends the session on this browser; the next request for a signed-in-only page asks for sign-in again.
- **FR-403** An expired or invalid session is treated as signed out. A session whose profile record is missing gets one automatic attempt to create it; if that fails the Sunner is signed out in the browser and sees Login with a message; when the failure is found while a page is being built on the server, the page shows no header or footer and hands off to a small browser step that signs out and then opens Login (Codex R22, N06).
- **FR-404** Other features can read the signed-in Sunner's own name, avatar, role and unit (unit name and short unit code, Codex R15) (for example for the header).

### Security (6xx)

- **FR-601** A person's identity is taken only from their verified sign-in token and their role only from their stored profile record (the one user record, no second profile store; Codex R05); the backend checks both on every request that needs them and never trusts anything else the browser sends. Backend requests fall into four classes (Codex N09): the event countdown data is public (no sign-in); creating one's own profile needs only a verified sign-in token; every other request needs the token and an existing profile; admin requests also need the admin role. The browser talks to the backend directly with the sign-in token, never with cookies and never through a relay in the website server (Codex R06).
- **FR-602** Only Login and the countdown page are reachable without signing in; every other page needs a session.
- **FR-603** The admin area and every admin data request are open only to Sunners with the admin role; a signed-in non-admin sees the Forbidden page (checked by how the page looks; the backend's admin data requests answer "forbidden" with status 403) (Codex R18).
- **FR-604** Only Google accounts on `@sun-asterisk.com` with a verified email can sign in; any other account is refused at sign-in and on every later request (Codex R21).
- **FR-605** After sign-in the Sunner is only ever sent to a page inside this site, never to an external address.

## 5. Business Rules

- A new profile starts with the admin role when its email is on the seeded admin list, otherwise with the user role; a later sign-in may promote a listed email to admin but never removes a role (BR-001)
- A return address is accepted only if it points to a page inside this site, otherwise the Homepage is used (BR-002)
- Only `@sun-asterisk.com` email addresses may sign in (BR-003)
- Admin access is decided from the role stored at the moment of the request, so a role change applies on the next page load (BR-004)
- A signed-in-only page opened without a session sends the Sunner to Login and remembers the page (DEC-001)
- Opening Login while already signed in shows the Homepage instead, except when Login carries a sign-in problem message (DEC-002, Codex R22)
- A signed-in Sunner without the admin role who opens an admin page sees the Forbidden page, not Login (DEC-003)
- A visit starts anonymous, becomes authenticated after sign-in, and returns to anonymous on logout or expiry (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Login | TBD (draft) | Full-page "ROOT FURTHER" key visual, a "LOGIN With Google" button, the language switch, the footer copyright, and a message area after a failed attempt | Start Google sign-in; change language |

Header, avatar menu, Forbidden page and Not-found page are shown on or reached from other screens and belong to the App Shell feature.

### User Journey

1. A Sunner without a session opens a link and arrives at Login, seeing the key visual and the Google button.
2. The Sunner presses "LOGIN With Google"; the button shows loading and Google's account chooser appears.
3. After consent the Sunner is signed in and taken to the Homepage (or the countdown before launch).
4. Later visits skip Login while the session lasts; Logout from the avatar menu brings the Sunner back to Login.

## 7. User Stories

### US001 — Sign in with Google

**Actor:** Sunner
**Goal:** Sign in with my Google account.
**Business value:** Only identified Sun* people take part, and kudos can be tied to a real person.

**Acceptance Criteria:**
- [ ] Login offers a "LOGIN With Google" button and no other sign-in method.
- [ ] After consent I land on the Homepage and my profile exists with the user role (admin if my email is on the seeded admin list).
- [ ] If I cancel or sign-in fails I stay on Login and see a message.

### US002 — Return to the page I asked for

**Actor:** Sunner
**Goal:** Land on the page I originally opened after I sign in.
**Business value:** Shared links to kudos and profiles work for people who are not signed in yet.

**Acceptance Criteria:**
- [ ] Opening a signed-in-only link while signed out shows Login.
- [ ] After signing in I see the page I opened, not the Homepage.
- [ ] A link that points outside the site is ignored and I land on the Homepage.

### US003 — Log out

**Actor:** Sunner
**Goal:** End my session on this browser.
**Business value:** Keeps accounts safe on shared computers.

**Acceptance Criteria:**
- [ ] Choosing Logout in the avatar menu shows Login.
- [ ] Pressing Back does not reveal signed-in-only pages without signing in again.

### US004 — Open the admin area as an admin

**Actor:** Admin
**Goal:** Reach the admin pages.
**Business value:** Admins can monitor and moderate without a separate system.

**Acceptance Criteria:**
- [ ] With the admin role, the admin Overview page opens.
- [ ] Removing the admin role from my profile blocks access on the next page load.

### US005 — Be stopped at the admin area as a regular Sunner

**Actor:** Sunner
**Goal:** Know clearly that I may not open admin pages.
**Business value:** Moderation data and user lists stay private.

**Acceptance Criteria:**
- [ ] Opening an admin address while signed in without the admin role shows the Forbidden page.
- [ ] I am not sent to Login, because I am already signed in.

### US006 — Stay signed in between visits

**Actor:** Sunner
**Goal:** Not sign in again every time I come back.
**Business value:** Fewer interruptions during the campaign window.

**Acceptance Criteria:**
- [ ] Closing and reopening the browser tab keeps me signed in while the session is valid.
- [ ] When the session has ended, my next page load shows Login.

## 8. Scenarios

### US001 — Happy Path

**Given** a signed-out Sunner on Login, **When** they press "LOGIN With Google" and approve, **Then** they are signed in and taken to the Homepage, and their profile exists.

### US001 — Error: Google consent cancelled

**Given** a signed-out Sunner on Google's consent screen, **When** they cancel, **Then** they return to Login and see "Sign-in was cancelled. Please try again."

### US001 — Error: account not permitted

**Given** a signed-out visitor on Login, **When** they sign in with a Google account outside `@sun-asterisk.com`, **Then** they return to Login and see "This Google account is not allowed to sign in."

### US002 — Happy Path

**Given** a signed-out Sunner who opens a kudo link, **When** they sign in, **Then** the kudo page opens.

### US002 — Error: external return address

**Given** a signed-out visitor following a link whose return address points to another website, **When** they sign in, **Then** they land on the Homepage.

### US003 — Happy Path

**Given** a signed-in Sunner, **When** they choose Logout, **Then** Login is shown and signed-in-only pages ask for sign-in again.

### US003 — Error: session already expired

**Given** a Sunner whose session has already expired, **When** they choose Logout, **Then** Login is shown without an error.

### US004 — Happy Path

**Given** a signed-in Admin, **When** they open the admin area, **Then** the Overview page shows.

### US004 — Error: role removed

**Given** a signed-in Admin whose role was changed to user, **When** they load another admin page, **Then** the Forbidden page shows.

### US005 — Happy Path

**Given** a signed-in regular Sunner, **When** they open an admin address, **Then** the Forbidden page shows.

### US005 — Error: not signed in at all

**Given** a signed-out visitor, **When** they open an admin address, **Then** Login shows first, and after sign-in as a regular Sunner the Forbidden page shows.

### US006 — Happy Path

**Given** a Sunner signed in earlier, **When** they return within the session life, **Then** the Homepage opens without Login.

### US006 — Error: session expired

**Given** a Sunner whose session has expired, **When** they open any signed-in-only page, **Then** Login shows and the page they asked for is remembered.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Google consent cancelled or denied | Back on Login, no session, no profile created | "Sign-in was cancelled. Please try again." |
| Email is not on `@sun-asterisk.com` | Session discarded, no profile created, back on Login | "This Google account is not allowed to sign in." |
| Profile cannot be saved after Google approved | Session discarded, back on Login, retry possible | "We couldn't finish signing you in. Please try again." |
| Signed in, but the profile record has gone missing later | One automatic attempt to recreate it; if that fails the session is ended and Login shows, with no back-and-forth between Login and Homepage (Codex R22) | "Your profile could not be loaded. Please sign in again." *(copy to confirm)* |
| Backend does not answer while finishing sign-in | Gives up after 5 seconds, session discarded, back on Login (Codex R23) | "We couldn't finish signing you in. Please try again." |
| Button pressed twice | Second press ignored while loading | None — silent handling |
| Sign-in link opened a second time | Second attempt fails, back on Login; an existing session is unaffected | "We couldn't finish signing you in. Please try again." |
| Session expires while the page is open | Next navigation or action sends the Sunner to Login and remembers the page | "Your session has ended. Please sign in again." |
| Regular Sunner opens an admin address | Forbidden page, no redirect to Login | "You don't have permission to view this page." |
| Return address points outside the site | Ignored, Homepage used | None — silent handling |
| Role changed on the profile while signed in | Applies at the next page load; the Sunner stays signed in | "You don't have permission to view this page." (if now blocked) |

## 10. Edge Behaviours to Verify

- **FR-001** → a first-time Google sign-in produces one profile; a second sign-in produces no duplicate.
- **FR-003** → closing and reopening the tab keeps the Sunner signed in until logout or expiry.
- **FR-101** → a deep link opened while signed out lands on that same page after sign-in.
- **FR-103** → a signed-in Sunner opening Login ends up on the Homepage.
- **FR-203** → cancelling Google consent shows the message and leaves the button usable again.
- **FR-402** → after Logout, going Back and reloading asks for sign-in.
- **FR-601** → editing a request in the browser tools to claim the admin role gains no access.
- **FR-602** → apart from Login and countdown, every page redirects to Login when signed out.
- **FR-603** → admin addresses show the Forbidden page for a regular Sunner and the page for an Admin.
- **FR-604** → a Google account outside `@sun-asterisk.com` is refused at sign-in, and a token for such an account is refused by the backend.
- **FR-605** → a return address pointing to another website never leaves the site.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | No in-app way to grant admin; adding an admin means adding the email to the seeded admin list, removing one means changing the stored role | A new admin needs a configuration change and their next sign-in | mitigated — admins seeded by email (D002, G02) |
| RISK-02 | risk | Without a domain rule any Google account could create a profile | People outside Sun* could sign in and see event content | closed — `@sun-asterisk.com` only (D001, G01) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Supabase Auth and database | external-service | Runs the Google sign-in and the session; the database holds the profile record | FR-001, FR-003 |
| Backend API service (Go) | internal-service | Verifies every sign-in token, refuses non-company accounts, creates the profile on first sign-in and returns the role on every request | FR-401, FR-601, FR-603, FR-604 |
| Google sign-in (OAuth client) | external-service | The only identity provider | FR-002 |
| F001_AppShellI18n | feature | Hosts the avatar menu with Logout, the language switch used on Login, and the Forbidden page | FR-104, FR-201, FR-603 |
| F003_EventCountdownGate | feature | Decides Homepage versus countdown after sign-in; keeps Login and countdown open before launch | FR-102, D005 |
| Units (departments) data | data | Profile carries a unit; this feature creates the units list (name plus a unique short code such as `CECV2`) and fills it from seed data (D003, Codex R15) | FR-001, FR-404, D003 |
| F010_AdminOverviewUsers, F011_AdminKudoModeration, F012_AdminCampaigns | feature | Consumers of the admin-only rule | FR-603 |

## 13. Configuration

```text
ALLOWED_EMAIL_DOMAIN = sun-asterisk.com   # the only domain that may sign in; fixed, not an open list (D001, G01)
ADMIN_EMAILS         = (seeded list)       # email addresses that get the admin role at profile creation or next sign-in (D002, G02)
SESSION_LIFETIME     = provider default    # silent renewal, no idle timeout (D004)
SIGN_IN_METHODS      = Google only         # every other method switched off (Codex R21)
WEBSITE_ADDRESSES    = (configured list)   # the only website addresses the backend accepts browser calls from (Codex R06)
BACKEND_WAIT_LIMIT   = 5 seconds           # how long the website waits for the backend before showing an error (Codex R23)
```
