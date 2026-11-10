---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P2
**Type**: mixed

## 1. Overview

**Problem:** Things happen to a Sunner while they are elsewhere on the site (someone sends them a kudo, hearts their kudo, a Secret Box is earned, a hero level is reached, a kudo is flagged), and without one place that tells them, they miss rewards and warnings.
**Solution:** A notification centre behind the header bell. The bell shows a dot when something is unread; the panel "Thông báo" lists notifications newest first with a type icon, a short message and a relative time, marks unread ones with a dot, and offers "Đánh dấu đọc tất cả" and "Xem tất cả". Opening a notification shows its full message and takes the Sunner to the right place (Secret Box, Community Standards, a kudo). Other features raise notifications through one shared, system-only entry point (the backend notification service, called after the triggering action is saved); this feature owns the stored notifications and that entry point.
**Scope:** Notification records and their kinds; the shared way other features create a notification; unread signal for the bell; the panel, the list, the detail view; marking one or all as read; who may see what.
**Non-Scope:** The bell button itself and its dot slot (F001); deciding when an event happens (heart rules, Secret Box grant, icon completion and the level tiers belong to F008; kudo creation and detecting a hero level rise belong to F005 (Codex N04); the spam flag belongs to F011); the Secret Box overlay (F008); the Community Standards page (F004); kudo detail (F006); email, push or mobile notifications; notification preferences or muting; deleting a notification; authoring screens for custom messages.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A signed-in employee taking part in SAA 2025 | Notice and act on events about their own kudos, rewards and warnings |
| System (other features) | F005, F008, F011 raising events | Tell the right Sunner something happened, without blocking their own work |

This feature is fed by F005, F008 and F011 and is opened from the F001 header bell.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Get notified of events about me | See the bell dot when something is unread; receive notifications for kudos, hearts, Secret Boxes, level-ups, collected icons and warnings | US001, US006 | FR-001, FR-002, FR-003, FR-205, FR-404, FR-602, FR-603 | BR-001, BR-002, BR-003, BR-004, BR-006, BR-007 | TBD (draft) |
| CAP-02 | Read and manage my notifications | Browse the list, open one, follow its link, mark one or all as read, see older ones | US002, US003, US004, US005 | FR-004, FR-101, FR-102, FR-103, FR-201, FR-202, FR-203, FR-204, FR-206, FR-401, FR-402, FR-403, FR-405, FR-601 | BR-001, BR-005, DEC-001, DEC-002, DEC-003, SM-001 | TBD (draft) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | What does "Xem tất cả" do? | Loads the full history in the same panel (older items appended as the Sunner scrolls); no separate page — resolved (applied default AD09) | The design shows one panel and no other notification page | no |
| D002 | What does the "View thông báo" detail view contain? | A window over the panel with the full message, absolute time and one action button where a target exists — resolved (applied default AD09) | Only the frame name is known; content not readable in the survey notes | no |
| D003 | Who gets "Có <x> lời nhắn cần bạn xem xét!" and what do Hợp lệ / Tạm ẩn / Reject do? | Nobody: the admin review notice and its Hợp lệ / Tạm ẩn / Reject buttons are dropped and the review-request kind is removed; kudos publish as Public immediately and admins use the F011 Review page — resolved (G10) | F011 only has Public and Spam; the notice had no producer and no matching outcomes | no |
| D004 | Is the recipient notified when someone sends them a kudo? | Yes, naming the sender unless the kudo is anonymous; F005's kudo service calls the shared notification service after the kudo is saved, best-effort — resolved (applied default AD09) | The design shows this message kind; F005 currently has no notification step | no |
| D005 | One notification per heart, or merged? | Merge per kudo while the earlier one is still unread — resolved (applied default AD09) | Avoids a flood on popular kudos; the text carries no count | no |
| D006 | Is a Sunner notified when mentioned in a kudo? | No — resolved (applied default AD09) | Matches F005 D009; not in the design | no |
| D007 | Who writes "other generic gift/greeting messages"? | Nobody in the first release; the kind exists and can be seeded by the team, with no authoring screen — resolved (applied default AD09) | No admin screen for it exists in the design | no |
| D008 | Where do level-up and "collected all 6 icons" notifications lead? | To the Sunner's own profile (F007) — resolved (applied default AD09) | The profile header shows the collected icons; per F007 D006 it shows no hero-level badge, so the level-up notice still leads to the own profile, where the Sunner's kudo cards show hero badges (Codex N10); design not captured | no |
| D009 | How long are notifications kept? | Kept indefinitely; the list is paged — resolved (applied default AD09) | Smallest design; volume per Sunner is small | no |
| D010 | How does the bell learn about new notifications? | Refreshes when the window regains focus and every 60 seconds; live push is optional later — resolved (applied default AD09) | Simple and enough for a one-event site | no |
| D011 | Does opening the panel mark items as read? | No — only opening an item or "Đánh dấu đọc tất cả" does — resolved (applied default AD09) | Keeps the unread dots meaningful | no |
| D012 | Exact wording and English translations | Vietnamese text as observed; English drafted by the team and confirmed before release — resolved (applied default AD09) | Only some messages were captured in the survey | no |
| D013 | Which notification kinds go straight to their target instead of the detail view? | Only the Secret Box notice (opens the Secret Box flow); the others open the detail view — resolved (applied default AD09) | Screen flow shows Secret Box and spam warning branches; spam warning link is inline text | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A notification belongs to one recipient and records its kind, the values needed for its message, an optional link to a kudo, whether it has been read, and when it happened.
- **FR-002** Notifications come in exactly seven kinds: kudo received (`kudo_received`), kudo hearted (`heart_received`), Secret Box received (`secret_box_received`), hero level reached (`hero_level_up`), kudo breaks community standards (`kudo_spam_warning`), all 6 icons collected (`icons_completed`), and a generic message (`generic`). There is no review-request kind (G10) and no kind named `spam_warning` (Codex R14).
- **FR-003** Other features create notifications only through one shared backend entry point (the Go `NotificationService.Create`; no database function), called after their own action is saved and limited to 2 seconds of its own, separate from the request; a failure or timeout there is logged and never blocks or changes the successful result of the action that caused it (Codex R14, R23).
- **FR-004** Message text is built from the kind and its values in the language the Sunner is reading, not stored as a fixed sentence (except the generic kind).

### Navigation (1xx)

- **FR-101** The header bell opens the notification panel over the current page.
- **FR-102** Selecting a notification opens its detail view (or goes straight to its target when D013 says so).
- **FR-103** A notification leads to its natural target: Secret Box notice to the Secret Box flow, spam warning to Community Standards (inline link) and to the flagged kudo (action button, where F011's alert overlay shows), kudo-related notices to that kudo, level and icon notices to the own profile.

### Panel and detail (2xx)

- **FR-201** The panel is titled "Thông báo" and offers "Đánh dấu đọc tất cả" and "Xem tất cả".
- **FR-202** Each item shows a type icon, the message and a relative time ("2 giờ trước", "1 ngày trước", "3 tháng trước"); unread items also show a dot.
- **FR-203** Items are listed newest first.
- **FR-204** The panel shows a loading state, an empty state when there is nothing, and an error state with retry.
- **FR-205** The bell shows a dot when at least one notification is unread and none when all are read.
- **FR-206** The detail view shows the full message, the time, any link inside the message and one action button to the target.

### Interaction (4xx)

- **FR-401** Opening a notification marks it as read.
- **FR-402** "Đánh dấu đọc tất cả" marks every unread notification of the Sunner as read and clears the bell dot.
- **FR-403** The list loads in pages; "Xem tất cả" and scrolling bring older notifications.
- **FR-404** A new notification makes the bell dot appear without a full page reload, within the refresh interval.
- **FR-405** If marking as read fails, the detail view (or Secret Box flow) still opens, the notification stays unread with its dot, and the Sunner is told — the same in the panel and the detail view (Codex R19).

### Security (6xx)

- **FR-601** Only signed-in Sunners can read notifications, and only their own.
- **FR-602** Sunners cannot create, edit or delete notifications; only the system creates them, and reading state is the only thing a Sunner can change.
- **FR-603** A notification about an anonymous kudo never reveals who sent it, including a kudo its author turns anonymous after the notification was created; already-created notices, read or unread, stop showing the sender from then on (Codex R02). A notice saved while or after the kudo is anonymous is checked against the kudo itself at the moment it is saved and is stored without the sender, so it stays without the sender even if the kudo is later made named again (Codex N01).

## 5. Business Rules

- A Sunner can see and change the read state of only their own notifications (BR-001)
- A notification about an anonymous kudo never names or points to its sender (BR-002)
- A Sunner is not notified about their own action (BR-003)
- While an earlier unread notification of the same event exists for the same Sunner, a repeat updates it instead of adding another; a hero level reached and "all 6 icons collected" are told at most once per Sunner (per level), ever, even after the first notice was read (BR-004, Codex N03)
- Read is one-way; a read notification never becomes unread (BR-005)
- A failure to create a notification never blocks the kudo, heart, box or flag that triggered it (BR-006)
- A notification about a kudo that is anonymous now never shows its sender: a notice saved while the kudo is anonymous is stored without the sender (Codex N01), turning a kudo anonymous removes the sender from its existing notifications, and every read hides the sender again by the kudo's current setting; turning anonymity off does not bring names back, to old or later-saved notices, and a name the recipient already saw cannot be taken back (BR-007, Codex R02, N01)
- An item shows an unread dot while it is unread, and the bell shows its dot while any item is unread (DEC-001)
- Selecting an item goes to the Secret Box flow for a Secret Box notice and opens the detail view for every other kind (DEC-002)
- The panel shows the list when there is at least one notification, otherwise the empty message (DEC-003)
- A notification moves from unread to read and stays read (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Notification panel (Tất cả thông báo, `589:9132`) | TBD (draft) | Title "Thông báo", mark-all and see-all actions, items with icon, text, relative time and unread dot | Mark all read, open an item, load older items, close |
| Notification detail (View thông báo, `589:9152`) | TBD (draft) | Full message, time, inline link and action button for the notification | Follow the link or action, close |

### User Journey

1. A Sunner browsing the site sees a dot on the bell.
2. They click the bell; the panel lists newest notifications, unread ones marked with a dot.
3. They click one, for example a kudo notice; the detail view opens and the notification is now read.
4. They follow the action to the kudo, or close the detail view and come back to the panel.
5. For a Secret Box notice they go straight to opening the box; for a spam warning they follow "Tiêu chuẩn cộng đồng" to the rules.
6. With many unread items they press "Đánh dấu đọc tất cả" and the dots disappear, bell included.

## 7. User Stories

### US001 — Notice that something is unread

**Actor:** Sunner
**Goal:** See from any page that I have unread notifications.
**Business value:** Rewards and warnings are not missed.

**Acceptance Criteria:**
- [ ] The bell shows a dot while any notification is unread and none otherwise.
- [ ] A notification created while I am on the site makes the dot appear without reloading.

### US002 — Browse my notifications

**Actor:** Sunner
**Goal:** Open the panel and read what happened.
**Business value:** One place to catch up on kudos, hearts and rewards.

**Acceptance Criteria:**
- [ ] Items are newest first with icon, text and relative time.
- [ ] Unread items have a dot; read ones do not.
- [ ] I see an empty message when I have none, and an error with retry when loading fails.

### US003 — Open a notification

**Actor:** Sunner
**Goal:** Read one notification in full and go where it points.
**Business value:** Turns a message into the next action (open a box, read the rules, view a kudo).

**Acceptance Criteria:**
- [ ] Opening an item marks it read; if that fails, the detail still opens, the dot stays and I am told (Codex R19).
- [ ] A Secret Box notice leads to the Secret Box flow; a spam warning links to Community Standards.
- [ ] Other items open the detail view with an action to the target.

### US004 — Mark everything as read

**Actor:** Sunner
**Goal:** Clear all unread dots in one step.
**Business value:** Saves effort when many notifications pile up.

**Acceptance Criteria:**
- [ ] "Đánh dấu đọc tất cả" marks every unread item read and clears the bell dot.
- [ ] If it fails, items stay unread and I see a message.

### US005 — See older notifications

**Actor:** Sunner
**Goal:** Go back through older notifications.
**Business value:** Past rewards and warnings stay findable.

**Acceptance Criteria:**
- [ ] "Xem tất cả" shows the full history in pages.
- [ ] Relative times keep reading naturally ("3 tháng trước").

### US006 — Be told about events concerning me

**Actor:** Sunner
**Goal:** Get a notification when someone sends me a kudo, hearts my kudo, I earn a Secret Box, reach a new hero level, collect all 6 icons, or my kudo breaks community standards.
**Business value:** Closes the reward loop and delivers moderation warnings.

**Acceptance Criteria:**
- [ ] Each of those events produces one notification for the right Sunner.
- [ ] A kudo-received notice for an anonymous kudo does not name the sender, also when the sender made the kudo anonymous after I was notified (Codex R02).
- [ ] I am never notified about my own action.
- [ ] I am told about reaching a hero level, and about collecting all 6 icons, at most once each, ever — even if I read the first notice and later reach the same level again (Codex N03).
- [ ] A hero level notice names the level I reached and my number of distinct senders, in Vietnamese and in English (Codex N04).

## 8. Scenarios

### US001 — Happy Path

**Given** I have one unread notification, **When** I view any page, **Then** the bell shows a dot.

### US001 — Error: count cannot be loaded

**Given** the unread check fails, **When** the page loads, **Then** the bell keeps its last known state and the page is unaffected.

### US002 — Happy Path

**Given** I have three notifications, **When** I click the bell, **Then** the panel lists them newest first, unread ones with a dot.

### US002 — Error: list fails

**Given** the list cannot be loaded, **When** I open the panel, **Then** it shows an error message with a retry button.

### US003 — Happy Path

**Given** an unread "kudo hearted" notification, **When** I open it, **Then** the detail view shows the full message and the item is read.

### US003 — Error: mark-read fails

**Given** the network drops as I open an item, **When** it cannot be marked read, **Then** the detail still opens, the item stays unread with its dot and I am told — whether I opened it from the panel or am looking at the detail view (Codex R19).

### US004 — Happy Path

**Given** five unread notifications, **When** I press "Đánh dấu đọc tất cả", **Then** all dots and the bell dot disappear.

### US004 — Error: mark-all fails

**Given** the request fails, **When** I press it, **Then** the dots stay and a message says it did not work.

### US005 — Happy Path

**Given** more notifications than the panel first shows, **When** I press "Xem tất cả" and scroll, **Then** older notifications load.

### US005 — Error: older page fails

**Given** loading older items fails, **When** I scroll to the end, **Then** the loaded items stay and a retry appears at the end.

### US006 — Happy Path

**Given** another Sunner hearts my kudo, **When** the heart is saved, **Then** I get "Wow! Lời nhắn gửi của bạn cho Sunner <tên> vừa nhận thêm lượt tim!".

### US006 — Error: notification cannot be created

**Given** creating the notification fails or the database stalls for more than 2 seconds, **When** someone hearts my kudo, **Then** the heart is still saved, the person who hearted gets the normal success response, and nothing is shown to them (Codex R23).

### US006 — Edge: kudo made anonymous after I was notified

**Given** I received a named kudo and its notice (one read, one still unread), **When** the sender edits the kudo to anonymous, **Then** both notices show no sender from my next load on; making it named again does not bring the name back; what I already saw cannot be recalled (Codex R02).

### US006 — Edge: notice saved late, after the kudo became anonymous

**Given** a named kudo whose notice is saved only after the sender has already made it anonymous, **When** the sender later makes it named again and I open my notifications, **Then** neither notice shows the sender (Codex N01).

### US006 — Edge: same hero level reached twice

**Given** I reached the Rising level, got the notice and read it, and then dropped below Rising after a kudo was moderated, **When** a new kudo brings me back to Rising, **Then** I get no second Rising notice (Codex N03).

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Panel list fails to load | Error state with retry; bell keeps last known dot | "Không tải được thông báo. Thử lại" (wording pending D012) |
| Same Sunner hearted many times before reading | One unread item is updated and moved to the top (BR-004) | None — silent handling |
| Notification's kudo was later hidden as spam or removed | Detail still shows the text; the action button explains the kudo is not available | "This kudo is no longer available." |
| Two tabs open; read in one | The other tab keeps the dot until its next refresh | None — silent handling |
| Session expires while marking read | Nothing changes; Sunner is asked to sign in | "Your session has expired. Please sign in again." |
| No notifications at all | Empty state replaces the list; mark-all is disabled | "Bạn chưa có thông báo nào" (wording pending D012) |
| Sunner reads the site in the other language | Item text re-renders in the chosen language; generic messages stay as written | None — silent handling |
| Notification time is slightly in the future (clock difference) | Shown as just now | "Vừa xong" |
| Anonymous kudo received | Message names no sender | "Bạn vừa nhận được một Kudo" (wording pending D012) |
| Sender turns a kudo anonymous after I was notified (read or unread notice) | The sender is removed from the stored notice and hidden again on every read (BR-007, Codex R02) | Same as anonymous kudo received |
| A notice is saved at the same moment the sender makes the kudo anonymous | Saving the notice waits for the edit and checks the kudo itself; if the kudo is anonymous then, the notice is stored without the sender; if the notice was saved first, the edit removes the sender (BR-007, Codex N01) | Same as anonymous kudo received |
| Sender turns an anonymous kudo back to named | Old notices, and notices saved while it was anonymous, stay without the sender (Codex R02, N01) | None — silent handling |
| I reach a hero level I was already told about (after reading that notice and dropping below it) | No second notice for that level (BR-004, Codex N03) | None — silent handling |
| Opening an item while mark-read fails | Detail (or Secret Box flow) opens; dot stays (Codex R19) | Short failure message (wording pending D012) |
| Sunner hearts or sends to themselves | No notification is created (BR-003) | None — silent handling |
| A new kudo is published | It is Public at once; no admin review notice is created (D003) | None — silent handling |

## 10. Edge Behaviours to Verify

- **FR-003** → A failing notification step leaves the kudo, heart, box or flag saved.
- **FR-202** → Unread items show a dot; "2 giờ trước", "1 ngày trước" and "3 tháng trước" style times appear.
- **FR-203** → A newer notification appears above an older one.
- **FR-205** → Bell dot appears with one unread and disappears when the last is read.
- **FR-401** → Opening an item turns its dot off.
- **FR-402** → Mark-all clears every dot and the bell dot in one step.
- **FR-403** → Older notifications load page by page.
- **FR-404** → A notification created while the site is open lights the bell within a minute.
- **FR-405** → A failed mark-read still opens the detail, leaves the dot and shows a message, in both panel and detail (Codex R19).
- **FR-601** → Another Sunner's notification cannot be opened or marked read.
- **FR-602** → A Sunner cannot create or edit a notification by calling the service directly.
- **FR-603** → An anonymous kudo's notification shows no sender name; after a named kudo is edited to anonymous, its read and unread notices show no sender (Codex R02); named create → anonymous edit → late notice saved → edit back to named → neither notice shows the sender (Codex N01).
- **FR-002** → Reach a hero level → read the notice → drop below it → reach it again: still one notice for that level (Codex N03).
- **FR-004** → A hero level notice raised by F005's kudo create shows the level name and senders count in Vietnamese and English (Codex N04).
- **FR-003** → A notification step that stalls returns the triggering action's success within its 2-second bound (Codex R23).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Each producing Go service (F005 kudo and hero level (Codex N04), F008 hearts/boxes/icons, F011 spam flag) must remember to call `NotificationService.Create` after commit; one that forgets fails silently | Missing notifications nobody notices | [INFERRED] |
| RISK-02 | risk | Anonymous kudos: the notification must not copy the sender's name or id into its values; a later switch to anonymous must not leave the name in old notices | Leaks an anonymous sender to the recipient | Mitigated — anonymity checked under a kudo row lock when the notice is saved (Codex N01), redaction in F005's edit transaction plus re-mask on read (BR-007, Codex R02); already-seen names cannot be recalled (accepted limitation) |
| RISK-03 | risk | The review notice (Hợp lệ / Tạm ẩn / Reject) did not match F011's Public/Spam outcomes | Rework in F009 or F011 | Closed — notice and kind removed (G10) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_AppShellI18n | feature | Bell button and dot slot, language choice for message text | FR-101, FR-004, FR-205 |
| F002_GoogleAuth | feature | Signed-in session and own identity (Supabase access token verified by the Go backend) | FR-601 |
| F004_StaticEventContent | feature | Community Standards page that the spam warning links to | FR-103 |
| F005_KudoCompose | feature | Creates the kudo that triggers a kudo-received notification and detects the receiver's hero level rise, raising `hero_level_up` with `{receiverId, fromTier, toTier, sendersCount}` (Codex N04) (its Go service calls the notification service after commit); owns anonymity flag; its edit holds the kudo row lock and removes sender fields from existing notices when a kudo turns anonymous (Codex R02, N01) | FR-003, FR-603, BR-002, BR-004, BR-007, D004 |
| F006_KudosLiveBoard | feature | Kudo detail that kudo-related notices link to | FR-103 |
| F007_SunnerProfile | feature | Own profile that level and icon notices link to (no hero badge in its header, F007 D006 — Codex N10) | FR-103, D008 |
| F008_KudosGamification | feature | Triggers hearts, Secret Box and icons-completed notifications; defines the hero tiers F005 uses; hosts the Secret Box flow | FR-003, FR-103 |
| F011_AdminKudoModeration | feature | Triggers the spam warning | FR-003 |
| Go backend (`backend/`) | internal-service | Owns the notification service and the `/api/v1/me/notifications` endpoints; checks the signed-in Sunner on every call | FR-003, FR-601, FR-602 |
| Supabase Postgres | external-service | Stores notifications; only the Go backend reads or writes them (RLS deny-all for browser roles) | FR-001, FR-601 |

## 13. Configuration

```text
NOTIFICATIONS_PAGE_SIZE = 20          # items per page in the panel (assumed)
UNREAD_REFRESH_INTERVAL_MS = 60000    # bell refresh while the site is open, see D010 (assumed)
```
