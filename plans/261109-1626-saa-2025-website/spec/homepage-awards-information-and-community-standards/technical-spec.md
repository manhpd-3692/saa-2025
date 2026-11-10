---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# F004_StaticEventContent — Technical Spec

**See also:** [`functional-spec.md`](./functional-spec.md) — plain-language requirements, business rules, user stories and scenarios.

## 1. Technical Overview

Read-only event content for signed-in Sunners: the Homepage SAA (`/`), the Awards Information page (`/awards`) and the Community Standards page (`/community-standards`). All three are Next.js 16 App Router server-rendered pages with Tailwind v4 styling; the Next.js app is frontend only and never touches the database. The six-award catalog and the community rule copy are static content shipped with the Next.js app, Vietnamese master with English where available (no database table, no Go endpoint, no mutation). Only two small client islands exist: the homepage ceremony countdown (`CeremonyCountdown`, owned here) and the awards-page sticky menu (anchor scroll + scroll-spy). The only persisted data read is the shared `events` row owned by F003 (`ceremony_at` as the countdown target; `venue`, `livestream_note` as event info), fetched server-side from the public Go endpoint `GET /api/v1/events/current` served by `EventsHandler#getCurrent` (planned) in `backend/internal/events`. Header, footer and floating action button are F001; auth gating is F002; the launch gate, the launch-mode countdown and the shared pure `CountdownDisplay` / `useCountdown(targetIso, serverNowIso)` are F003 (Codex R08); the Kudos board that the CTAs point to is F006. Release acceptance is desktop only: minimum viewport width 1280 px, narrower windows keep the desktop layout with horizontal scroll (AD01, Codex R17).

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | FR-001, FR-002, FR-601 | — | § 4.4 |
| **A1** | `HomePage#render` (planned) | `GET` `/` | FR-101, FR-201, FR-203, FR-204, FR-205, FR-206, FR-207, BR-001, US001, US002, US005 | — *(read-only)* | § 3.1 |
| **A2** | `CeremonyCountdown#tick` (planned, client-only) | — | FR-202, FR-403, DEC-001 | — *(read-only)* | § 3.1 |
| **A3** | `AwardsPage#render` (planned) | `GET` `/awards` | FR-102, FR-301, FR-303, FR-304, FR-305, BR-001, BR-002, BR-003, US003, US005 | — *(read-only)* | § 3.2 |
| **A4** | `AwardsMenu#selectAward` (planned, client-only) | — | FR-302, FR-401, BR-003 | — *(read-only)* | § 3.2 |
| **A5** | `AwardsMenu#trackActiveAward` (planned, client-only) | — | FR-402, DEC-002 | — *(read-only)* | § 3.2 |
| **A6** | `CommunityStandardsPage#render` (planned) | `GET` `/community-standards` | FR-103, FR-351, FR-352, US004 | — *(read-only)* | § 3.3 |

## 3. Actions

### 3.1 CAP-01 — Explore the event homepage

#### A1 · Render the Homepage SAA
`GET /` → `HomePage#render` (planned)
`FR-101` `FR-201` `FR-203` `FR-204` `FR-205` `FR-206` `FR-207` `BR-001` `US001` `US002` `US005` · Homepage SAA screen

**Who** · Sunner, signed in, event already started *(gate A0 — § 4.4)*
**FE** · Page composed of: hero with Root Further key visual (FR-201), ceremony countdown block (hosts A2), event info block with date/venue/livestream note (FR-203), two CTAs "ABOUT AWARDS" and "ABOUT KUDOS" (FR-204), long-form about-event text (FR-205), six award cards (FR-206), Sun* Kudos promo block (FR-207). Award cards and Kudos block use shared components (§ 4.1). Header/footer/FAB come from the F001 shell.
**BE** · none in Next.js. The Server Component calls Go `GET /api/v1/events/current` (F003 `EventsHandler#getCurrent` (planned) → `EventService#Current` → sqlc `GetCurrentEvent`) with `no-store` and a 5 s timeout (`AbortSignal.timeout`, Codex R23), and uses `ceremonyAt`, `venue`, `livestreamNote` and `serverNow` from the response; cards come from the static award catalog. Localized copy resolved from the F001 locale.
**Rule** · Card order, titles and "Chi tiet" targets come from the single award catalog — **BR-001 — The six awards are defined once and rendered in a fixed order on every page that shows them.** Each card links to `/awards#<award-slug>`; "ABOUT AWARDS" links to `/awards`; "ABOUT KUDOS" and the Kudos block CTA link to the F006 board. *(§ 4.4)*
**Result** · Read-only, no DB write. User sees the full page; if the Go call fails, times out or returns 404 (the event-unavailable fallback, Codex R16), event-info and countdown blocks show a retry/fallback message while the rest of the page still renders (static content never blocked by it).
**Source:** `TBD (draft)`

<!-- No diagram: below threshold (read-only, single data read, synchronous). -->

---

#### A2 · Tick the homepage ceremony countdown
client timer → `CeremonyCountdown#tick` (planned)
`FR-202` `FR-403` `DEC-001` · Homepage SAA screen

**Who** · Sunner on the homepage *(gate A0)*
**FE** · Client island inside the countdown block; shows days / hours / minutes under the "Coming soon" label. `CeremonyCountdown` is the ceremony-mode wrapper (Codex R08): it renders F003's shared pure `CountdownDisplay` and takes its arithmetic from F003's shared hook `useCountdown(targetIso, serverNowIso)` with `targetIso = ceremonyAt`, so there is no second implementation of the arithmetic (DRY). It does not use F003's `LaunchCountdown`. Updates while the page stays open (FR-403: live update).
**Request** · input: target timestamp `ceremonyAt` and `serverNow` (from A1's Go call) sent with the page props. On window refocus it may re-read `serverNow` from Go `GET /api/v1/events/current` to correct the clock offset; it uses only `serverNow` from that response and ignores `status` (Codex R08).
**BE** · none after initial render; remaining time = target − (client clock + server offset) so client clock drift does not skew the display (offset arithmetic shared with F003 through `useCountdown`).
**Rule** · **DEC-001** decides what the block shows (FR-202: show countdown values). Ceremony mode **never redirects** and ignores the event `status`: after site launch `status` is already `active` while the ceremony is still ahead, so status must not end this countdown (Codex R08).

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-001** | render | `remaining > 0` (remaining = `ceremony_at` − effective now) | zero-padded days, hours, minutes, recomputed every `COUNTDOWN_TICK_MS` | `TBD (draft)` |
| **DEC-001** | render | `remaining <= 0` | post-zero state: 00 days, 00 hours, 00 minutes; ticking stops; no redirect; the rest of the page is unchanged (functional-spec.md § 3 D001, G13) | `TBD (draft)` |

**Result** · Read-only; no network call per tick. Timer cleared on unmount and once the post-zero state is reached.
**Source:** `TBD (draft)`

---

### 3.2 CAP-02 — Browse the award system

#### A3 · Render the Awards Information page
`GET /awards` → `AwardsPage#render` (planned)
`FR-102` `FR-301` `FR-303` `FR-304` `FR-305` `BR-001` `BR-002` `BR-003` `US003` `US005` · Awards Information screen

**Who** · Sunner, signed in *(gate A0)*
**FE** · Hero key visual and page title (FR-301), two-column layout: sticky menu (hosts A4/A5) and six award detail cards (FR-303: image, title, description, quantity + unit, prize value), then the Kudos promo block (FR-305, same shared component as A1). The inherited mobile/tablet horizontal tab bar is out of release scope (AD01, R17); below 1280 px the two-column desktop layout is kept with horizontal scroll.
**Request** · optional URL fragment `#<award-slug>` (client-side only; never reaches the server)
**BE** · none. `AwardsPage#render` is fully static: reads the award catalog in the Next.js app only. No Go call, no DB.
**Rule**
- **BR-001 — The six awards are defined once and rendered in a fixed order on every page that shows them.** Order and prize values are the catalog's, not the page's. *(§ 4.4)*
- **BR-002 — Signature 2025 - Creator shows two prize values (individual and team) separated by an "Or" divider; every other award shows one.** Rendered by the dual-prize variant of the award card (FR-304). *(§ 4.1)*
- **BR-003 — An unrecognised or missing award anchor leaves the page at the top with no error.** On load, a valid fragment scrolls to that card after layout. *(§ 4.4)*
**Result** · Read-only, no DB write. Page is cacheable as static output per locale.
**Source:** `TBD (draft)`

---

#### A4 · Select an award in the menu
client click → `AwardsMenu#selectAward` (planned)
`FR-302` `FR-401` `BR-003` · Awards Information screen

**Who** · Sunner *(gate A0)*
**FE** · Six menu items (FR-302: fixed catalog order); click smooth-scrolls to the matching card, offset by header height, and updates the URL fragment without a full navigation (FR-401). Item is a real link (`href="#slug"`) so it works without JavaScript.
**Rule** · A slug not in the catalog is ignored per BR-003 (stay put, no error).
**Result** · Read-only. URL fragment changes; browser Back returns to the previous fragment or page.
**Source:** `TBD (draft)`

---

#### A5 · Track the active award while scrolling
client scroll → `AwardsMenu#trackActiveAward` (planned)
`FR-402` `DEC-002` · Awards Information screen

**Who** · Sunner *(gate A0)*
**FE** · Observes the six cards and marks one menu item active (gold text + underline, `aria-current="true"`) as the user scrolls (FR-402: active item follows scroll position).
**Rule** · **DEC-002** decides which item is active:

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-002** | interaction | one or more cards ≥ 30% visible | topmost such card's item is active | `TBD (draft)` |
| **DEC-002** | interaction | no card yet ≥ 30% visible (page above first card) | first item (Top Talent) active | `TBD (draft)` |

**Result** · Read-only; active state is client-local UI state only (not persisted).
**Source:** `TBD (draft)`

---

### 3.3 CAP-03 — Read the community standards

#### A6 · Render the Community Standards page
`GET /community-standards` → `CommunityStandardsPage#render` (planned)
`FR-103` `FR-351` `FR-352` `US004` · Community Standards screen

**Who** · Sunner, signed in *(gate A0)*; reached from the footer link or a spam-warning notification (F009)
**FE** · Static page: title, ten numbered content rules each with a title and explanation (FR-351), then a security standards section (FR-352).
**BE** · none. Renders static localized content shipped with the Next.js app; no Go call, no data read.
**Result** · Read-only, no DB write. Rule text is transcribed from Figma frame `1161:8944` at build time, Vietnamese first (functional-spec.md § 3 D003).
**Source:** `TBD (draft)`

---

### 3.4 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | Go `GET /api/v1/events/current` fails, times out or returns 404 | Countdown and event-info blocks show a fallback message with retry; rest of page renders. |
| A2 | `ceremony_at` already passed when the page loads (seed `after-ceremony`, Codex R16) | Countdown renders the post-zero state 00 00 00 at once and no timer runs. |
| A2 | Server time is in `start_at <= now < ceremony_at` (seed `live`), so the event `status` is `active` | Countdown keeps counting to `ceremonyAt`; the homepage never redirects (Codex R08). |
| A2 | `ceremony_at` is less than one minute away | Display reads 00 00 00; ticking stops when remaining reaches 0; no redirect. |
| A1 · A3 | Award image fails to load | Card shows a placeholder with the award name; layout does not shift. |
| A1 · A3 · A6 | Localized copy missing for the active language | Falls back to Vietnamese copy for that string. |
| A2 | Tab hidden / device sleeps then resumes | Next tick recomputes from timestamps; on refocus `serverNow` may be re-read to correct the offset, `status` ignored (Codex R08); no drift accumulated. |
| A1 · A3 | Browser window narrower than 1280 px | Desktop layout kept; page scrolls horizontally (AD01, Codex R17). |
| A3 · A4 | Fragment names no award | Stays at top, no error (BR-003). |
| A5 | Fast programmatic scroll from A4 | Active item settles on the target card; no flicker through intermediate items. |
| A1-A6 | Request without a valid session | Redirected by the F002 gate (A0 — § 4.4); the page never renders. |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `AwardCard` (variant: standard, dual-prize) | Shows one award: image, title, description, quantity + unit, prize value(s) | A1, A3 | `TBD (draft)` |
| `SunKudosPromoBlock` | Kudos promo: label, title, description, "Chi tiet" CTA to the F006 board | A1, A3 | `TBD (draft)` |
| `AwardsMenu` (client) | Sticky menu, anchor scroll, scroll-spy | A4, A5 | `TBD (draft)` |
| `CeremonyCountdown` (client) | Ceremony-mode wrapper: `useCountdown(ceremonyAt, serverNow)` + `CountdownDisplay` (both shared from F003) inside the homepage countdown block; stops at 00 and shows the post-zero state; never redirects; ignores `status` (Codex R08) | A2 | `TBD (draft)` |
| `EventInfoBlock` | Date (from `ceremonyAt`), venue, livestream note from the Go events response | A1 | `TBD (draft)` |
| `CommunityRuleList` | Numbered rule list + security standards section | A6 | `TBD (draft)` |

### 4.2 Data Model

#### Key Entities

| Entity | Table | Key Columns | Purpose |
|--------|-------|-------------|---------|
| Event (owned by F003) | `events` | `ceremony_at` (timestamptz — homepage countdown target and event date), `venue`, `livestream_note` | Read-only source for A1/A2, reached only through Go `GET /api/v1/events/current`; Next.js never queries the table. No other table is read or written by this feature. |

Award catalog and community rule copy are static content in the Next.js app, not entities (functional-spec.md § 3 D003, D006).

Test and demo data for the event row come from F003's seed scenarios (`SEED_SCENARIO`, Codex R16): `live` (default — `start_at = now() - 1 day`, `ceremony_at = now() + 14 days`, countdown running), `after-ceremony` (`ceremony_at = now() - 1 day`, post-zero state) and `prelaunch` (homepage gated by F003). The event-unavailable fallback is exercised with no `events` row.

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None. Countdown remaining-time and active-menu item are client-local UI state too small for an SM (fewer than 3 states).

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · FR-601 — every page in this feature requires a signed-in session.**
Enforced by the F002 sign-in redirect in Next.js `proxy.ts`; the pages themselves contain no auth code. Before the event start the F003 launch gate in the same proxy redirects away from all three pages first. The Go events endpoint these pages read is public, so no bearer token is needed for it.
**Source:** `TBD (draft)`

**A0 · FR-001 / FR-002 — award data and all copy are static, bilingual content with one source.**
A single typed catalog module in the Next.js app holds the six awards (slug, order, VN/EN name and description, quantity, unit type, prize value(s), image); community rule copy, transcribed from Figma `1161:8944`, lives alongside. Vietnamese is the master; a missing English string falls back to Vietnamese. Locale is resolved by the F001 i18n layer; this feature adds no locale logic.
**Source:** `TBD (draft)`

#### Bin 2 — used by ≥2 named actions

**BR-001 — The six awards are defined once and rendered in a fixed order on every page that shows them.**
Used in: **A1** · **A3**. Homepage cards and awards-page cards read the same catalog; neither page hardcodes an award.
**Source:** `TBD (draft)`
```text
catalog = [
  {slug:"top-talent",            qty:10, unit:individual,         prize:[7_000_000]},
  {slug:"top-project",           qty:2,  unit:team,               prize:[15_000_000]},
  {slug:"top-project-leader",    qty:3,  unit:individual,         prize:[7_000_000]},
  {slug:"best-manager",          qty:1,  unit:individual,         prize:[10_000_000]},
  {slug:"signature-2025-creator",qty:1,  unit:individual_or_team, prize:[5_000_000, 8_000_000]},
  {slug:"mvp",                   qty:1,  unit:individual,         prize:[15_000_000]},
]  # VND; order = display order
```

### 4.5 Algorithms & Integrations

None. Countdown arithmetic (ALG-001 through the shared `useCountdown` hook) is owned by F003 and applied here to `ceremony_at` in ceremony mode (Codex R08); the only integration is the F003 Go endpoint `GET /api/v1/events/current`.

### 4.6 Configuration

```text
ACTIVE_AWARD_VISIBILITY_THRESHOLD = 0.3   # fraction of a card in view before its menu item turns active (A5)
COUNTDOWN_TICK_MS = 1000                  # tick interval of the shared useCountdown hook (A2; same value as F003)
EVENTS_FETCH_TIMEOUT_MS = 5000            # server-side Go events fetch on the homepage (A1) (Codex R23)
MIN_VIEWPORT_WIDTH_PX = 1280              # desktop-only acceptance; narrower windows scroll horizontally (Codex R17)
```

**Client behavior:** see behavior-logic.md, permissions.md, architecture.md

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1, A3)* Each of the six awards appears once, in catalog order, with the prize values listed in BR-001's block, on both pages (covers FR-206, FR-303, BR-001).
- **SC-002** *(A3)* Signature 2025 - Creator shows 5.000.000 VND and 8.000.000 VND separated by "Or"; no other card shows two values (covers FR-304, BR-002).
- **SC-003** *(A3, A4)* Opening `/awards#mvp` lands on the MVP card; `/awards#unknown` stays at top with no error (covers FR-102, BR-003).
- **SC-004** *(A5)* Scrolling down the awards page moves the active menu item in catalog order (covers FR-402, DEC-002).
- **SC-005** *(A2)* Countdown values count to `ceremony_at` (not `start_at`), decrease while the page is open, match server time within one minute, and read 00 00 00 once `ceremony_at` passes (covers FR-202, FR-403, DEC-001).
- **SC-006** *(A1-A6)* An unauthenticated request to any of the three pages is redirected to Login (covers FR-601).
- **SC-007** *(A1, A2)* With `start_at <= now < ceremony_at` (seed `live`, event `status` = `active`), the homepage renders, the countdown keeps counting to `ceremonyAt` and no redirect happens (Codex R08).
- **SC-008** *(A2)* Ceremony zero boundary: with `ceremony_at` a few seconds ahead, the countdown reaches 00 00 00, stops ticking and stays on the homepage; with seed `after-ceremony` it renders 00 00 00 at load (Codex R08, R16).
- **SC-009** *(A2)* Refocus: hide the tab, shift time past a minute boundary, show it again — the digits correct to server time and the page does not redirect even though `status` is `active` (Codex R08).
- **SC-010** *(A1)* Event-unavailable fallback: with no `events` row, or the Go events call stalled past 5 s, the countdown and event-info blocks show the fallback with retry and the rest of the page renders (Codex R16, R23).
- **SC-011** *(A1, A3)* At a 1280 px wide window the pages match the desktop design; at a narrower width the desktop layout is kept and the page scrolls horizontally (Codex R17).

### 5.2 Assumptions

- *(A1, A3)* "Chi tiet" on homepage award cards goes to the matching card on the awards page (per SCREENFLOW), not to a separate per-award detail route.
- *(A3)* Single canonical awards route `/awards`; the alternative `/he-thong-giai` from the sample spec is not implemented (YAGNI).
- *(A1, A3)* Award images and the key visual are static assets bundled with the app, optimized via Next image handling.
- *(A1, A3, A6)* Release acceptance is desktop only, minimum width 1280 px; inherited mobile/tablet behaviors (collapsed header, award tab bar, breakpoints) are out of release scope (AD01, Codex R17).
- *(A6)* Community Standards is a pure static page; the ten rules and security standards are plain copy, not data-driven.

### 5.3 Unresolved Questions

1. **Countdown target** *(A2)*: resolved — the homepage counts to `events.ceremony_at` and shows 00 at zero (G13, functional-spec.md § 3 D001).
2. **Rendering mode** *(A1, A3, A6)*: resolved — the homepage is dynamic (per-request Go call with `no-store`); awards and community standards are static pages built per locale (no Redis, AD13). Confirm the exact Next.js 16 API against the bundled docs at implementation time.

### 5.4 Source References

No source code written yet — see `## 7. User Stories` in functional-spec.md for planned behavior.

#### Data Flow

```text
GET / -> proxy.ts launch gate (F003) + sign-in redirect (F002) -> Server Component calls Go GET /api/v1/events/current (no-store, 5 s) + static award catalog -> server render -> client hydrates CeremonyCountdown: useCountdown(ceremonyAt, serverNow) -> CountdownDisplay (stops at 00, never redirects)
GET /awards -> session gate -> static award catalog -> server render -> client hydrates menu (hash scroll, scroll-spy)
GET /community-standards -> session gate -> static rule copy -> server render
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| Feature List | [feature-list.md](../feature-list.md) | F004 | [x] |
| System Overview | TBD (draft) | TBD (draft) | [ ] |
| Architecture | TBD (draft) | TBD (draft) | [ ] |
| API Map | TBD (draft) | TBD (draft) | [ ] |
| Entities | TBD (draft) | TBD (draft) | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | TBD (draft) | [ ] |
| Behavior Logic | TBD (draft) | TBD (draft) | [ ] |
| Permissions Matrix | TBD (draft) | TBD (draft) | [ ] |
| User Stories | TBD (draft) | TBD (draft) | [ ] |
