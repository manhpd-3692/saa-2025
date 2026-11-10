---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P2
**Type**: ui

## 1. Overview

**Problem:** After sending and receiving kudos, a Sunner has no place to see their own recognition record (kudos received and sent, hearts, collected icons) and no way to look at a teammate's. Kudo cards show names and avatars, but pressing them leads nowhere.
**Solution:** A profile page per Sunner. It shows who the person is (avatar, name, unit), the icons they have collected, a block of counts (kudos received, kudos sent, hearts received, secret boxes), and a list of their kudos that can be switched between received and sent. A Sunner reaches their own profile from the avatar menu and a teammate's profile by pressing an avatar on a kudo card. Their own profile also offers the "Mở Secret Box" button; a teammate's profile is read-only.
**Scope:** Own profile page; other-Sunner profile page; the received/sent filter of the kudos list; counts shown on the page; visibility of anonymous and hidden kudos on these pages.
**Non-Scope:** The kudo card itself, the Live board and kudo detail (Kudos Board feature); hearts, hero-badge tiers, secret-box opening and the icon set (Gamification feature); writing kudos (Write Kudos feature); the header avatar menu (App Shell feature); sign-in and roles (Auth feature); the admin user directory (Admin features); editing profile data (name, avatar and unit come from sign-in and seed data, no edit screen is designed).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A signed-in Sun* employee, either viewing their own profile or a teammate's | See their own recognition record, or learn what a teammate has given and received |
| Admin | A Sunner with the admin role; same profile pages | Same as Sunner; also sees the real sender of anonymous kudos (see BR-001) |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | View my own profile | See my identity, collected icons, counts and kudos (received or sent), and start opening a secret box | US001, US002, US005 | FR-001, FR-002, FR-101, FR-105, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-401, FR-402, FR-403, FR-404 | BR-005, DEC-002 | Profile bản thân (code TBD (draft)) |
| CAP-02 | View a teammate's profile | Open a teammate's profile from a kudo avatar and browse their kudos without being able to act on their box | US003, US004 | FR-102, FR-103, FR-104, FR-301, FR-302 | BR-004, DEC-001 | Profile người khác (code TBD (draft)) |
| CAP-03 | Keep anonymity and visibility rules on profiles | Trust that anonymous senders and hidden kudos stay hidden on every profile page | US006 | FR-601, FR-602, FR-603, FR-604, FR-605 | BR-001, BR-002, BR-003 | — |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Does a teammate's profile show secret-box figures (opened / unopened)? | No: only the collected icons, kudos counts and hearts are shown; the secret-box figures and button appear on one's own profile only — resolved (applied default AD07) | Design says the layout is the same but read-only; box inventory is personal and drives an action the viewer cannot take | no |
| D002 | On my own lists, is an anonymous kudo I sent shown with its sender masked, like for everyone else? | Yes, masked the same way by the one shared backend mask; one rule for every non-admin viewer — resolved (applied default AD07) | Matches the cross-feature anonymity rule; avoids a second code path; the sender can still recognise their own kudo by title | no |
| D003 | Does a teammate's "sent" list and "kudos sent" count include their anonymous kudos? | No: they are left out for everyone except admins — resolved (applied default AD07) | Otherwise visiting a profile reveals who sent an anonymous kudo | no |
| D004 | Which filter is selected when a profile opens? | "Đã nhận" (received) — resolved (applied default AD07) | A profile is first of all a record of recognition received; design shows the list unfiltered at first | no |
| D005 | How is the kudos list paged? | Newest first, 10 per page, a "load more" control appends the next page — resolved (applied default AD07) | Design shows one list only; no paging control is visible at survey resolution | no |
| D006 | Does the profile header also show the hero-tier badge (New / Rising / Super / Legend) beside the name? | Only the row of collected icons is shown; the tier badge is added when design confirms its place — resolved (applied default AD07) | Hover frames for tiers exist, but their host screen is not confirmed. Re-confirmed after the Codex review: no profile-header hero badge; hero badges stay on kudo cards (F006) only | no |
| D007 | Are hidden (spam) kudos excluded from the owner's own list and counts too? | Yes, for every viewer; admins review them in moderation — resolved (applied default AD07) | One simple rule; owners are warned through notifications, not through their profile | no |
| D008 | Does "hearts received" include the campaign multiplier (for example x2)? | Yes: it shows the Gamification feature's weighted total (each heart at the weight fixed when it was given) summed over the kudos the Sunner received; the profile never recomputes it — resolved (applied default AD07; weighted total per G08) | That feature owns hearts logic; one heart number everywhere | no |
| D009 | When I have no unopened box, is "Mở Secret Box" hidden or disabled? | Disabled, with the unopened count 0 shown beside it — resolved (applied default AD07) | Keeps the layout stable and explains why nothing happens | no |
| D010 | Does an admin viewing a teammate's profile see anonymous senders and anonymous kudos in "sent"? | Yes, the real sender is shown to admins only — resolved (applied default AD07; G04) | Follows the shared anonymity rule (non-admin viewers are masked) | no |
| D011 | Final Vietnamese and English wording of labels, empty states and error messages | English wording in § 9 and the screen specs is a placeholder; final copy is transcribed from design into the language dictionaries — resolved (applied default AD07) | Copy is not readable at survey resolution | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Every signed-in Sunner has a profile page showing avatar, name, unit, collected icons, a counts block and a kudos list.
- **FR-002** Own profile and a teammate's profile share one layout; only the actions differ.

### Navigation (1xx)

- **FR-101** The Profile entry of the avatar menu opens the Sunner's own profile.
- **FR-102** Pressing a Sunner's avatar on a kudo card opens that Sunner's profile (not when the sender is anonymous and masked).
- **FR-103** Opening one's own profile through a teammate-style link shows the own profile.
- **FR-104** Opening a profile of a Sunner who does not exist shows the Not-found page.
- **FR-105** Pressing a kudo card in the profile list opens that kudo's detail view.

### Own profile (2xx)

- **FR-201** The header block shows the avatar, name, unit code (for example CECV2, the unit's code kept by the Auth feature) and the row of icons the Sunner has collected (Codex R15).
- **FR-202** The counts block shows kudos received, kudos sent, hearts received, secret boxes opened and secret boxes unopened. Hearts received is the weighted heart total from the Gamification feature over the kudos the Sunner received (a heart given during a x2 campaign counts 2).
- **FR-203** The "Mở Secret Box" button opens the secret-box flow; it is available only while at least one unopened box exists.
- **FR-204** The KUDOS list shows the Sunner's kudo cards, newest first, a page at a time.
- **FR-205** A filter dropdown switches the list between kudos received and kudos sent.
- **FR-206** When the list has no kudos for the chosen filter, an empty-state message is shown instead of cards.

### Teammate's profile (3xx)

- **FR-301** A teammate's profile has no "Mở Secret Box" button and no unopened-box figure.
- **FR-302** The teammate's kudos list has the same received/sent filter and paging as one's own.

### Interaction (4xx)

- **FR-401** Changing the filter reloads the list from its first page without leaving the profile; the choice is kept in the address, so reloading or sharing the link keeps it.
- **FR-402** Pressing "load more" appends the next page below the cards already shown.
- **FR-403** The kudos counts follow the same visibility rules as the list, so the number always matches what the list can show.
- **FR-404** After the Sunner closes the secret-box flow, the counts and the collected icons on their own profile show the new state.

### Security (6xx)

- **FR-601** Profiles are open only to signed-in Sunners; an anonymous visitor is sent to Login.
- **FR-602** For viewers who are not admins, the sender of an anonymous kudo is never shown on a profile page and the masked avatar is not a link; nothing in the data or image links sent to their browser identifies the sender (Codex R01).
- **FR-603** A teammate's "sent" list and "kudos sent" count never include their anonymous kudos for viewers who are not admins.
- **FR-604** Kudos hidden as spam are neither listed nor counted on any profile.
- **FR-605** A profile never shows another person's email address or their secret-box inventory.

## 5. Business Rules

- Anonymous kudos hide their sender from every viewer except admins, on every card in a profile list (BR-001)
- A teammate's sent view and sent count leave out their anonymous kudos, except for admins (BR-002)
- Kudos marked as spam are left out of lists and counts (BR-003)
- A teammate's profile never offers secret-box actions or shows the unopened count (BR-004)
- The kudos list is ordered newest first and loaded 10 at a time (BR-005)
- Opening one's own id through the teammate address leads to the own profile (DEC-001)
- "Mở Secret Box" is enabled only when the Sunner has at least one unopened box (DEC-002)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Profile bản thân | TBD (draft) | Header with avatar, name, unit, collected icons; counts block with "Mở Secret Box"; KUDOS list with a received/sent filter | Open the secret-box flow; switch the filter; load more; open a kudo; hover an icon for its description |
| Profile người khác | TBD (draft) | Same layout without the secret-box button and unopened figure | Switch the filter; load more; open a kudo; hover an icon for its description |

The received/sent dropdown (Dropdown-filter đã nhận/gửi) is a region of both screens, not a screen of its own. The kudo card and the icon hover descriptions are owned by the Kudos Board and Gamification features.

### User Journey

1. A Sunner chooses Profile in the avatar menu and sees their own profile: avatar, name, unit, collected icons, counts.
2. The KUDOS list below shows kudos they received; they open the dropdown and pick "sent" to see what they gave.
3. They press a card and land on the kudo's detail view.
4. They press "Mở Secret Box"; the secret-box flow opens; when they close it the counts and icons refresh.
5. On the Live board they press a teammate's avatar and land on that teammate's profile, same layout, no box button.
6. If the sender of a kudo is anonymous, the avatar shows no real person and cannot be pressed.

## 7. User Stories

### US001 — See my own profile

**Actor:** Sunner
**Goal:** Open my profile and see my identity, my collected icons and my counts.
**Business value:** Shows me my recognition record and encourages taking part in the campaign.

**Acceptance Criteria:**
- [ ] The Profile entry of the avatar menu opens my profile with avatar, name, unit and collected icons.
- [ ] The counts show kudos received, kudos sent, hearts received, boxes opened and unopened.
- [ ] A new Sunner with no activity sees zeros and no icons, not an error.

### US002 — Browse my received and sent kudos

**Actor:** Sunner
**Goal:** Read the kudos I received and the ones I sent, switching between the two.
**Business value:** Lets me revisit the thanks I got and gave, which is the point of the campaign.

**Acceptance Criteria:**
- [ ] The list opens on the "received" filter (D004).
- [ ] Picking "sent" replaces the cards with kudos I sent, newest first.
- [ ] More cards load on request; an empty filter shows an empty-state message.

### US003 — Open a teammate's profile

**Actor:** Sunner
**Goal:** Open a teammate's profile by pressing their avatar on a kudo card.
**Business value:** Turns a name on a card into a person and spreads recognition beyond the single kudo.

**Acceptance Criteria:**
- [ ] Pressing a visible sender or recipient avatar opens that Sunner's profile.
- [ ] A profile id that does not exist shows the Not-found page.
- [ ] Opening my own id shows my own profile.

### US004 — Browse a teammate's kudos read-only

**Actor:** Sunner
**Goal:** Read the kudos a teammate received and sent, and see their icons and counts.
**Business value:** Lets colleagues see and celebrate each other's contributions.

**Acceptance Criteria:**
- [ ] The layout matches my own profile.
- [ ] There is no "Mở Secret Box" button and no unopened-box figure (D001).
- [ ] I can switch received and sent and load more.

### US005 — Start opening my secret box from my profile

**Actor:** Sunner
**Goal:** Press "Mở Secret Box" on my profile to open a box I earned.
**Business value:** Gives the reward loop a visible home on the profile.

**Acceptance Criteria:**
- [ ] The button is enabled when I have at least one unopened box and disabled otherwise (D009).
- [ ] Pressing it opens the secret-box flow defined by the Gamification feature.
- [ ] After closing the flow, my counts and icons show the new state.

### US006 — Anonymous kudos stay anonymous on profiles

**Actor:** Sunner
**Goal:** Be sure that a kudo sent anonymously never reveals its sender on any profile page.
**Business value:** Anonymous recognition only works if the promise holds everywhere, or people stop using it.

**Acceptance Criteria:**
- [ ] On a teammate's received list, an anonymous kudo shows no real sender and its avatar is not a link.
- [ ] A teammate's sent list and count do not include their anonymous kudos.
- [ ] An admin sees the real sender (D010).

## 8. Scenarios

### US001
- **Happy path:** Given a signed-in Sunner with 3 received kudos, 2 sent kudos and 6 hearts, When they open Profile from the avatar menu, Then they see their avatar, name, unit, icons and the counts 3, 2, 6 with the box figures.
- **Error:** Given the counts cannot be loaded, When the profile opens, Then the header still shows and the counts block shows an error message with a retry.

### US002
- **Happy path:** Given a Sunner on their profile, When they pick "sent" in the dropdown, Then the list shows the kudos they sent, newest first, and the address carries the choice.
- **Error:** Given the list request fails, When the filter changes, Then the old cards stay, an error message appears and the Sunner can retry.

### US003
- **Happy path:** Given a kudo card with a visible sender, When the Sunner presses the sender avatar, Then that sender's profile opens.
- **Error:** Given an id that matches no Sunner, When the address is opened, Then the Not-found page shows.

### US004
- **Happy path:** Given a teammate profile, When the Sunner views it, Then the layout matches their own profile without the secret-box button.
- **Error:** Given the teammate has no kudos for the chosen filter, When the list loads, Then the empty-state message shows.

### US005
- **Happy path:** Given 2 unopened boxes, When the Sunner presses "Mở Secret Box", Then the secret-box flow opens, and after closing, unopened shows 1.
- **Error:** Given 0 unopened boxes, When the Sunner looks at the button, Then it is disabled and pressing it does nothing.

### US006
- **Happy path:** Given an anonymous kudo received by Linh, When another Sunner opens Linh's profile, Then the card shows an anonymous sender and the sender avatar is not pressable.
- **Error:** Given Minh sent only anonymous kudos, When another Sunner opens Minh's profile and picks "sent", Then the list is empty and "kudos sent" shows 0.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Profile id does not exist | Not-found page shows | "Page not found." (wording from App Shell) |
| Sunner opens their own id via the teammate address | Redirected to their own profile | — |
| Sunner has no unit | Unit code is left out; layout does not shift | — |
| Sunner has no received or sent kudos for the filter | Empty-state message replaces the cards | "No kudos here yet." (wording pending) |
| Unopened box count is 0 | "Mở Secret Box" is disabled | — |
| Kudo became spam after the page loaded | Disappears on the next load; the count follows | — |
| Anonymous sender is the profile owner (sent filter, viewer is another Sunner) | Kudo is left out of list and count | — |
| Very many kudos | Pages of 10 load on request; counts stay exact | — |
| Session ends while on the page | Next list or count request sends the Sunner to Login | — |
| List request fails | Cards already shown stay; error message with retry | "Could not load kudos. Please try again." (wording pending) |

## 10. Edge Behaviours to Verify

- **FR-102** → an anonymous kudo's avatar does nothing when pressed; a visible one opens the profile.
- **FR-103** → opening one's own id through the teammate address ends on the own profile.
- **FR-104** → a made-up id shows Not-found, not an empty profile.
- **FR-203** → the button follows the unopened count: 0 disabled, 1 or more enabled.
- **FR-205** → changing the filter keeps the Sunner on the page, resets to the first page and changes the address.
- **FR-301** → no secret-box button or unopened figure on a teammate's profile.
- **FR-403** → the counts never exceed what the list can show for the same filter.
- **FR-404** → opening a box and closing the flow updates the counts without a manual reload.
- **FR-602** → no sender name, avatar or link for an anonymous kudo in any list as a non-admin; admin sees the sender.
- **FR-603** → a teammate who sent anonymous kudos shows no trace of them under "sent".
- **FR-604** → a kudo hidden as spam is absent from list and counts.
- **FR-605** → no email address and no box inventory of another person on screen.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Anonymity depends on every screen that reads kudos hiding the sender; profiles add two more read paths (received list, sent list) and a sent count | One leak on these pages reveals anonymous senders | Mitigated — one shared backend mask used by every kudo read (BR-001, BR-002, D003) |
| RISK-02 | risk | Counts and list are computed from the same data but at different moments, and gamification figures come from another feature | A count may briefly differ from the list or from the kudo detail | Mitigated — hearts use the same weighted total as cards and admin (D008, G08); a brief timing gap may remain |
| RISK-03 | risk | Counting kudos per Sunner on every profile open grows with data volume | Slow profile open late in the campaign | open — see technical-spec § 5.3 |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_AppShellI18n | feature | Avatar menu entry to the own profile; Not-found page; header and footer | FR-101, FR-104 |
| F002_GoogleAuth | feature | Signed-in session, role (admin check) and the profile record with name, avatar and unit | FR-001, FR-601, BR-001 |
| Go backend API | external-service | Serves the profile and kudos-list data and applies the anonymity, spam and paging rules | FR-403, FR-602, FR-603 |
| F005_KudoCompose | feature | Creates the kudos, including the anonymity flag and status that lists and counts read | BR-001, BR-002, BR-003 |
| F006_KudosBoard | feature | Draws the kudo card used in the list and the kudo detail view a card opens; its avatars link here | FR-102, FR-105, FR-204 |
| F008_KudosGamification | feature | Supplies the weighted heart total, boxes opened and unopened, collected icons, the secret-box flow and icon hover descriptions | FR-202, FR-203, FR-404, D008 |
| Units (departments) data | data | The unit code shown under the name — the `units.code` column owned by F002_GoogleAuth (Codex R15) | FR-201 |

## 13. Configuration

```text
PROFILE_KUDOS_PAGE_SIZE = 10    # kudo cards loaded per page in the profile list (D005)
```
