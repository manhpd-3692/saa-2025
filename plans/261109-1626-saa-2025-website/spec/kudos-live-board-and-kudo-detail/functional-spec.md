---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P1
**Type**: ui

## 1. Overview

**Problem:** Kudos written by Sunners need one place where everyone can see them, celebrate the standouts, find colleagues, and share a single kudo with others; without it the recognition stays hidden between two people.
**Solution:** The Sun* Kudos "Live board" page: a key visual, a HIGHLIGHT KUDOS carousel (the "Kudos Quốc Dân" top 5 by hearts) filterable by hashtag and department (Phòng ban), a SPOTLIGHT BOARD word cloud of names with a total kudos counter and name search, an ALL KUDOS feed of kudo cards, and a right sidebar with personal stats, the "Mở Secret Box" button and the 10 latest Sunners receiving gifts. Each kudo opens in a detail view with "Copy Link" and "Đóng". Hovering an avatar shows a small info card; clicking it opens that Sunner's profile.
**Scope:** Reading and displaying public kudos (cards, carousel, cloud, feed, sidebar, detail), filters, search, Copy Link, avatar hover card, hiding the sender of anonymous kudos, per-section loading/empty/error states.
**Non-Scope:** Writing or editing a kudo (F005); giving hearts, hero badge calculation, secret box logic and its overlays, the Thể lệ panel content (F008); profile pages (F007); notifications (F009); marking a kudo as spam and the spam alert overlay (F011); header, footer, floating write button and the Thể lệ launcher (F001); sign-in and route protection (F002).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A signed-in employee taking part in SAA 2025 | Read, browse and share recognition for colleagues and see their own numbers |
| Admin | A signed-in Sunner with the admin role | Same as Sunner, and also sees the real sender of anonymous kudos |

This feature displays what F005 creates and leaves hearts, badges and secret boxes to F008.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Browse the Live board | Open the board, page through highlighted kudos, filter them, explore and search the Spotlight cloud, scroll all kudos, see own stats and recent gift recipients | US001, US002, US003, US004, US005, US006 | FR-001, FR-002, FR-003, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-209, FR-210, FR-211, FR-403, FR-601, FR-602, FR-603 | BR-001, BR-002, BR-003, BR-004, BR-005, DEC-001, DEC-002, DEC-003, SM-001 | TBD (draft) |
| CAP-02 | Read one kudo and interact with it | Open a kudo in detail, copy its link, close it, preview a Sunner by hovering an avatar, go to their profile | US007, US008, US009 | FR-102, FR-103, FR-104, FR-401, FR-402, FR-404, FR-405 | BR-006, BR-007, DEC-004 | TBD (draft) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | What makes a kudo "highlighted" in HIGHLIGHT KUDOS? | Highlight is the "Kudos Quốc Dân" ranking: the 5 public kudos with the highest weighted heart total (campaign multiplier included), newer wins ties; every public kudo is a candidate, including kudos with no heart yet; with a Hashtag or Phòng ban filter the ranking is taken inside the filtered set; there is no separate Quốc Dân section — resolved (G12, G08) | Matches the "n/5" paging in the design; one heart number is used everywhere | no |
| D002 | Do the Hashtag and Phòng ban filters also narrow the ALL KUDOS feed and the Spotlight? | No, they apply to Highlight only — resolved (applied default AD06) | The filters sit inside the Highlight section in the design | no |
| D003 | Who can see the real sender of an anonymous kudo? | Admins only; one shared masking step on the server hides it from everyone else on every read — resolved (G04) | Moderation needs it; peers do not | no |
| D004 | Does the Phòng ban filter match the receiver's unit or the sender's? | The receiver's unit — resolved (applied default AD06) | A department wants to see who in it was thanked; sender may be hidden | no |
| D005 | Is the kudo detail an overlay over the board or its own page? | Overlay when opened from the board, full page when a link is opened directly — resolved (applied default AD06) | Design shows an enlarged card with "Đóng"; the route `/kudos/[id]` must also work as a shared link | no |
| D006 | What is a "gift" in "10 Sunner nhận quà mới nhất"? | The 10 Sunners who most recently opened a secret box — resolved (applied default AD06) | Secret box is the only gift in the design | no |
| D007 | Can a kudo marked spam still be opened by link? | Only by its sender and admins; everyone else gets "not found" — resolved (applied default AD06) | Keeps spam out of view without telling others it exists | no |
| D008 | Where does the edit entry for the sender's own kudo sit? | On the detail view, next to Đóng (F005 D015) — resolved (applied default AD06) | The design shows no edit control; the detail is the agreed place | no |
| D009 | How is an anonymous sender shown? | Placeholder avatar and the label "Ẩn danh", no link, no hover card — resolved (applied default AD06) | Matches the "anonymous" intent without revealing a name | no |
| D010 | Exact wording of empty, error and "copied" messages | Draft generic wording is used until captured from the design — resolved (applied default AD06) | Not readable in the survey notes | no |
| D011 | Where does the hero badge on a card come from? | F008 supplies it ready to display — resolved (applied default AD06) | Badge rules live in F008, not here | no |
| D012 | How fresh must the board be? | Loaded on open and when the tab regains focus; no live push — resolved (applied default AD06) | New kudos every few seconds are not expected; keeps the feature simple | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** The board lists only public kudos; kudos marked spam never appear in the carousel, feed, Spotlight counts or sidebar numbers.
- **FR-002** Every kudo card shows sender → receiver (avatar, name, unit code such as CECV2, hero badge), time as "HH:mm - MM/dd/yyyy", title, text, up to 5 images in the sender's order, hashtags, heart count (the weighted total, campaign bonus included, the same number used everywhere), and Copy Link.
- **FR-003** An anonymous kudo shows no sender name, avatar or unit to other Sunners; only the label "Ẩn danh". Nothing in the data or image links sent to their browser identifies the sender either (Codex R01). Admins see the real sender.

### Navigation (1xx)

- **FR-101** Choosing "Sun* Kudos" in the header opens the Live board at `/kudos`.
- **FR-102** Clicking a card opens that kudo's detail; "Đóng" returns to the board where the reader was.
- **FR-103** Clicking a Sunner's avatar or name opens their profile (F007); anonymous senders are not clickable.
- **FR-104** The sender of a kudo sees an edit entry next to Đóng on its detail view, unless the kudo is marked spam, that opens the write window (F005) prefilled.

### Live board (2xx)

- **FR-201** The page opens with the key visual "Hệ thống ghi nhận và cảm ơn" and the KUDOS logo.
- **FR-202** HIGHLIGHT KUDOS (the "Kudos Quốc Dân" ranking) shows the 5 public kudos with the most hearts (kudos without hearts can fill the remaining places), one enlarged kudo at a time, with previous/next buttons and a position indicator such as 2/5.
- **FR-203** A Hashtag dropdown narrows the highlighted kudos to one hashtag, or "all"; the top 5 is then ranked among the matching kudos.
- **FR-204** A Phòng ban dropdown narrows the highlighted kudos to one department (the receiver's unit), or "all"; the top 5 is then ranked among the matching kudos.
- **FR-205** SPOTLIGHT BOARD shows Sunner names as a word cloud — more kudos received, bigger name — with the total kudos counter (for example "388 KUDOS").
- **FR-206** A search box in the Spotlight finds a Sunner by name and emphasizes the match.
- **FR-207** ALL KUDOS lists public kudos newest first and loads more as the reader scrolls, until the end.
- **FR-208** The right sidebar shows the reader's own stats: kudos received, kudos sent, hearts received (weighted total), secret boxes.
- **FR-209** The sidebar shows the "Mở Secret Box" button; what it does belongs to F008.
- **FR-210** The sidebar lists the 10 Sunners who most recently opened a secret box (the "gift").
- **FR-211** Each card has places for the heart button and hero badges that F008 fills.

### Interaction (4xx)

- **FR-401** "Copy Link" copies the kudo's own address and confirms with a short message.
- **FR-402** Hovering or focusing an avatar shows an info card with name, unit code, hero badge and kudos received/sent counts.
- **FR-403** Every section shows a loading state, an empty state and an error state with Retry, independently of the others.
- **FR-404** The detail view shows the same card enlarged, with "Copy Link" and "Đóng".
- **FR-405** A kudo that does not exist or may not be viewed shows the "not found" page.

### Security (6xx)

- **FR-601** Only signed-in Sunners can open the board, the detail view or any of its data.
- **FR-602** Hiding anonymous senders and hiding spam kudos is enforced by the server on every read, through one shared masking step, not only by the screen.
- **FR-603** Images are shown through short-lived links; the stored image files are not publicly reachable, and their names and links are random, never derived from who uploaded them (Codex R01).

## 5. Business Rules

- Only public kudos are shown anywhere on the board (BR-001)
- The sender of an anonymous kudo is hidden from everyone except admins (BR-002)
- Highlight (Kudos Quốc Dân) shows at most 5 public kudos, highest weighted heart total first, newer on ties; kudos with no heart are ranked too (G12); hashtag and department filters combine and the ranking is done inside the filtered set (BR-003)
- Spotlight search ignores case and Vietnamese accents and works on the names already shown (BR-004)
- The feed is newest first, loaded in pages of 10, and never repeats or skips a kudo while the reader scrolls (BR-005)
- A kudo can be opened only if it is public, or the reader is its sender or an admin; otherwise it behaves as not found (BR-006)
- Copy Link always copies the plain detail address of that kudo, without filters (BR-007)
- Highlight has no result: show an empty state; first/last page disables previous/next (DEC-001)
- Anonymous sender and not an admin: show "Ẩn danh" without link or hover card (DEC-002)
- Feed has no kudos: show empty state; no more pages: show an end marker (DEC-003)
- Kudo cannot be viewed: show the not-found page (DEC-004)
- The feed moves between loading, loaded, loading more, end and error (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Sun* Kudos Live board (includes Hashtag and Phòng ban dropdowns, avatar hover card, hashtag group) | TBD (draft) | Key visual, HIGHLIGHT KUDOS carousel, SPOTLIGHT BOARD cloud with counter, ALL KUDOS feed, right sidebar | Page and filter highlights, search the cloud, scroll the feed, hover or click avatars, open a kudo, copy a link, open the secret box (F008) |
| View Kudo (detail) | TBD (draft) | One kudo card enlarged with Copy Link and Đóng | Read, copy the link, close, edit own kudo |

### User Journey

1. Sunner chooses Sun* Kudos in the header and the Live board opens at the top with the key visual.
2. Sunner pages through Highlight Kudos and narrows them with a hashtag or a department.
3. Sunner looks at the Spotlight cloud and searches a colleague's name.
4. Sunner scrolls All Kudos; more cards load as they reach the bottom.
5. Sunner hovers an avatar to see who it is, then clicks to open that profile.
6. Sunner clicks a card, reads it enlarged, presses Copy Link and sends the link to a colleague, then presses Đóng and is back on the board.

## 7. User Stories

### US001 — Open the Live board

**Actor:** Sunner
**Goal:** Reach the board from the header and see it fill in.
**Business value:** One visible home for recognition keeps the program alive.

**Acceptance Criteria:**
- [ ] "Sun* Kudos" in the header opens `/kudos`.
- [ ] The key visual and all four sections appear; one failing section does not blank the page.

### US002 — Browse highlighted kudos

**Actor:** Sunner
**Goal:** Page through the standout kudos one at a time.
**Business value:** Celebrates the best recognition and sets the tone.

**Acceptance Criteria:**
- [ ] One kudo shows enlarged with an "n/5" indicator; kudos are ordered by heart total, newer first on ties.
- [ ] Previous is disabled on the first, next on the last.

### US003 — Filter highlighted kudos

**Actor:** Sunner
**Goal:** Narrow the highlights by hashtag or by department.
**Business value:** Lets a team see recognition relevant to them.

**Acceptance Criteria:**
- [ ] Choosing a hashtag, a department, or both shows the top matching kudos by hearts and resets to the first.
- [ ] Choosing "all" clears that filter; no match shows an empty state.

### US004 — Explore the Spotlight

**Actor:** Sunner
**Goal:** See who is recognized most and find a colleague's name.
**Business value:** Makes recognition across the company visible and playful.

**Acceptance Criteria:**
- [ ] The cloud shows names sized by kudos received and the total counter.
- [ ] Searching a name emphasizes it; no match says so.

### US005 — Scroll all kudos

**Actor:** Sunner
**Goal:** Read every public kudo, newest first, without clicking "next page".
**Business value:** Browsing is effortless, so more people read and join in.

**Acceptance Criteria:**
- [ ] More cards load as I reach the end; an end marker shows after the last.
- [ ] An empty board shows an empty state.

### US006 — See my numbers and recent gift recipients

**Actor:** Sunner
**Goal:** Check my own kudos stats and see who recently received gifts.
**Business value:** Personal feedback and social proof encourage taking part.

**Acceptance Criteria:**
- [ ] The sidebar shows my received, sent, hearts (weighted total) and secret box numbers.
- [ ] A list of the 10 Sunners who most recently opened a secret box shows, each opening a profile.

### US007 — Open a kudo and copy its link

**Actor:** Sunner
**Goal:** Read one kudo enlarged and share its link.
**Business value:** Lets great recognition spread beyond the board.

**Acceptance Criteria:**
- [ ] Clicking a card opens the detail with Copy Link and Đóng.
- [ ] Copy Link confirms; the copied link opens the same kudo for another signed-in Sunner.
- [ ] Đóng returns me to the board where I was.

### US008 — Preview a Sunner by hovering

**Actor:** Sunner
**Goal:** See who an avatar is without leaving the board.
**Business value:** Puts names to faces across departments.

**Acceptance Criteria:**
- [ ] Hovering a named avatar shows name, unit, badge and counts.
- [ ] An anonymous sender shows no hover card.

### US009 — Go to a Sunner's profile

**Actor:** Sunner
**Goal:** Open the profile of a sender, receiver or listed Sunner.
**Business value:** Connects recognition to the person and their journey.

**Acceptance Criteria:**
- [ ] Clicking an avatar or name opens that profile.
- [ ] An anonymous sender cannot be clicked.

## 8. Scenarios

### US001 — Happy Path

**Given** I am signed in, **When** I choose Sun* Kudos in the header, **Then** the board opens with the key visual, Highlight, Spotlight, All Kudos and the sidebar.

### US001 — Error: one section fails

**Given** the Spotlight data request fails, **When** the board loads, **Then** the Spotlight shows an error with Retry and the other sections stay usable.

### US002 — Happy Path

**Given** five highlighted kudos ordered by heart total, **When** I press next twice, **Then** the kudo with the third-highest total shows and the indicator reads 3/5.

### US002 — Error: no highlights

**Given** there are no public kudos, **When** the board opens, **Then** the carousel shows an empty state and no indicator.

### US003 — Happy Path

**Given** the Highlight shows 5 kudos, **When** I choose the hashtag "#teamwork", **Then** the top kudos by hearts among those with that hashtag show, starting at the first.

### US003 — Error: no match

**Given** I choose a hashtag and a department that no kudo has together, **When** the list reloads, **Then** an empty state shows and I can clear the filters.

### US004 — Happy Path

**Given** the cloud is shown, **When** I type "minh" in the search, **Then** names containing "minh" (any accents) are emphasized.

### US004 — Error: no match

**Given** I type letters matching nobody, **When** I stop typing, **Then** "no result" shows and no name is emphasized.

### US005 — Happy Path

**Given** 25 public kudos, **When** I scroll to the bottom twice, **Then** 10, then 20, then 25 cards show newest first, and an end marker appears.

### US005 — Error: next page fails

**Given** I reach the end of the loaded cards and the network fails, **When** the request ends, **Then** an inline error with Retry shows and the loaded cards stay.

### US006 — Happy Path

**Given** I received 3 kudos and sent 2, **When** the board loads, **Then** the sidebar shows 3 received and 2 sent.

### US006 — Error: sidebar fails

**Given** the sidebar request fails, **When** the board loads, **Then** the sidebar shows an error with Retry; the feed is unaffected.

### US007 — Happy Path

**Given** a public kudo, **When** I click its card and press Copy Link, **Then** I see "Link copied" and the clipboard holds its address.

### US007 — Error: kudo not available

**Given** I open a copied link for a kudo marked spam and I am not its sender or an admin, **When** the page loads, **Then** I see the not-found page.

### US008 — Happy Path

**Given** a card with a named sender, **When** I hover the avatar for a moment, **Then** an info card with name, unit, badge and counts shows.

### US008 — Error: anonymous sender

**Given** an anonymous card, **When** I hover the sender block, **Then** no info card appears.

### US009 — Happy Path

**Given** a card, **When** I click the receiver's name, **Then** that Sunner's profile opens.

### US009 — Error: profile unavailable

**Given** the receiver's account no longer exists, **When** I click the name, **Then** the profile page shows its own not-found state (F007).

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Kudo is marked spam while I am on the board | It disappears on the next refresh; cards already shown stay until then | None |
| Kudo has no images | The image row is not shown | None |
| Kudo has 5 images | All 5 show in the sender's order | None |
| Two kudos share the same time | Order stays stable; none repeated or skipped when scrolling | None |
| New kudo arrives while I scroll | The scrolling sequence is not disturbed; the new kudo shows after a refresh | None |
| Image link expires while the page is open | The card reloads once, otherwise a placeholder is shown | "Image unavailable." (draft wording, D010) |
| Very long name or title | Truncated with an ellipsis on cards; full text in the detail view | None |
| Clipboard blocked by the browser | The link is shown selected so I can copy it by hand | "Press Ctrl+C to copy." (draft wording, D010) |
| Two highlighted kudos have the same heart total | The newer one ranks first | None |
| A heart was given during a campaign | It counts with the campaign multiplier in the card number and the Highlight ranking | None |
| Session expires while on the board | Next request sends me to sign in; I return to the same page after | "Your session has expired. Please sign in again." |
| Fewer than 5 public kudos (after filters) | The indicator uses the real total, for example 1/3 | None |
| Fewer than 5 kudos have any heart | Kudos without hearts fill the remaining places, newest first (G12) | None |
| Hover moves away before the card opens | No card is shown | None |
| Anonymous sender is also the reader | Reader sees "Ẩn danh" like everyone else but gets the edit entry on their own kudo | None |

## 10. Edge Behaviours to Verify

- **FR-001** → A kudo marked spam is absent from the carousel, feed, cloud counts and its detail link (for others).
- **FR-003** → An anonymous kudo shows "Ẩn danh" to a plain Sunner and the real sender to an admin.
- **FR-202** → Indicator matches the position; the buttons disable at both ends.
- **FR-203** → Hashtag and department filters together show only kudos matching both, ranked by weighted hearts within that set.
- **FR-002** → The heart count on a card equals the weighted total used for Highlight ranking.
- **FR-206** → Searching "nguyen" also finds "Nguyễn".
- **FR-207** → 25 kudos load as 10, 10, 5 with no duplicate and an end marker.
- **FR-208** → Sidebar numbers match the reader's own kudos and hearts.
- **FR-401** → The copied address, pasted into a new tab, opens the same kudo.
- **FR-402** → Hover card opens after a short delay and never for an anonymous sender.
- **FR-403** → A failing section shows its own error with Retry and leaves the rest working.
- **FR-405** → A made-up id and a spam kudo of someone else show the same not-found page.
- **FR-602** → The data returned to a plain Sunner never contains the anonymous sender's identity; a third Sunner reading an anonymous kudo with images finds no sender identifier in any field, image link or page markup (Codex R01).
- **FR-601** → Opening a kudo link signed out leads to sign-in, then back to that kudo.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Anonymity holds only if every read path masks the sender and no image link carries the uploader; mitigated by one shared server-side masking step used by every endpoint that returns kudos, random image file names (Codex R01), and the browser cannot read tables directly (X05) | Anonymous senders could be exposed | [INFERRED] |
| RISK-02 | risk | Counting kudos per Sunner for the Spotlight and hover cards on every request may become slow as kudos grow | Slow board for everyone | [INFERRED] |
| RISK-03 | risk | The meaning of "highlight" and "gift" was not stated in the design; now settled as the weighted-heart top 5 (G12) and the latest opened secret boxes (D006) | Wrong list shown at launch if the settled rule is not followed | [INFERRED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_AppShellI18n | feature | Header link to the board, footer, floating write button, Thể lệ launcher, not-found page | FR-101, FR-405 |
| F002_GoogleAuth | feature | Signed-in session, roles (admin sees anonymous sender), route protection, units and their unit codes | FR-601, FR-002, D003 |
| F005_KudoCompose | feature | Creates the kudos, images and hashtags shown here; edit window opened from the detail | FR-002, FR-104 |
| F007_SunnerProfile | feature | Profile pages that avatars and names open | FR-103 |
| F008_KudosGamification | feature | Heart button, weighted heart totals used for display and Highlight ranking, hero badge, secret box button and its data, gift recipients | FR-002, FR-209, FR-210, FR-211, D001, D006, D011 |
| F011_AdminKudoModeration | feature | Marks kudos spam and owns the spam alert overlay | FR-001, D007 |
| Supabase Storage | external-service | Holds kudo images served via signed links | FR-603 |

## 13. Configuration

```text
HIGHLIGHT_MAX = 5              # kudos in the Highlight carousel
FEED_PAGE_SIZE = 10            # cards per page in All Kudos (BR-005)
SPOTLIGHT_MAX_NAMES = 100      # names drawn in the cloud (assumed)
SIDEBAR_RECIPIENTS = 10        # latest gift recipients listed
HOVER_CARD_DELAY_MS = 300      # wait before the avatar card opens (assumed)
```
