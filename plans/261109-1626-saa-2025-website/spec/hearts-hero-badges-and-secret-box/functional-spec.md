---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P2
**Type**: mixed

## 1. Overview

**Problem:** Kudos are only worth keeping up if people feel rewarded for giving and receiving them. Without a visible reward loop, Sunners send a kudo and nothing comes back, and the community cannot tell which kudos or colleagues stand out.
**Solution:** Any Sunner except the kudo's sender can give one heart to a kudo and press again to withdraw it; the recipient may heart too. Receivers earn a hero badge (New, Rising, Super, Legend) by how many different colleagues sent them kudos. Senders earn a Secret Box for every 5 weighted hearts their kudos receive, open it to reveal one of 6 icons, and win a mystery prize at SAA 2025 if they collect all 6. The 5 most-hearted kudos are "Kudos Quốc Dân": the unfiltered Highlight ranking on the Live board. A rules panel (Thể lệ) explains all of this, and an admin-set campaign (multiplier 2–10, for example "x2 heart") boosts how much each heart counts.
**Scope:** Giving and withdrawing a heart; the weighted heart total (the one heart number used everywhere); hero badge tier and its hover; Secret Box earning, opening and icon collection; the rules panel; the ranking rule behind Kudos Quốc Dân (shown by F006 as the unfiltered Highlight); the overlays for rules, secret box, badge hover and campaign hover; asking F009 to notify about hearts, boxes and a completed icon set; the tier thresholds and mapping that F005 uses when it announces a new hero level (F005 is the producer of that notice — Codex N04).
**Non-Scope:** Heart buttons, badge slots and the "Mở Secret Box" button placement on screens (F006, F007 render the slots); writing or editing kudos (F005); creating and editing campaigns (F012 — this feature only reads the active one); storing and showing notifications (F009 owns them; this feature only calls F009's shared service after a change is saved); the Highlight section itself and its filters (F006); marking kudos spam (F011); admin tables of levels and badges (F010 reads from here); handing out the SAA 2025 prize and the Quốc Dân prize (done outside the system).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A signed-in employee taking part in SAA 2025; acts as heart giver, kudo sender and kudo receiver | Appreciate others' kudos, earn badges and boxes, collect all 6 icons |

This feature rewards the kudos created by F005 and shown by F006 and F007.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Give and withdraw a heart | Heart a kudo, withdraw it, see the total and the active campaign boost | US001, US002, US004 | FR-001, FR-204, FR-401, FR-402, FR-408, FR-409, FR-601, FR-603, FR-604 | BR-001, BR-002, BR-003, BR-004, DEC-001, DEC-002, SM-001 | SCR-hero-badge-and-campaign-hover (campaign hover) |
| CAP-02 | Hero badge from distinct senders | See a Sunner's hero badge and what it means | US003 | FR-002, FR-203, FR-405 | BR-005, DEC-003 | SCR-hero-badge-and-campaign-hover |
| CAP-03 | Earn and open secret boxes | Earn a box for every 5 hearts, open it, collect the 6 icons | US006, US007, US008 | FR-003, FR-102, FR-205, FR-206, FR-207, FR-403, FR-404, FR-407, FR-602 | BR-006, BR-007, BR-008, BR-010, DEC-004, DEC-005, SM-002 | SCR-secret-box-modal |
| CAP-04 | Read the rules | Open the Thể lệ panel, read the three rule blocks, jump to writing a kudo | US005 | FR-101, FR-103, FR-201, FR-202 | BR-005 | SCR-rules-panel |
| CAP-05 | Kudos Quốc Dân | See the 5 most-hearted kudos as the unfiltered Highlight on the Live board | US009 | FR-406 | BR-009 | Live board Highlight (F006) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | May a Sunner heart a kudo they sent or received? | The sender may not heart their own kudo; the recipient and every other Sunner may — resolved (G06) | Blocks self-pumping of hearts and secret boxes while letting the recipient react | no |
| D002 | May a Sunner heart the same kudo more than once? | No — one heart per Sunner per kudo — resolved (G07) | Keeps totals and box earning fair | no |
| D003 | May a heart be withdrawn, and what happens to boxes already earned? | Yes: pressing the heart again withdraws it. Boxes granted are the high-water mark of floor(weighted hearts / 5) and are never revoked, so withdrawing and hearting again cannot earn extra boxes — resolved (G07) | Familiar like-toggle; revoking boxes after they may be opened is messy | no |
| D004 | Do the 5 hearts per box count across all of a sender's kudos, or per kudo? | Running total of weighted hearts across all kudos the Sunner sent — resolved (applied default AD08) | Rule text says "for every 5 hearts you get 1 Secret Box" | no |
| D005 | Does the campaign multiplier change the heart count shown, the box progress, or both? | The weighted total everywhere: card display, box progress, Highlight / Kudos Quốc Dân ranking, profile and admin totals — resolved (G08) | One number everywhere is easiest to explain | no |
| D006 | How is the multiplier set, with overlapping campaigns and campaigns changing later? | `campaigns.multiplier` is a whole number 2–10 (default 2) entered in the F012 form. A heart's weight is fixed when it is given: the highest multiplier among campaigns active at that instant, otherwise 1. Later edits or deletes never change it (`hearts.campaign_id` is cleared on delete) — resolved (G14) | Predictable; no retroactive change | no |
| D007 | Icon draw: odds per icon, repeats allowed, can a box be empty? | Each box gives exactly one icon, equal 1/6 odds, repeats allowed, never empty — resolved (G09) | Matches the rules-panel text; no odds settings to build | no |
| D008 | Which kudos count toward distinct senders for the hero badge? | Public kudos only; anonymous senders count once without being revealed — resolved (applied default AD08) | Matches F005 D007; spam should not earn rewards | no |
| D009 | Is the hero tier stored on the profile or worked out each time? | Worked out on every read by the backend — resolved (applied default AD08) | Cannot go out of date | no |
| D010 | What does collecting all 6 icons do in the system? | Show a completion message and notify the Sunner once — only the open that first completes the set is recorded and announced (Codex R11); the prize is given out offline at SAA 2025 — resolved (applied default AD08) | No prize-claim screen exists in the design | no |
| D011 | Where is the Kudos Quốc Dân list shown, and how are ties broken? | It is the unfiltered Highlight ranking on the Live board (F006); there is no separate Quốc Dân surface. Highlight filters rank inside the filtered set. Ties go to the newer kudo — resolved (G12) | One ranking, one place | no |
| D012 | What do the 8 "Standby" box frames and 3 "Open Giftbox" result frames mean? | Standby = box shown per collected-icon state; result frames = icon revealed, collection updated — resolved (applied default AD08) | Frame names only were surveyed | no |
| D013 | Where does the campaign badge (hover `3241:15021`) appear? | Next to the heart control while a campaign is active — resolved (applied default AD08) | Hover frame exists, host screen not identified | no |
| D014 | Does earning a box create a notification? | Yes: after the box is saved, this feature calls F009's shared notification service ("Secret Box received"); a failure is logged and never blocks the heart — resolved (applied default AD08) | Keeps notification storage in one place | no |
| D015 | If a kudo is later marked spam, what happens to its hearts and boxes already granted? | Hearts stay but stop counting for the Highlight / Quốc Dân ranking; boxes granted are kept — resolved (applied default AD08) | Avoids taking back opened rewards | no |
| D016 | Legend threshold wording: "more than 20" vs "20+" | More than 20 (Super is 10–20) — resolved (applied default AD08) | Panel text and ranges agree this way | no |
| D017 | Any limit on heart giving to stop heart-swapping rings? | None in the first release — resolved (applied default AD08) | Moderation handles abuse after the fact; the box high-water mark already stops withdraw-and-re-heart farming | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A heart records which Sunner gave it to which kudo, and how much it counts for.
- **FR-002** A Sunner's hero tier always comes from the number of different Sunners who sent them kudos, never set by hand.
- **FR-003** A Secret Box belongs to one Sunner and is either unopened or opened with one revealed icon.

### Navigation (1xx)

- **FR-101** The rules panel opens over the current page from the floating button's "Thể lệ" choice and closes with Đóng.
- **FR-102** "Mở Secret Box" buttons on the Live board and on the profile open the secret box window.
- **FR-103** The rules panel's Viết KUDOS button closes the panel and opens the write window.

### Overlays (2xx)

- **FR-201** The rules panel explains three things: hero badge tiers (New 1–4, Rising 5–9, Super 10–20, Legend more than 20 senders), the Secret Box rule (every 5 hearts one box, the 6 icons, the prize for all 6), and Kudos Quốc Dân (top 5 hearted kudos).
- **FR-202** The rules panel has two buttons, Đóng and Viết KUDOS.
- **FR-203** Hovering a hero badge shows the tier name and how many senders it takes.
- **FR-204** Hovering the campaign badge shows the campaign name, its multiplier and its start and end time.
- **FR-205** The secret box window shows "KHÁM PHÁ SECRET BOX CỦA BẠN", "Click vào box để mở" and how many boxes are unopened.
- **FR-206** After a box is opened the window shows the revealed icon and how many of the 6 icons the Sunner has.
- **FR-207** With no unopened boxes the window shows an empty message and nothing can be opened.

### Interaction (4xx)

- **FR-401** A Sunner can give a heart to a kudo and withdraw it; the control shows whether they hearted it and the total.
- **FR-402** A heart counts as the highest multiplier among campaigns running when it is given, or 1 when the campaign check succeeds and finds none running; the weight never changes afterwards. If the campaign check itself fails, the heart is not saved and the Sunner sees an error (Codex R09).
- **FR-403** Every 5 weighted hearts received on the kudos a Sunner sent grant them one Secret Box automatically; the number of boxes only ever goes up.
- **FR-404** Opening a box reveals one of the 6 icons, each with equal chance and repeats allowed, and the box cannot be opened again. Retrying an open whose answer was lost shows the same result and never uses up a second box (Codex R12).
- **FR-405** A Sunner's hero badge changes as soon as the number of different senders crosses a tier boundary.
- **FR-406** Kudos Quốc Dân are the unfiltered Highlight ranking on the Live board: the 5 public kudos with the highest weighted heart total, newer first on a tie.
- **FR-407** The Live board's "10 Sunner nhận quà mới nhất" list gets its rows from the Sunners who most recently opened a box.
- **FR-408** The heart total shown anywhere (card, detail, profile, admin) is the weighted total, the same number that drives box progress and ranking.
- **FR-409** Hearts given, boxes earned, a new hero level and a completed icon set are announced through F009 after the change is saved (the new hero level is announced by F005's kudo create using this feature's tiers — Codex N04); a failed or slow notification never undoes or delays the change (Codex R23). A new hero level is announced once per tier, only when a new kudo lifts the receiver into it — never because an admin marks a kudo spam or public again (Codex R10). A completed icon set is announced once (Codex R11).

### Security (6xx)

- **FR-601** Only signed-in Sunners can give or withdraw hearts and open boxes; the actor is always the signed-in person.
- **FR-602** A Sunner can open only their own boxes.
- **FR-603** Totals, box grants and the icon draw are decided on the server; nothing the browser claims is trusted.
- **FR-604** Hearts are accepted only on public kudos, and never from the kudo's sender.

## 5. Business Rules

- A Sunner has at most one heart per kudo; pressing the heart again withdraws it (BR-001)
- A Sunner cannot heart a kudo they sent; the recipient may heart a kudo they received (BR-002)
- Only public kudos can receive hearts (BR-003)
- A heart counts as the highest multiplier (2–10) among campaigns active at the moment it is given, otherwise 1 (only when the campaign check succeeds and finds none; a failed check saves no heart — Codex R09); the weight is fixed and the weighted total is the heart number everywhere (BR-004)
- Hero tiers: New 1–4, Rising 5–9, Super 10–20, Legend more than 20 different senders (BR-005)
- Boxes granted equal the highest value that floor(weighted hearts received on the Sunner's sent kudos / 5) has ever reached; boxes already given are never taken back, so withdrawing and hearting again earns nothing extra (BR-006)
- A box can be opened only by its owner, and only once (BR-007)
- An opened box reveals exactly one of the 6 icons, each with equal 1/6 chance, repeats allowed: Revival, Touch of Light, Stay Gold, Flow to Horizon, Beyond the Boundary, Root Further (BR-008)
- A Sunner completes the icon set at most once: the open that first brings them to 6 different icons is recorded and announced, later opens are not (BR-010, Codex R11)
- Kudos Quốc Dân are the 5 public kudos with the highest weighted heart total, newer wins a tie; this is the unfiltered Highlight ranking, and Highlight filters rank inside the filtered set (BR-009)
- The heart control is disabled on your own kudo, filled when you hearted, outline otherwise (DEC-001)
- A heart on a missing, spam or own kudo is refused and nothing is saved (DEC-002)
- A Sunner with no sender yet has no badge (DEC-003)
- With no unopened box the open action is refused and the window shows the empty message (DEC-004)
- Retrying the same open after a lost answer returns the first result and opens nothing new (DEC-005, Codex R12)
- A heart is either given or not given; it can move back and forth (SM-001)
- A box is earned unopened, then opened once with an icon (SM-002)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Rules panel (Thể lệ) | TBD (draft) | Side panel with three rule blocks: hero badge tiers, the Secret Box and 6 icons, Kudos Quốc Dân | Read, press Đóng, press Viết KUDOS |
| Secret box window | TBD (draft) | "KHÁM PHÁ SECRET BOX CỦA BẠN", the box, unopened count, then the revealed icon and collection progress | Click the box to open it, close the window |
| Hero badge and campaign hover | TBD (draft) | Small overlays on hover: New / Rising / Super / Legend badge text, campaign name, multiplier and period | Hover or focus to read |

The heart control and the badge slots on kudo cards — on the Live board and in the kudo lists of profile pages — are drawn by F006 and F007; there is no hero badge in the profile header (F007 D006, Codex N10); this feature supplies their content and behavior. Kudos Quốc Dân has no screen of its own: it is the unfiltered Highlight section of the Live board (F006).

### User Journey

1. A Sunner browses the Live board, hovers a colleague's badge to learn what it means, and hearts a kudo.
2. During a "x2 heart" campaign the Sunner hovers the campaign badge to see the period and multiplier.
3. Another Sunner's kudos collect hearts (the recipient may heart too, the sender may not); at every 5 weighted hearts the sender earns a Secret Box and is notified.
4. The sender presses "Mở Secret Box", clicks the box and sees which icon they got.
5. They repeat until all 6 icons are collected; the rules panel (opened from the floating button) reminds them of the prize.
6. From the rules panel they can press Viết KUDOS to send a kudo of their own.

## 7. User Stories

### US001 — Heart a kudo

**Actor:** Sunner
**Goal:** Give a heart to a kudo I like.
**Business value:** Cheap appreciation keeps kudos visible and rewards good ones.

**Acceptance Criteria:**
- [ ] The heart fills and the total goes up by the heart's weight.
- [ ] I cannot heart a kudo I sent or a hidden (spam) kudo; I can heart a kudo I received.

### US002 — Withdraw my heart

**Actor:** Sunner
**Goal:** Remove a heart I gave.
**Business value:** Lets people correct a mistaken click.

**Acceptance Criteria:**
- [ ] Pressing the filled heart again returns it to outline and the total goes down by what it had added.
- [ ] Boxes the sender already earned stay.

### US003 — See a hero badge and what it means

**Actor:** Sunner
**Goal:** See a colleague's (or my own) hero badge and learn the tier by hovering.
**Business value:** Makes positive influence visible and explains how to earn more.

**Acceptance Criteria:**
- [ ] New, Rising, Super and Legend badges each show their own hover text.
- [ ] A Sunner with no senders has no badge.

### US004 — See the heart campaign

**Actor:** Sunner
**Goal:** Know when a boosted-heart campaign is running and until when.
**Business value:** Encourages hearting while the boost is on.

**Acceptance Criteria:**
- [ ] Hovering the campaign badge shows name, multiplier and period.
- [ ] Nothing shows when no campaign is active.

### US005 — Read the rules

**Actor:** Sunner
**Goal:** Read how badges, secret boxes and Kudos Quốc Dân work, then optionally write a kudo.
**Business value:** People who understand the rewards take part more.

**Acceptance Criteria:**
- [ ] The panel opens from the floating button and shows three rule blocks.
- [ ] Đóng closes it; Viết KUDOS closes it and opens the write window.

### US006 — Earn a Secret Box

**Actor:** Sunner
**Goal:** Receive a Secret Box when my kudos collect enough hearts.
**Business value:** Rewards people for writing kudos others value.

**Acceptance Criteria:**
- [ ] The 5th weighted heart on my sent kudos adds one unopened box.
- [ ] Withdrawn hearts do not take a granted box back, and hearting again does not add another.

### US007 — Open a Secret Box

**Actor:** Sunner
**Goal:** Open a box and see which icon I got.
**Business value:** The surprise is the reward that drives engagement.

**Acceptance Criteria:**
- [ ] Clicking the box reveals one icon (equal chance for each of the 6) and lowers the unopened count by one.
- [ ] With no unopened box nothing can be opened.

### US008 — Collect all 6 icons

**Actor:** Sunner
**Goal:** See how many of the 6 icons I have collected.
**Business value:** A visible goal (the SAA 2025 prize) keeps people sending kudos.

**Acceptance Criteria:**
- [ ] The collection shows which icons I have and how many of 6.
- [ ] Holding all 6 shows a completion message.

### US009 — See Kudos Quốc Dân

**Actor:** Sunner
**Goal:** See the 5 most-hearted kudos in the Live board's Highlight.
**Business value:** Highlights the standout kudos Sun*-wide.

**Acceptance Criteria:**
- [ ] With no Highlight filter, exactly the 5 public kudos with the highest weighted totals are shown, highest first, newer first on a tie.

## 8. Scenarios

### US001 — Happy Path

**Given** a public kudo from someone else, **When** I click its heart, **Then** it is filled and the total rises by my heart's weight.

### US001 — Error: campaign check fails

**Given** the campaign check fails while I heart a kudo, **When** the request errors, **Then** no heart is saved, the control returns to outline and a short message asks me to try again; my heart is never saved at a lower weight (Codex R09).

### US001 — Error: own or hidden kudo

**Given** a kudo I sent, **When** I look at its heart, **Then** it cannot be clicked; and a hidden kudo refuses a heart with a short message. A kudo I received can be hearted.

### US002 — Happy Path

**Given** a kudo I hearted, **When** I click the filled heart, **Then** it returns to outline and the total drops.

### US002 — Error: network failure

**Given** I withdraw a heart and the network fails, **When** the request errors, **Then** the heart returns to filled and a message appears.

### US003 — Happy Path

**Given** a Sunner who received kudos from 7 different colleagues, **When** I hover their badge, **Then** I see Rising Hero and its 5–9 range.

### US003 — Error: no senders

**Given** a Sunner who received no kudos, **When** I view a kudo card that names them (on the Live board or in a profile's kudo lists), **Then** no badge is shown for them (Codex N10).

### US004 — Happy Path

**Given** "Campaign x2 heart" is running, **When** I hover the campaign badge, **Then** I see its name, x2 and its period.

### US004 — Error: campaign lookup fails

**Given** the campaign badge information cannot be loaded, **When** the page renders, **Then** only the badge is hidden. Hearting checks the campaign itself each time a heart is saved, so a heart given during a running campaign still gets its multiplier; if that check fails too, the heart is refused rather than saved at weight 1 (Codex R09).

### US005 — Happy Path

**Given** I am on the Live board, **When** I choose Thể lệ in the floating button, **Then** the rules panel opens over the page.

### US005 — Error: write window after sign-out

**Given** my session ended, **When** I press Viết KUDOS in the panel, **Then** I am sent to sign in and the panel closes.

### US006 — Happy Path

**Given** my sent kudos hold 4 weighted hearts, **When** a colleague hearts one of them, **Then** I have one more unopened box and a notification.

### US006 — Error: refused heart

**Given** a colleague tries to heart a hidden kudo of mine, **When** the heart is refused, **Then** my box count does not change. Likewise, if the heart that took me to 5 is withdrawn and given again, I still have only that one box.

### US007 — Happy Path

**Given** I have 5 unopened boxes, **When** I click the box, **Then** one icon is revealed and the count shows 4.

### US007 — Error: no box left

**Given** I have no unopened box, **When** I open the window, **Then** I see an empty message and nothing opens.

### US008 — Happy Path

**Given** I hold 5 different icons, **When** I open a box and get the 6th, **Then** the window shows all 6 collected and a completion message.

### US007 — Error: answer lost after opening

**Given** I have 3 unopened boxes and my open was saved but the answer never reached me, **When** I press Retry, **Then** I see the same icon as the first attempt and the count shows 2, not 1 (Codex R12).

### US008 — Error: two boxes completing at once

**Given** I hold 4 different icons and open two boxes at once that bring the other 2, **When** both finish, **Then** I hold all 6 and get exactly one completion notice; later opens send no further completion notice (Codex R11).

### US008 — Error: repeat icon

**Given** I already hold the icon I draw, **When** the box opens, **Then** the icon is shown and my collection count stays the same.

### US009 — Happy Path

**Given** many hearted kudos, **When** I open the Live board with no Highlight filter, **Then** the Highlight shows the 5 with the highest weighted totals.

### US009 — Edge: fewer than 5 hearted kudos

**Given** only 2 public kudos have hearts but 8 public kudos exist, **When** I open the Highlight, **Then** I see those 2 first and then the 3 newest zero-heart public kudos — every public kudo is ranked, hearted or not (G12). Only when fewer than 5 public kudos exist at all does the list show fewer than 5, with no filler.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Heart clicked twice quickly or from two tabs | Only one heart is stored for me on that kudo | None — silent handling |
| Heart given on a kudo that just became spam | Refused, nothing saved, control reverts | "This kudo is no longer available." |
| Two hearts arrive together and cross a multiple of 5 | Exactly one box is added | None — silent handling |
| Campaign ends right as a heart is given | The campaign active at the moment of saving decides the weight | None — silent handling |
| Heart on an anonymous kudo | Allowed; the sender stays hidden from me | None — silent handling |
| Two tabs open the last box | One opens, the other shows the empty message | "You have no Secret Box to open." |
| Box opened but the answer was lost; Sunner presses Retry | The same icon is shown; no second box is used (Codex R12) | None — silent handling |
| Two boxes opened at once complete the 6 icons | Set completed once; exactly one completion notice (Codex R11) | Completion message |
| Campaign check fails while hearting | Heart not saved; control reverts (Codex R09) | "Could not save your heart. Please try again." (wording to confirm) |
| Campaign badge cannot be loaded | Only the badge is hidden; hearts are unaffected (Codex R09) | None |
| Two colleagues send a receiver their 5th distinct kudo at the same moment | One Rising Hero notice (Codex R10) | Level-up notification |
| An admin marks a kudo spam or public again and the receiver's tier changes | Badge follows on the next view; no level-up notice (Codex R10) | None |
| Session expires before heart or open | Nothing saved; control reverts | "Your session has expired. Please sign in again." |
| Sunner has exactly 4, 5, 10, 20 or 21 senders | New, Rising, Super, Super, Legend | None |
| Same sender sends many kudos to one receiver | Counts as one sender | None |
| Fewer than 5 hearted kudos exist | Zero-heart public kudos fill the remaining places, newest first; fewer than 5 only when fewer than 5 public kudos exist (G12) | None |
| Heart withdrawn after a box was granted | Heart removed, box kept | None |
| Heart withdrawn and given again | Total returns to where it was; no extra box (high-water mark) | None |
| Recipient hearts a kudo they received | Allowed; counts toward the sender's boxes | None |
| Two campaigns active at once (x2 and x3) | The heart counts 3 | None |
| Campaign deleted after hearts were given | Hearts keep their weight; their campaign link is cleared | None |
| Notification cannot be created or is slow | Heart, box or open is still saved and answered without waiting (Codex R23) | None — silent handling |

## 10. Edge Behaviours to Verify

- **FR-401** → Heart fills, total changes, survives reload; clicking again withdraws.
- **FR-402** → During a x2 campaign a heart adds 2; with x2 and x3 overlapping it adds 3; after they end a new heart adds 1 and old hearts keep their weight; a failed campaign check saves no heart, while a failed badge load only hides the badge (Codex R09).
- **FR-403** → The 5th weighted heart on my sent kudos adds exactly one box, even if two arrive at once; withdraw then re-heart adds none.
- **FR-404** → Opening a box reveals one icon; with zero boxes nothing opens; Retry after a lost answer shows the same icon and uses no second box (Codex R12).
- **FR-405** → Senders 4 → 5 changes the badge from New to Rising; 20 → 21 changes Super to Legend.
- **FR-409** → One level-up notice per tier even when two senders arrive together; none from spam/public changes or a repeat sender (Codex R10); one completion notice even when two boxes finish the set together (Codex R11).
- **FR-406** → The unfiltered Highlight shows only public kudos (zero-heart ones included), highest weighted total first, newer first on a tie, at most 5.
- **FR-408** → A x2 heart shows as +2 on the card, the profile and the box progress alike.
- **FR-602** → I cannot open someone else's box.
- **FR-604** → A hidden kudo refuses hearts; the sender's own heart control is disabled and a direct request is refused; the recipient's is enabled.
- **FR-201** → The rules panel shows the three blocks with the numbers above.
- **FR-103** → Viết KUDOS in the panel closes it and opens the write window.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Groups of Sunners can heart each other's kudos to farm boxes (withdraw-and-re-heart farming is already blocked by the box high-water mark) | Rewards lose meaning; prize cost grows | [INFERRED] — accepted for release one (D017) |
| RISK-02 | risk | Heart totals shown on F006/F007/F010 must use the same weighted total as box earning, or the numbers disagree | Visible mismatch between hearts shown and boxes earned | Mitigated — one weighted total read by every feature (G08) |
| RISK-03 | risk | Open rules (D004, D005, D007) change how many boxes people earn and what they win | Rework of grant and draw logic and of the rules panel text | Closed — resolved (G07, G08, G09, AD08) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_AppShellI18n | feature | Floating button opens the rules panel; copy comes from the language dictionary | FR-101 |
| F002_GoogleAuth | feature | Signed-in session and Sunner identity | FR-601 |
| F005_KudoCompose | feature | Source of kudos, senders and the anonymous flag; Viết KUDOS opens its window | FR-103, FR-403, D008 |
| F006_KudosLiveBoard | feature | Hosts the heart control, badge slots, "Mở Secret Box" button, gift list and the Highlight section that shows Kudos Quốc Dân | FR-102, FR-401, FR-406, FR-407 |
| F007_SunnerProfile | feature | Hosts badge slots on the kudo cards of its profile lists (no badge in the profile header, F007 D006 — Codex N10), collected icons and "Mở Secret Box" button | FR-102, FR-206 |
| F009_Notifications | feature | Stores and shows the heart, box and icon-set notifications this feature asks for after each save; the level-up notice is asked for by F005 using this feature's tiers (Codex N04) | D014, FR-409 |
| F010_AdminOverviewUsers | feature | Reads hearts, tiers and box counts for admin tables | FR-002 |
| F011_AdminKudoModeration | feature | Owns the spam status that stops hearts | FR-604, D015 |
| F012_AdminCampaigns | feature | Supplies campaigns and their multiplier (2–10) | FR-402 |
| Go backend API and Supabase Postgres | external-service | The Go service decides hearts, box grants and draws inside one transaction; Postgres stores hearts and boxes | FR-403, FR-404, FR-603 |

## 13. Configuration

```text
HEARTS_PER_BOX = 5           # hearts that earn one Secret Box
HERO_TIERS = New 1-4, Rising 5-9, Super 10-20, Legend more than 20
ICON_COUNT = 6               # icons to collect for the prize
NATIONAL_KUDOS_COUNT = 5     # kudos in Kudos Quốc Dân (the unfiltered Highlight)
DEFAULT_HEART_WEIGHT = 1     # weight when the campaign check succeeds and none is active (Codex R09)
GIFT_RECIPIENTS_LIMIT = 10   # rows in the board's recent-gift list
```
