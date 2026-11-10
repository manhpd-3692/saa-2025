---
status: draft
authored_by: takumi
lang: en
created: 2026-11-09
---

# Feature List

**Project**: SAA 2025 website (Sun* Annual Awards 2025, "Root Further")
**Generated**: 2026-11-09
**Analysis Scope**: Greenfield system decomposition (Website platform only; Mobile/Tablet out of scope). Sources: `docs/SCREENFLOW.md`, `docs/screen-specs/{homepage-saa,countdown-prelaunch,he-thong-giai}.md`, `spec/.intent-enum.json`. Design source: Figma file `9ypp4enmFmdK3YAFJLIu6C`.

**Code Format**: All codes MUST follow `F###_NameSlug` format (e.g., F001_Auth, F002_UserProfile). Codes below are PROVISIONAL; real allocation happens at promote.
**Screen Code Format**: All screen codes MUST follow `SCR###_NameSlug` format (e.g., SCR001_LoginForm)
**User Story Code Format**: All US codes MUST follow `US###_NameSlug` format (e.g., US001_Login)
**Background Logic Code Format**: All BL codes MUST follow `BL###_NameSlug` format (e.g., BL001_ScheduledReport)
**Permission Code Format**: All PERM codes MUST follow `PERM###_NameSlug` format (e.g., PERM001_ViewReports)

**Feature Types**:
- `ui` - Feature has UI screens (SCR###)
- `background` - Feature only has background logic (BL###, no SCR###)
- `mixed` - Feature has both UI screens and background logic

**Release scope (G05, 2026-11-10)**: all 12 features are in release one; none is deferred.

**Architecture (G15–G19)**: Next.js 16 App Router at the repo root is the frontend only; a Go REST API in `backend/` (stdlib `net/http`, pgx + sqlc) owns every business read/write and authorization; Supabase provides Google OAuth (Go verifies the JWT), Postgres and Storage. Decisions: `spec/gap-resolution-log.md`.

**Draft note**: No SCR/US/ROUTE/MODEL/BL/PERM codes exist yet. Related-artifact fields use SCREENFLOW screen names + Figma frame ids, plain entity names from the SCREENFLOW data-model sketch, or `TBD (draft)`.

## Feature Hierarchy

**Note**: Features are sorted by priority from highest to lowest (P0 → P1 → P2 → P3); within a priority, by suggested build order (foundation → static pages → kudos core → gamification → notifications → admin).
- **P0**: Core functionality, blocking issues, or essential features
- **P1**: High priority, significant features
- **P2**: Medium priority, standard features
- **P3**: Low priority, nice-to-have features

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F001_AppShellI18n | App Shell, Navigation & i18n | ui | TypeScript | Next.js 16 web app | P0 |
| F002_GoogleAuth | Google Sign-in, Session & Roles | mixed | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P0 |
| F003_EventCountdownGate | Event Countdown & Launch Gate | mixed | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P1 |
| F004_StaticEventContent | Homepage, Awards Information & Community Standards | ui | TypeScript | Next.js 16 web app | P1 |
| F005_KudoCompose | Write, Edit & Send Kudos | mixed | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P1 |
| F006_KudosLiveBoard | Kudos Live Board & Kudo Detail | ui | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P1 |
| F007_SunnerProfile | Own & Other Sunner Profiles | ui | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P2 |
| F008_KudosGamification | Hearts, Hero Badges & Secret Box | mixed | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P2 |
| F009_Notifications | Notification Center | mixed | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P2 |
| F010_AdminOverviewUsers | Admin Overview & User Directory | ui | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P3 |
| F011_AdminKudoModeration | Admin Kudo Moderation (Spam / Public) | mixed | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P3 |
| F012_AdminCampaigns | Admin Campaign Settings | ui | TypeScript, Go | Next.js 16 frontend + Go API (backend/) + Supabase | P3 |

## Feature Details

### F001_AppShellI18n: App Shell, Navigation & i18n

**Type**: ui
**Description**: Shared frame every page lives in: header (nav About SAA 2025 / Awards Information / Sun* Kudos, bell, language switch, avatar menu with Profile / Admin-for-admins / Logout), footer (links to Home, Awards, Kudos, Community Standards, copyright), floating action button (open Thể lệ panel / Write Kudos), VN/EN language switching with persisted choice, 403 and 404 error pages, design-token base (Tailwind v4). Flow: route/locale → render localized chrome → navigate. Feature owns the shell and the entry points; the panels/modals it opens belong to F005, F008, F009.

**Workspace**: Next.js 16 App Router + TailwindCSS v4
**Languages**: TypeScript
**Components**: TBD (draft)

**Related Screens**:
- Header, Footer, Floating Action Button closed/open (`313:9137`, `313:9139`)
- Dropdown-ngôn ngữ (`721:4942`), Dropdown-profile (`721:5223`), Dropdown-profile Admin (`721:5277`)
- Error page - 403 (`2182:9291`), Error page - 404 (`1378:5063`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- TBD (draft) (user language preference, if persisted)

**Related Background Logic**:
- TBD (draft)

**Related Permissions**:
- TBD (draft) (Admin link visible to admin role only)

---

### F002_GoogleAuth: Google Sign-in, Session & Roles

**Type**: mixed
**Description**: Sunner signs in with Google via Supabase OAuth, gets a session, is routed onward (countdown or homepage), can log out. Only `@sun-asterisk.com` accounts may sign in (G01); admins are seeded by email (G02). Go verifies the Supabase access token and resolves roles user/admin from the profile row on every request; they gate protected routes (all pages except Login and Countdown; `/admin/*` admin-only; 403 on violation). Flow: click "LOGIN With Google" → OAuth → callback → session + user row upsert → redirect.

**Workspace**: Next.js 16 frontend (Supabase Auth OAuth) + Go API in `backend/` (JWT verification, roles)
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Login (U1, `662:14387`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft) (OAuth callback, session, logout)

**Related Data Models**:
- users (role user/admin, unit)

**Related Background Logic**:
- TBD (draft) (first-login user row provisioning)

**Related Permissions**:
- TBD (draft) (authenticated user, admin)

---

### F003_EventCountdownGate: Event Countdown & Launch Gate

**Type**: mixed
**Description**: Before the event start time, every route redirects to a standalone full-screen countdown (days/hours/minutes, no header/footer); at zero it auto-redirects to the Homepage. After start, `/countdown` redirects to Homepage. Flow: request → compare now vs configured event start → countdown or home.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Countdown - Prelaunch (U2, `2268:35127`; spec `docs/screen-specs/countdown-prelaunch.md`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- events (countdown target)

**Related Background Logic**:
- TBD (draft) (launch-gate redirect)

**Related Permissions**:
- TBD (draft) (public)

---

### F004_StaticEventContent: Homepage, Awards Information & Community Standards

**Type**: ui
**Description**: Read-only event content: Homepage SAA (cover, countdown block, event info, CTAs, 6 award cards, Kudos teaser block), Hệ thống giải (sticky 6-award menu with anchor scroll, award detail cards, Kudos CTA), Tiêu chuẩn cộng đồng (10 content rules + security standards). One outcome: the Sunner learns about the event and its rules. Award data is static content in the Next.js app; the Homepage countdown counts to `events.ceremony_at` (G13).

**Workspace**: Next.js 16 + TailwindCSS v4
**Languages**: TypeScript
**Components**: TBD (draft)

**Related Screens**:
- Homepage SAA (U3, `2167:9026`; spec `docs/screen-specs/homepage-saa.md`)
- Hệ thống giải (U4, `313:8436`; spec `docs/screen-specs/he-thong-giai.md`)
- Tiêu chuẩn cộng đồng (U10, `1161:8944`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- TBD (draft) (awards: static content or seed)

**Related Background Logic**:
- TBD (draft)

**Related Permissions**:
- TBD (draft) (authenticated user)

---

### F005_KudoCompose: Write, Edit & Send Kudos

**Type**: mixed
**Description**: Sunner composes a kudo in a modal: recipient search/select, title (Danh hiệu), rich text with `@mention` and links, 1–5 hashtags, up to 5 images (Supabase storage), optional anonymous send; required-field validation with error state; edit own kudo. Flow: fill form → validate → persist kudo + images + hashtags → return to board.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase (Postgres, storage)
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Viết Kudo (U6, `520:11602`) and variants (`828:13433`, `1612:5056`), error state (`662:13035`)
- Dropdown recipient (`828:10943`), Dropdown hashtag (`1002:13013`), Addlink box (`1002:12917`), Ẩn danh (`2099:9148`), Edit mode (`1949:13746`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- kudos, kudo_images, hashtags, kudo_hashtags, users

**Related Background Logic**:
- TBD (draft) (image upload handling, mention resolution)

**Related Permissions**:
- TBD (draft) (authenticated user; edit own kudo only)

---

### F006_KudosLiveBoard: Kudos Live Board & Kudo Detail

**Type**: ui
**Description**: Sunner browses kudos: Highlight Kudos carousel (filters Hashtag / Phòng ban), Spotlight word-cloud board with total count, All Kudos infinite feed, right sidebar slots (my stats, top 10 recipients; secret-box button hosted by F008), kudo detail view with Copy Link, hover avatar info card, spam-flagged display. Flow: filters → query public kudos → render cards → open detail / profile. Heart button and badge rendering on cards are owned by F008.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Sun* Kudos - Live board (U5, `2940:13431`), View Kudo (U7, `520:18779`)
- Dropdown Hashtag filter (`721:5580`), Dropdown Phòng ban (`721:5684`), Hover avatar info (`721:5827`, `2268:35101`), Hashtag group (`1002:13094`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- kudos, kudo_hashtags, hashtags, users

**Related Background Logic**:
- TBD (draft)

**Related Permissions**:
- TBD (draft) (authenticated user; only public-status kudos listed)

---

### F007_SunnerProfile: Own & Other Sunner Profiles

**Type**: ui
**Description**: Sunner views own profile (avatar, name, unit, collected icons, stats, own kudos list with received/sent filter) and read-only profiles of other Sunners reached from kudo avatars. Flow: select user → load stats + kudos → filter received/sent. Secret-box button and badge/icon data come from F008.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Profile bản thân (U8, `362:5037`), Profile người khác (U9, `362:5097`)
- Dropdown-filter đã nhận/gửi (`763:4728`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- users, kudos, hearts

**Related Background Logic**:
- TBD (draft)

**Related Permissions**:
- TBD (draft) (authenticated user; other profile read-only)

---

### F008_KudosGamification: Hearts, Hero Badges & Secret Box

**Type**: mixed
**Description**: Reward loop around kudos: Sunner hearts a kudo — one heart per Sunner per kudo, toggled off by pressing again, never on a kudo they sent (G06, G07); a heart's weight is the active campaign multiplier (x2–x10) fixed at heart time and the weighted total is the heart number everywhere (G08); hero badge tier derived from distinct senders (New 1–4, Rising 5–9, Super 10–20, Legend >20) with hover info; every 5 weighted hearts received on a Sunner's sent kudos grants that sender a Secret Box, opened to reveal one of 6 icons at equal odds, repeats allowed (G09) (collect all 6 for a prize); Thể lệ rules side panel; "Kudos Quốc Dân" = top 5 most-hearted kudos, shown as the unfiltered Highlight carousel on the live board (G12). Flow: heart → recompute counts/badge/box entitlement → open box → icon result. Heart control and badges are regions on F006/F007 screens; this feature owns the logic and overlays.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Thể lệ UPDATE panel (`3204:6051`)
- Open secret box states and results (`1466:7069`, `1466:7676`, `1466:7024`, `1466:7593`, `2995:15708`, `2995:15733`, `2995:15754`, 8 standby variants)
- Hover danh hiệu (`3241:14991`..`3241:15003`), Hover campaign (`3241:15021`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- hearts, secret_boxes, users (level, badges), campaigns (read)

**Related Background Logic**:
- TBD (draft): hero badge tier recalculation; secret box grant per 5 hearts received; top-5 Kudos Quốc Dân ranking

**Related Permissions**:
- TBD (draft) (authenticated user; sender cannot heart own kudo; one heart per user per kudo, withdrawable)

---

### F009_Notifications: Notification Center

**Type**: mixed
**Description**: Sunner receives in-app notifications (kudo received, hearts received, secret box earned, hero level-up, all 6 icons, spam warning; no admin pending-review notice, G10) via header bell: list panel with unread state and detail view, deep links to secret box flow or Community Standards. Flow: domain event → notification row → bell badge → list → detail.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Tất cả thông báo (`589:9132`), View thông báo (`589:9152`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- notifications

**Related Background Logic**:
- TBD (draft): notification creation on heart / secret box grant / spam flag

**Related Permissions**:
- TBD (draft) (user sees only own notifications)

---

### F010_AdminOverviewUsers: Admin Overview & User Directory

**Type**: ui
**Description**: Admin monitors participation: Overview table per unit (members, kudos sent/received, users with ≥1 kudo, secret boxes) with date range and Export; User directory (email, sent/received, hearts, level, badges, last login, role) with unit/level/role filters, search and Export; admin header nav (Overview / Review content / User / Settings).

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Admin - Overview (A1, `620:7712`), Admin - User (A4, `773:26403`)
- Date picker (`1413:9045`, `2492:9140`), Dropdown chọn thời gian (`860:14284`), Dropdown search user (`1002:15639`), phòng ban (`1002:15708`), level (`1002:15711`), Role (`1002:15714`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- users, kudos, hearts, secret_boxes

**Related Background Logic**:
- TBD (draft) (aggregation, CSV/XLSX export)

**Related Permissions**:
- TBD (draft) (admin only)

---

### F011_AdminKudoModeration: Admin Kudo Moderation (Spam / Public)

**Type**: mixed
**Description**: Admin reviews all kudos in a table (filters sender, receiver, status, date; search; pagination) and marks each Public or Spam per community standards; spam kudos are hidden from the live board and show the spam alert overlay to the author. Flow: filter → select kudo → action Spam/Public → status change → notify author (via F009).

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Admin - Review content (A2, `722:16251`), Search state (A3, `832:13197`)
- Action - Spam (`773:26373`), Action - Public (`773:26295`), C_Filter (`1002:15394`), sender/receiver/status dropdowns (`1002:15428`, `1002:15464`, `1002:15559`)
- KUDO spam / Alert Overlay (`3127:24099`, `3127:24672`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- kudos (status public/spam), users

**Related Background Logic**:
- TBD (draft): spam status change side effects (visibility, author notification)

**Related Permissions**:
- TBD (draft) (admin only)

---

### F012_AdminCampaigns: Admin Campaign Settings

**Type**: ui
**Description**: Admin manages campaigns (name, time window, integer multiplier 2–10, default 2, G14): list, add, edit, delete with confirm. Consumed by F008 when counting hearts. Flow: open modal → validate dates → persist → list refresh.

**Workspace**: Next.js 16 frontend + Go API in `backend/` + Supabase Postgres
**Languages**: TypeScript, Go
**Components**: TBD (draft)

**Related Screens**:
- Admin - Setting (A5, `820:10492`), add new Campaign (A6, `820:11445`), add filled (A7, `832:12113`), Edit (A8, `832:12299`)
- Popup delete campaign (`1760:8926`), Action - Campaign (`820:11429`)

**Related User Stories**:
- TBD (draft)

**Related APIs/Routes**:
- TBD (draft)

**Related Data Models**:
- campaigns

**Related Background Logic**:
- TBD (draft)

**Related Permissions**:
- TBD (draft) (admin only)

---

## Summary

- **Total Features**: 12
- **Total Screens**: TBD (draft)
- **Total User Stories**: TBD (draft)
- **Total Routes**: TBD (draft)
- **Total Data Models**: TBD (draft)
- **Total Background Logic**: TBD (draft)
- **Total Permissions**: TBD (draft)
- **Languages Detected**: TypeScript (Next.js frontend), Go (backend API)

## Cross-Reference Validation

- [x] All F### codes are unique
