---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# Functional Spec — F011_AdminKudoModeration

**Priority**: P3
**Type**: mixed

**See also:** [`technical-spec.md`](./technical-spec.md) — planned Go handlers, status-change algorithm, sqlc queries, configuration.

## 1. Overview

**Problem:** Kudos that break the community standards (very short or repeated text, profanity, sensitive data and similar) stay on the live board, and nobody owns removing them or telling the author why.
**Solution:** An admin page "Review content" lists every kudo in a table that can be filtered by sender, receiver, status and date, and searched. For each kudo the admin picks Spam or Public. A Spam kudo disappears from the live board, profile pages and counts, stays visible to its author and admins, and its author gets a warning notification and an alert overlay that points to the community standards. Marking it Public brings it back.
**Scope:** Review table with filters, search and paging; marking a kudo Spam or Public; the warning to the author when a kudo is marked Spam; the spam alert overlay shown to the author on the kudo's detail page; who decided and when.
**Non-Scope:** Writing or editing kudos (F005); the board, detail and profile reads that hide spam kudos (F006, F007); the notification panel itself and the message wording (F009); the Community Standards page (F004); the admin access gate and admin header (F002, F010); automatic spam detection; deleting kudos; appeals; a third "Reject" or "Tạm ẩn" status; bulk decisions; mobile and tablet layouts.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | signed-in Sunner with the admin role | find kudos that break the standards and mark them Spam, restore wrongly flagged ones to Public |
| Author (Sunner) | signed-in Sunner who sent the kudo | learn that the kudo was hidden and why |
| Sunner | any other signed-in user | none here — never sees a spam kudo; reaching the admin address shows "no access" |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Review and filter kudos | See every kudo in a table, narrow it by sender, receiver, status and dates, search it, page through it | US001, US002 | FR-101, FR-102, FR-103, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206 | BR-001, BR-004, BR-005, BR-009, DEC-002 | TBD (draft) |
| CAP-02 | Decide a kudo's status | Mark a kudo Spam or Public; the author is warned on Spam | US003, US004 | FR-301, FR-302, FR-303, FR-304, FR-305, FR-602, FR-603 | BR-002, BR-003, BR-008, DEC-001, SM-001 | TBD (draft) |
| CAP-03 | Author learns of spam | See an alert on one's own spam kudo explaining why and linking to the standards | US005, US006 | FR-303, FR-401, FR-402 | BR-006, DEC-003 | TBD (draft) |

Cross-cutting: FR-001 (VN/EN text), FR-601 and BR-007 (every admin handler checks the admin role) apply to all three capabilities.

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | The admin notice "Có <x> lời nhắn cần bạn xem xét!" with outcomes Hợp lệ / Tạm ẩn / Reject (F009) — does F011 produce it, and what do the three outcomes map to? | Not produced: the notice and its Hợp lệ / Tạm ẩn / Reject outcomes are dropped and F009's `review_requested` kind is removed; kudos publish as Public immediately and admins use the Review page — resolved (G10) | No "pending" status or report-a-kudo flow exists; the table already lists every kudo | no |
| D002 | Is the author told when a Spam kudo is restored to Public? | No notice — resolved (applied default AD11) | No such message kind in F009; restoring is a correction, not news | no |
| D003 | Is there a confirmation before marking Spam? | Yes, one inline confirmation; Public has none — resolved (applied default AD11) | A Spam decision warns the author immediately and is not silently reversible | no |
| D004 | What does search match? | Kudo title or body text, ignoring case — resolved (applied default AD11) | Design shows a search state at `/admin/review?q=`; its target is not read | no |
| D005 | Where does the author see the spam alert overlay? | On the kudo detail page when the author opens that kudo (the warning notice links there); shown on each open while Spam, closable — resolved (applied default AD11) | F006 lets the sender open a spam kudo; F007 never lists spam kudos | no |
| D006 | Do hearts and secret boxes already earned from a kudo stay when it becomes Spam? | They stay; the kudo stops counting in visible totals — resolved (applied default AD11) | Taking earned rewards back is a policy call for F008 | no |
| D007 | Does the admin give a reason with a Spam decision? | No reason field; the warning is the fixed standard text — resolved (applied default AD11) | Design frames show an action menu only | no |
| D008 | Does the Review page have Export? | No — resolved (applied default AD11) | Not in the feature description; the design's export control is for Overview | no |
| D009 | Status filter options and default | Public and Spam; nothing chosen = all — resolved (applied default AD11) | Only two statuses exist | no |
| D010 | May an admin mark their own kudo? | Yes, no notice to themselves — resolved (applied default AD11) | No rule forbids it; F009 skips self-notices | no |
| D011 | What does the admin see for an anonymous kudo's sender? | The real sender with an "Anonymous" marker; only admins see it (G04) — resolved (G04) | Moderation needs the real author; other roles stay masked (F005) | no |
| D012 | What does the ID column show? | First 8 characters of the kudo id — resolved (applied default AD11) | Same convention as the User table (F010) | no |
| D013 | Is who decided and when recorded? | Yes, last decision only (`moderated_by`, `moderated_at`) — resolved (applied default AD11) | Cheap accountability; a full history is not asked for | no |
| D014 | Exact copy of the overlay, menu items and messages (Vietnamese and English) | English labels from the design notes; Vietnamese to be supplied — resolved (applied default AD11) | Frame text was not read in detail | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** All text on the Review page and the overlay appears in Vietnamese or English according to the chosen language.

### Review table (1xx)

- **FR-101** Review content lists kudos in a table with columns ID, Sender, Receiver, Content (title in capitals and the start of the body), Hashtags, Time, Status and Action.
- **FR-102** Kudos are shown newest first, 20 to a page, with page links.
- **FR-103** An empty result shows an empty state (with a way to clear filters when any is set); a load failure shows an error with Retry.

### Filters and search (2xx)

- **FR-201** The admin can narrow the table to one sender, chosen from a list of people who have sent kudos.
- **FR-202** The admin can narrow the table to one receiver, chosen from a list of people who have received kudos.
- **FR-203** The admin can narrow the table to Public or Spam kudos.
- **FR-204** The admin can narrow the table to a date range of kudo creation dates.
- **FR-205** The admin can search kudos by text.
- **FR-206** Filters and search combine, are kept in the address, and any change returns to page 1.

### Decisions (3xx)

- **FR-301** The admin can mark a Public kudo as Spam.
- **FR-302** The admin can mark a Spam kudo as Public.
- **FR-303** When a kudo is marked Spam its author receives a spam-warning notification.
- **FR-304** A Spam kudo is hidden from the live board, profile lists and counts, and Overview counts; it stays visible to its author and to admins.
- **FR-305** Each row's action menu offers only the decision that changes its status.

### Author alert (4xx)

- **FR-401** When the author opens their own Spam kudo, an alert overlay says the kudo was hidden for breaking the community standards.
- **FR-402** The overlay links to the Community Standards page and can be closed.

### Security (6xx)

- **FR-601** Only admins can open the Review page, receive its data or change a kudo's status; anyone else is refused by the backend, not only by the page.
- **FR-602** The system records who made the latest decision on a kudo and when, and keeps a moderation version that goes up by one on every real status change.
- **FR-603** A decision applies only to the version of the kudo the admin saw: if another decision landed in between, the backend refuses it as stale, returns the kudo's current status, and the row refreshes with a short message; repeating a decision that is already in effect at the same version changes nothing (Codex R13).

## 5. Business Rules

- Filters combine; search matches the kudo's title or body, ignoring case (BR-001).
- A decision carries the moderation version the admin saw; a stale version is refused with the kudo's current status so the row refreshes, and a decision already in effect at the current version does nothing: no write, no second warning (BR-002, Codex R13).
- The author is warned once per change to Spam; a failure or 2-second timeout when sending the warning never undoes the decision or changes the admin's success response; an author who is also the admin gets no warning (BR-003, Codex R23).
- An admin sees the real sender of an anonymous kudo, marked as anonymous; nobody else does (BR-004, G04).
- A date range whose start is after its end is ignored (BR-005).
- Only the author sees the alert overlay, and only while the kudo is Spam (BR-006).
- Every admin page, list request and decision checks the admin role on its own — hiding a menu is not protection; the role is always `users.role`, read through F002's shared sign-in context and admin check (BR-007, Codex R05).
- The kudo's status is the only switch for visibility; F011 changes the status and other features hide or show accordingly (BR-008).
- The Sender and Receiver lists offer only people who actually sent or received a kudo (BR-009).
- A Public row offers "Mark as Spam"; a Spam row offers "Mark as Public" (DEC-001).
- An empty table says "no kudo matches" when a filter or search is set, "no kudos yet" otherwise (DEC-002).
- The overlay shows to the author of a Spam kudo; an admin sees a plain "marked as spam" notice; a Public kudo shows nothing (DEC-003).
- A kudo is Public from creation (there is no pending or awaiting-review status, G10), becomes Spam by an admin decision and returns to Public the same way (SM-001).

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Admin - Review content | TBD (draft) | admin header, title "Review content", filter bar (Sender, Receiver, Status, dates, search), kudo table with status pills, pager | filter, search, page, mark Spam or Public |
| Kudo spam alert overlay | TBD (draft) | the author's own kudo detail with an alert on top: hidden for breaking community standards, link "Tiêu chuẩn cộng đồng" | read, follow the standards link, close |

The Sender, Receiver and Status dropdowns, the date picker and the Spam and Public action menus are overlays inside the Review screen, not separate screens. The kudo detail page itself belongs to F006.

### User Journey

1. Admin opens Review content from the admin header; the newest kudos show.
2. Admin picks a sender and the Spam status, or searches a phrase; the table narrows.
3. Admin opens a row's Action menu and chooses Mark as Spam; the pill turns Spam.
4. The kudo's author gets a warning notification, opens the kudo and reads the alert with the link to the community standards.
5. If the decision was wrong, the admin filters Status = Spam, opens the row's menu and chooses Mark as Public; the kudo returns to the live board.

## 7. User Stories

### US001 — See every kudo in one table

**Actor:** Admin
**Goal:** See all kudos with sender, receiver, content, hashtags, time and status.
**Business value:** Gives moderators one place to find kudos that break the standards.

**Acceptance Criteria:**
- [ ] The table shows the eight columns, newest first, 20 a page.
- [ ] Spam and Public kudos both appear, with a status pill.
- [ ] An anonymous kudo shows its real sender with an "Anonymous" marker.

### US002 — Narrow down and search

**Actor:** Admin
**Goal:** Reach the kudos of one sender or receiver, one status or one period, or containing a phrase.
**Business value:** Makes checking a reported person or phrase a matter of seconds.

**Acceptance Criteria:**
- [ ] Sender and Receiver dropdowns list only people who sent or received kudos.
- [ ] Status, date range, search and the two dropdowns combine.
- [ ] No match shows an empty state with a way to clear the filters.

### US003 — Mark a kudo as Spam

**Actor:** Admin
**Goal:** Hide a kudo that breaks the community standards.
**Business value:** Keeps the live board clean and enforces the standards.

**Acceptance Criteria:**
- [ ] The row's pill changes to Spam and its menu then offers Public.
- [ ] The kudo disappears from the live board, profile lists and counts.
- [ ] The decision cannot be applied twice; a second click changes nothing (Codex R13).
- [ ] If another admin changed the kudo after I loaded the table, my decision is refused, the row shows the current status and I am told (Codex R13).

### US004 — Mark a kudo as Public

**Actor:** Admin
**Goal:** Restore a kudo that was flagged by mistake.
**Business value:** Corrects errors so honest recognition is not lost.

**Acceptance Criteria:**
- [ ] The row's pill changes to Public and the kudo returns to the live board.
- [ ] The author's overlay stops appearing.
- [ ] Restoring never sends a level-up notice, even when it lifts the receiver into a new tier; the badge simply follows (Codex N05).

### US005 — Be warned about a hidden kudo

**Actor:** Author
**Goal:** Learn that my kudo was marked Spam.
**Business value:** The author understands the rule and does not repeat the mistake.

**Acceptance Criteria:**
- [ ] A spam-warning notification arrives once per marking, with a link to the community standards.
- [ ] It never names the admin or anyone else.

### US006 — See why my kudo is hidden

**Actor:** Author
**Goal:** Open my kudo and read why it is hidden.
**Business value:** Makes the decision transparent and points to the rules.

**Acceptance Criteria:**
- [ ] The overlay appears on my own Spam kudo, with a link to Tiêu chuẩn cộng đồng and a close control.
- [ ] Nobody but me sees it; it is gone once the kudo is Public.

## 8. Scenarios

### US001 — Happy Path

**Given** 45 kudos, **When** the admin opens Review content, **Then** the newest 20 show with a pager of three pages.

### US001 — Error: not an admin

**Given** a signed-in Sunner without the admin role, **When** the Sunner opens the Review address, **Then** the "no access" page appears and no kudo data is sent.

### US002 — Happy Path

**Given** the admin picked Sender "An" and Status Spam, **When** the table reloads, **Then** only An's Spam kudos show, from page 1.

### US002 — Error: nothing matches

**Given** a search that matches no kudo, **When** the table reloads, **Then** "no kudo matches" appears with a Clear filters link.

### US003 — Happy Path

**Given** a Public kudo, **When** the admin chooses Mark as Spam, **Then** the pill reads Spam, the kudo leaves the live board and its author gets a warning.

### US003 — Error: already decided

**Given** two admins have the same kudo open, **When** both choose Mark as Spam, **Then** the author gets one warning and the second admin's decision is refused as stale, their row refreshes to Spam and a short message says the kudo was changed (Codex R13).

### US003 — Error: opposing stale decision

**Given** admin X marked a kudo Spam after admin Y loaded it as Public, **When** Y later chooses Mark as Public on the old row — or, the other way round, Y chooses Mark as Spam on a row X has since restored to Public — **Then** Y's decision is refused, the kudo keeps X's status, and Y's row refreshes with a message (Codex R13).

### US003 — Error: kudo does not exist

**Given** a kudo id that matches no kudo, **When** Mark as Spam is sent for it, **Then** it is refused as not found (404), nothing changes and no warning is sent (C03, Codex N08).

### US004 — Happy Path

**Given** a Spam kudo, **When** the admin chooses Mark as Public, **Then** the pill reads Public and the kudo shows on the live board again.

### US004 — Error: action cannot be saved

**Given** the database does not answer, **When** the admin chooses Mark as Public, **Then** a short error appears and the row keeps its old status.

### US004 — Error: kudo does not exist

**Given** a kudo id that matches no kudo, **When** Mark as Public is sent for it, **Then** it is refused as not found (404) and nothing changes (C03, Codex N08).

### US005 — Happy Path

**Given** a kudo was just marked Spam, **When** its author opens the notification panel, **Then** a warning with a "Tiêu chuẩn cộng đồng" link is there.

### US005 — Error: warning cannot be created

**Given** the notification step fails or stalls for more than 2 seconds, **When** the admin marks a kudo Spam, **Then** the kudo is still Spam and the admin sees the normal success (Codex R23).

### US006 — Happy Path

**Given** my kudo is Spam, **When** I open it, **Then** an alert says it was hidden for breaking the community standards, with the link.

### US006 — Error: someone else's spam kudo

**Given** a kudo of another Sunner is Spam, **When** I open its address, **Then** I see the not-found page, not the alert.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Page number beyond the last page | Last page shown | None — silent handling |
| Date range reversed or malformed in the address | Date filter ignored | None — silent handling |
| Search text has % or _ | Treated as plain characters | None — silent handling |
| Two admins decide the same kudo together (same or opposite decisions) | First decision wins; the second is refused as stale and changes nothing (Codex R13) | Row refreshes to the current status with a short message, e.g. "This kudo was just changed by another admin." *(copy to confirm)* |
| Admin double-clicks a decision | The action is disabled while saving; one change and at most one warning (Codex R13) | None — the row shows the new status |
| Kudo no longer exists when the action runs (or a made-up kudo id is sent directly) | Refused as "kudo not found" (404); nothing changes; table refreshes and the row disappears (C03, Codex N08) | None — silent handling |
| An admin restores a kudo to Public at the same moment a colleague sends its receiver another kudo | The two saves run one after the other; the receiver's badge follows on the next view; the restore never sends a level-up notice, and the new kudo sends one only if it alone lifts the receiver into a new tier — a repeat sender never does (Codex N05) | None |
| Admin marks their own kudo as Spam | Status changes; no warning to themselves | None |
| Admins flip a kudo Spam → Public → Spam while the first warning is unread | Each step is a real change with a new version; the unread warning is refreshed, not duplicated (Codex R13) | None |
| Kudo has no hashtags | Hashtags cell shows a dash | None — dash shown |
| Non-admin calls an admin address or action directly | Refused, nothing changed | "You do not have access to this page." *(copy to confirm)* |
| Query or action fails | Inline error with Retry; row unchanged | "Could not load the data. Try again." *(copy to confirm)* |

## 10. Edge Behaviours to Verify

- **FR-101** → anonymous kudo shows real sender with a marker; a kudo without hashtags shows a dash.
- **FR-102** → 45 kudos give three pages, newest first; page 9 shows page 3.
- **FR-206** → changing any filter returns to page 1; reloading the address shows the same table.
- **FR-204** → a kudo created on the last day of the range is listed; one the day after is not.
- **FR-301** → after marking Spam the kudo is absent from the live board for another Sunner.
- **FR-302** → after marking Public the kudo is back on the board.
- **FR-303** → exactly one warning per marking, never two for a repeated click; a stalled warning step still returns success to the admin within 2 seconds (Codex R23).
- **FR-304** → the author and an admin can still open the Spam kudo; another Sunner gets "not found".
- **FR-401** → the author sees the alert; an admin sees only the plain notice.
- **FR-601** → a user-role account is refused on the page, on the people list and on both decisions.
- **FR-602** → after a decision the kudo shows who decided and when, and its moderation version went up by one (checked in the database).
- **FR-603** → opposing stale decisions are refused and the row refreshes; Spam → Public → Spam with fresh versions works; a double click writes once (Codex R13).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | The notification design has outcomes Hợp lệ / Tạm ẩn / Reject and a "kudos need review" notice that this feature's two-status model does not produce | Rework in F009 or F011 if a pending or third status is wanted | Closed — notice dropped, kudos publish Public immediately, admins use the Review page (G10) |
| RISK-02 | risk | Admins read every kudo including real senders of anonymous ones; a missing role check on a decision or list address would leak identities or let anyone hide kudos | Exposure of anonymous senders; unauthorised hiding | [EXPECTED] mitigated by BR-007: F002's `RequireAdmin` checks `users.role` on every `/api/v1/admin/...` call (Codex R05); browser roles have no table access |
| RISK-05 | risk | A stale decision (made on an old view of the row) could overwrite a newer one — e.g. re-hiding a kudo another admin just restored | Wrong visibility, confusing warnings | Mitigated — versioned compare-and-set, 409 `stale_decision` with the current row (BR-002, FR-603, Codex R13) |
| RISK-03 | risk | Overlay copy, menu content and Vietnamese text are not read from the design | Wording and small layout changes late in build | Open — English from design notes, Vietnamese to be supplied before release (D014, AD11) |
| RISK-04 | risk | Hearts and secret boxes earned on a kudo later marked Spam may keep inflating levels | Unfair rewards, rework in F008 | Accepted — earned hearts and boxes stay (D006, AD11) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002_GoogleAuth | feature | `users.role` (seeded by email) via F002's shared auth context and `RequireAdmin` middleware — the only role source (Codex R05); `/admin/*` gate; `users` data | FR-601 |
| F010_AdminOverviewUsers | feature | admin header with the Review content link, date range picker and pager | FR-101, FR-204 |
| F005_KudoCompose | feature | owns `kudos`, `hashtags`; writes only `public`; blocks editing of Spam kudos | FR-301, FR-304 |
| F006_KudosLiveBoard | feature | hides Spam kudos, admits only author and admins to the detail page, hosts the overlay slot | FR-304, FR-401 |
| F007_SunnerProfile | feature | hides Spam kudos from profile lists and counts | FR-304 |
| F009_NotificationCenter | feature | shared Go `NotificationService.Create`, called after commit for the spam warning | FR-303 |
| F004_StaticEventContent | feature | Community Standards page the overlay links to | FR-402 |
| F008_KudosGamification | feature | hearts and boxes on kudos that become Spam | D006 |

## 13. Configuration

```text
REVIEW_PAGE_SIZE     = 20                  # rows per page (proposed)
EXCERPT_LENGTH       = 120                 # characters of body shown in the Content column (proposed)
PEOPLE_OPTIONS_LIMIT = 20                  # people shown in the Sender / Receiver lists (proposed)
REPORT_TIME_ZONE     = Asia/Ho_Chi_Minh    # where a "day" starts and ends for the date filter (proposed)
```
