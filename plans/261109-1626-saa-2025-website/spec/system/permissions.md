---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# Permissions

**Project**: SAA 2025 website (Sun* Annual Awards 2025, "Root Further")
**Generated**: 2026-11-09
**Analysis Scope**: Forward-authored from the feature list and F002_GoogleAuth; Website platform only. Updated 2026-11-10 with spec-review decisions G01–G19 (`spec/gap-resolution-log.md`) and Codex review resolutions R05, R06, R18, R21, R22 and re-review N06, N09 (`reports/codex-findings-resolution-contract.md`). Codes (permission, screen, route) are `TBD (draft)` and assigned at reconcile.

> **Curated, plain-language view.** For PM, BA and client audiences. No permission codes and no matrix tables belong here; the raw matrix is derived from the built code later.

## Authorization System Type

**System Type**: `hybrid`

Roles (user, admin) decide which areas open; ownership checks decide who may change a specific record (for example editing one's own kudo, reading one's own notifications).

**Identified Roles**:
- Visitor (not signed in)
- User (signed-in Sunner, the default role)
- Admin (signed-in Sunner with the admin role)

## Curated View

- **Visitor** can open the Login page and the pre-launch countdown page, and nothing else.
- **User** can open every signed-in page: Homepage, Awards Information, Community Standards, the Kudos live board and kudo details, profiles (own and others', others read-only), and the notification list for their own notifications.
- **User** can write a kudo (never to themselves), edit their own kudos, give one heart per kudo to kudos they did not send (and take it back), and open their own secret boxes, but cannot edit other people's kudos, cannot open another person's notifications, and cannot open the admin area.
- **Admin** can do everything a User can, plus open the admin area: Overview, Review content (mark kudos Public or Spam), User directory, and Settings (campaigns).

Hearts: the sender of a kudo cannot heart it; the recipient and everyone else can, one heart each, withdrawable (decided 2026-11-10).

Anonymous kudos: only Admins see who really sent an anonymous kudo; every other viewer, the sender included, sees it masked.

## Access Boundaries

- **Signed in or not:** every page except Login and the countdown needs a session, and only Google accounts on `@sun-asterisk.com` with a verified email can get one. Google is the only sign-in method; every other method is switched off (Codex R21). A visitor without a session is sent to Login and returned to the page they asked for after signing in.
- **User versus Admin:** the admin area and all admin-only data are separated by the role stored on the person's user record. A signed-in User who opens an admin address sees the Forbidden page, not Login. That page is checked by how it looks; the refusal status 403 is checked on the backend's admin data requests, which is where the real protection lives (Codex R18).
- **Source of the role:** the role comes only from the stored user record (one record per person; there is no second profile store) and is checked by the backend service on every request; nothing the browser sends can raise it (Codex R05). New records start as User; admins are set up from a seeded list of email addresses, with no screen for changing roles.
- **Ownership:** edit rights on a kudo and read rights on notifications follow the record's owner. Hidden (spam) kudos are not listed to other Users.
- **Data layer:** the browser never reads the database directly. Every read and write goes through the backend service, which checks sign-in, role and ownership and hides anonymous senders; the database itself refuses direct access from signed-in and signed-out browser sessions as a second line of defence. Only the backend service's own database account can read and write business data, and database and storage secrets are held only by the backend, never by the website (Codex R21).
- **How the browser reaches the backend:** the website's pages call the backend directly, sending the person's sign-in token with each call; no cookies go to the backend and the website server does not relay calls on the browser's behalf. The backend accepts browser calls only from the configured website addresses, answers the browser's permission pre-check before looking at sign-in, and lets the browser read the file name of downloaded exports (Codex R06). For the build team, the exact rule lives in F002's technical spec (§ 4.4 Transport): allowed origins from `FRONTEND_ORIGINS`; `OPTIONS` answered 204 without a token; methods GET, POST, PUT, PATCH, DELETE; headers `Authorization`, `Content-Type`, `Idempotency-Key`; exposed header `Content-Disposition`; no credentials (bearer token only); max-age 600; no BFF.
- **Backend request classes (Codex N09):** the browser pre-check rule above covers every backend address. Behind it each address is in exactly one class: **public** — the current event data used by the countdown and launch gate, with no sign-in; **identity only** — creating or refreshing one's own user record, which needs a verified company sign-in token but no existing record; **signed-in** — every other backend request, which needs the token and an existing user record; **admin** — the admin data requests, which are signed-in requests that also need the admin role. For the build team: F002 technical spec § 4.4 A0 holds the exact route list (`GET /api/v1/events/current` public; `POST /api/v1/me/provision` identity only; other `/api/v1/*` signed-in; `/api/v1/admin/*` admin).

## Special Conditions

- **Pre-launch window:** before the event start time, signed-in pages show the countdown instead; Login and countdown stay open (launch gate, F003).
- **Allowed accounts:** only company Google accounts (`@sun-asterisk.com`) can sign in.
- **Role changes** apply on the backend at the person's next request and in the page menus on the next page load or when they return to the tab, without forcing a new sign-in.
- **Missing user record:** if someone is signed in but their user record is missing, the site tries once to recreate it; if that fails, they are signed out and shown Login with a message, never bounced between Login and Homepage (Codex R22). The sign-out always happens in the browser: when the problem is found while a page is being built on the server, that page shows no header or footer and hands off to a small browser step that signs out and then opens Login, so the session is really gone and reloading Login stays on Login (Codex N06).
