---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

**Priority**: P1
**Type**: mixed

## 1. Overview

**Problem:** Sunners want to publicly thank and recognize teammates during SAA 2025, but have no place to write a structured, tagged, optionally anonymous message that then feeds the Kudos board.
**Solution:** A single write-kudo window where a Sunner picks a teammate, gives a title (Danh hiệu), writes formatted text with mentions and links, tags 1–5 hashtags, attaches up to 5 images, optionally hides their name, and sends. The author can later reopen the same window to edit their own kudo.
**Scope:** Composing, validating, sending, and editing a kudo; picking recipients, hashtags and images; the anonymous option; telling the recipient that a new kudo arrived (the notice itself is shown by F009).
**Non-Scope:** Showing kudos on the board or detail view (F006), hearts, hero badges and secret boxes (F008), the notification list and its display (F009), notifying mentioned Sunners, spam review and the spam flag itself (F011), deleting a kudo, drafts saved for later, editing another person's kudo.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | A signed-in employee taking part in SAA 2025 | Recognize a teammate with a kudo and fix their own kudo afterwards |

This feature supplies the kudos that F006 displays and F008 rewards.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Compose and send a kudo | Fill the write window, fix mistakes, and send a kudo (optionally anonymous) to a teammate | US001, US002, US003, US004, US005, US006, US007 | FR-001, FR-002, FR-003, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-209, FR-210, FR-401, FR-402, FR-404, FR-405, FR-601, FR-603, FR-604 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-007, DEC-001, DEC-002, SM-001 | TBD (draft) |
| CAP-02 | Edit own kudo | Reopen a kudo they sent and save changes | US008 | FR-102, FR-403, FR-406, FR-602, FR-604 | BR-006, BR-007, BR-008 | TBD (draft) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | May a Sunner send a kudo to themselves? | No — own name is hidden from recipient search and refused on send — resolved (applied default AD05) | A self-kudo inflates hearts and badge counts | no |
| D002 | Can senders create new hashtags, or only pick from a fixed list? | Senders may create new ones; names are lower-cased and de-duplicated — resolved (applied default AD05) | No admin screen exists to manage a fixed list | no |
| D003 | In what form is the formatted text kept? | Cleaned formatted text (HTML), sanitized by the Go backend before saving, shown the same way on the board — resolved (applied default AD05) | Simplest to display; cleaning on the server blocks harmful content | no |
| D004 | When editing, can the recipient change? | No — recipient is shown but locked — resolved (applied default AD05) | Changing it would silently move credit and hearts to someone else | no |
| D005 | Can the author edit a kudo that was marked spam? | No — editing is blocked while it is marked spam — resolved (applied default AD05) | Avoids edit-and-resubmit around moderation | no |
| D006 | Who can see the real sender of an anonymous kudo? | Admins only; one shared masking step on the server hides it from everyone else on every screen — resolved (G04) | Moderation needs it; peers do not | no |
| D007 | Does an anonymous kudo count toward the sender's distinct-senders total for the recipient's hero badge? | Yes, it counts, without revealing who — resolved (applied default AD05) | The reward should not depend on visibility | no |
| D008 | Which image types and size are allowed? | JPEG, PNG, WebP, up to 5 MB each — resolved (applied default AD05); enforced on the stored file itself, not on what the browser declares (Codex R03) | Common photo formats at a modest size | no |
| D009 | Is a mentioned Sunner notified? | No notification for mentions in the first release; only the recipient is notified of a new kudo — resolved (applied default AD05) | Mentions are not in the notification design; the recipient notice comes from X01 | no |
| D010 | Maximum title length | 100 characters — resolved (applied default AD05) | Title is shown as a heading | no |
| D011 | Exact wording of required-field errors (error frame `662:13035`) | Draft generic wording is used until captured from the design — resolved (applied default AD05) | The text is not readable in the survey notes | no |
| D012 | Leaving with typed content: confirm or discard? | Discard silently on Hủy — resolved (applied default AD05) | The design shows no confirmation | no |
| D013 | What do the two extra write-form variants (`828:13433`, `1612:5056`) change? | Treated as states of one window, not different layouts — resolved (applied default AD05) | Survey shows the same fields | no |
| D014 | What fields does the "Thêm đường dẫn" box have? | Link text and web address — resolved (applied default AD05) | Standard link insertion | no |
| D015 | Where does the edit action sit? | On the kudo detail view (F006) — resolved (applied default AD05) | Design only says "own kudo → edit" | no |
| D016 | Limit on how many kudos a Sunner can send per hour? | No limit in the first release — resolved (applied default AD05) | Spam is handled after the fact in F011 | no |
| D017 | Do abandoned uploaded images need cleanup? | Best-effort removal on cancel or remove through one delete-upload endpoint; images removed from a saved kudo are marked for deletion when the edit is saved (and can never be reused) and deleted right after; uploads never sent for over 24 hours and any images still marked for deletion may be purged by a manual admin script; no scheduled purge — resolved (applied default AD05, refined by Codex R04, N02) | Keeps scope small | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A sent kudo records sender, recipient, title, formatted text, anonymous choice, status (public on send) and times.
- **FR-002** Hashtags are shared tags reused across kudos, not free text per kudo.
- **FR-003** Attached images are kept with the kudo in the order the sender chose. Each image belongs to the person who uploaded it and can be attached to one kudo only (Codex R04).

### Navigation (1xx)

- **FR-101** The write window opens over the current page from the floating button or the rules panel's Viết KUDOS button.
- **FR-102** The author can open the same window pre-filled with their own kudo, from its detail view, to edit it.

### Write Kudo window (2xx)

- **FR-201** The recipient is required and chosen by searching Sunners by name; each result shows name and unit.
- **FR-202** The title (Danh hiệu) is required, at most 100 characters, and appears as the kudo's heading.
- **FR-203** The text editor offers bold, italic, strikethrough, numbered list, link and quote, and always shows a 0/1,000 character counter. The counter counts the visible text the way the server does: every character counts once (an emoji counts as one), runs of spaces and line breaks count as one space, and a mention counts as its shown @Name (Codex R20). Formatting adds nothing: bold, italic, a link or a mention placed right next to other text does not add a character, so formatting a valid 1,000-character message never pushes it over the limit (Codex N07).
- **FR-204** Typing @ and a name suggests Sunners and inserts a mention.
- **FR-205** The sender picks 1–5 hashtags from a dropdown or types a new one; chips can be removed and the add button disables at 5.
- **FR-206** The sender can attach up to 5 images (JPEG, PNG or WebP, up to 5 MB each), see thumbnails and remove any of them. The server checks the actual uploaded file, not what the browser claims about it; a file that is not really an allowed image refuses the whole send (Codex R03). Removing an image that was uploaded but not yet sent deletes it right away (Codex R04).
- **FR-207** A checkbox lets the sender send the kudo anonymously.
- **FR-208** Sending with a missing or invalid required field saves nothing and shows the error state on those fields.
- **FR-209** A link box (link text and web address) lets the sender add a web link into the text.
- **FR-210** A "Tiêu chuẩn cộng đồng" link opens the community standards page.

### Interaction (4xx)

- **FR-401** A valid send saves the kudo, closes the window, confirms success, and the new kudo appears on the board. The recipient then gets a "new kudo" notification and, if this kudo lifts the recipient to a higher hero badge (levels set by F008), one level-up notice for that level (Codex R10). If a notification fails or takes longer than 2 seconds, the kudo is still sent and the failure is only logged (Codex R23).
- **FR-402** If sending fails, the window stays open with everything typed and an error is shown.
- **FR-403** The author can change title, text, hashtags, images and the anonymous choice and save.
- **FR-404** An anonymous kudo never shows its sender to other Sunners, before or after an edit, nor in the recipient's notification; only admins can see the real sender.
- **FR-405** Hủy closes the window without saving and without asking for confirmation; images uploaded in this window but not yet saved are deleted on a best-effort basis. When editing, images that were already part of the kudo are only removed if the edit is saved, and are deleted after the save (Codex R04).
- **FR-406** When the author turns a named kudo anonymous, the sender's name and picture are removed from the notifications already created for that kudo, read or unread. A notification for that kudo that is created later — even one that was already on its way when the edit was saved — is stored without the sender. Turning anonymity off again does not put the name back on any of these notices (Codex N01). What the recipient already saw before the edit cannot be taken back (Codex R02).

### Security (6xx)

- **FR-601** Only signed-in Sunners can send or edit; the sender is always the signed-in person.
- **FR-602** Only the original sender can edit a kudo, and not while it is marked spam; everyone else is refused.
- **FR-603** All rules are re-checked on the server. The text is first cleaned of harmful content, and the required and 1,000-character rules are then checked on the cleaned text that is actually saved, so text that becomes empty after cleaning is refused (Codex R20).
- **FR-604** Nothing returned to other Sunners about an anonymous kudo — its fields, image addresses, page markup or notifications — contains anything that identifies its author. Image file names are random and carry no user id (Codex R01).

## 5. Business Rules

- A kudo cannot be sent to yourself (BR-001)
- A kudo has 1 to 5 distinct hashtags; senders may create new ones; names are compared ignoring case and the leading # (BR-002)
- A kudo has at most 5 images, each really a JPEG, PNG or WebP file of at most 5 MB, checked on the stored file (BR-003, Codex R03)
- Title and text are required; title is at most 100 characters and text at most 1,000 characters of visible text, counted after harmful content is removed (BR-004, Codex R20)
- An anonymous kudo hides the sender from everyone except admins while the system still knows who sent it; it still counts toward the recipient's hero badge (BR-005)
- Only the sender may edit a kudo, and not while it is marked spam; the recipient cannot be changed (BR-006)
- An uploaded image belongs to its uploader and can be attached to one kudo only; only its uploader can delete it, and only while it is not attached (BR-007, Codex R01, R03, R04)
- Turning an existing kudo anonymous removes the sender from that kudo's existing notifications (BR-008, Codex R02)
- If any required rule fails on send, nothing is saved and the offending fields are marked (DEC-001)
- When 5 hashtags are chosen, adding another is disabled but removing stays possible (DEC-002)
- The write window moves between editing, showing errors, sending and closed (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Write Kudo window (create and edit) | TBD (draft) | Title "Gửi lời cám ơn và ghi nhận đến đồng đội"; recipient, title, formatted text with toolbar and counter, hashtags, images, anonymous checkbox, Hủy and Gửi | Search and pick a recipient, write, mention, link, tag, attach, go anonymous, send, cancel, save edits |

### User Journey

1. Sunner presses the floating Viết KUDOS button on the Live board and sees the empty Write Kudo window.
2. Sunner searches and picks a recipient, types a title, and writes the message, mentioning others if wanted.
3. Sunner adds 1–5 hashtags from the dropdown and optionally images and the anonymous tick.
4. Sunner presses Gửi; missing fields show the error state until fixed.
5. The window closes, the board shows the new kudo, and the recipient is notified.
6. Later the Sunner opens their own kudo's detail view, edits it in the same window and saves.

## 7. User Stories

### US001 — Open the write form

**Actor:** Sunner
**Goal:** Open the write-kudo window from where I am.
**Business value:** Low friction raises the number of kudos sent.

**Acceptance Criteria:**
- [ ] The window opens from the floating button and from the rules panel.
- [ ] Closing with Hủy returns to the page unchanged.

### US002 — Send a kudo to a teammate

**Actor:** Sunner
**Goal:** Send a recognition message to one chosen teammate.
**Business value:** Visible recognition is the core of the Kudos program.

**Acceptance Criteria:**
- [ ] Recipient, title, text and at least one hashtag are required.
- [ ] I cannot pick myself.
- [ ] After sending, the window closes, the kudo is on the board, and the recipient gets a notification.

### US003 — Tag a kudo with hashtags

**Actor:** Sunner
**Goal:** Add 1–5 hashtags describing what I am thanking for.
**Business value:** Hashtags let the board filter and group kudos.

**Acceptance Criteria:**
- [ ] I can add and remove hashtags; the add button disables at 5.
- [ ] The same tag in different capitalization counts once.

### US004 — Attach images

**Actor:** Sunner
**Goal:** Add up to 5 images to the kudo.
**Business value:** Photos make recognition more personal.

**Acceptance Criteria:**
- [ ] Thumbnails appear for each image and each can be removed.
- [ ] A sixth image or a disallowed file is refused with a message.

### US005 — Send anonymously

**Actor:** Sunner
**Goal:** Send a kudo without my name shown.
**Business value:** People who prefer privacy still give recognition.

**Acceptance Criteria:**
- [ ] The checkbox "Gửi lời cám ơn và ghi nhận ẩn danh" is available.
- [ ] Other Sunners see no sender name for that kudo; only admins can see who sent it.

### US006 — Mention a teammate in the text

**Actor:** Sunner
**Goal:** Mention teammates by typing @ and a name.
**Business value:** Mentions credit everyone involved in the thanks.

**Acceptance Criteria:**
- [ ] Typing @ shows matching Sunners to choose from.
- [ ] The chosen name is inserted as a mention in the text.

### US007 — Fix errors and resend

**Actor:** Sunner
**Goal:** See which required fields are missing and correct them.
**Business value:** Clear errors avoid abandoned kudos.

**Acceptance Criteria:**
- [ ] Pressing Gửi with a missing field saves nothing and marks that field.
- [ ] Correcting the fields and pressing Gửi again succeeds.

### US008 — Edit my own kudo

**Actor:** Sunner
**Goal:** Correct or improve a kudo I sent.
**Business value:** Typos and omissions can be fixed without a new kudo.

**Acceptance Criteria:**
- [ ] The window opens pre-filled with my kudo; the recipient is not editable.
- [ ] Saved changes show on the kudo; other Sunners cannot edit it.

## 8. Scenarios

### US001 — Happy Path

**Given** I am on the Live board, **When** I press the floating Viết KUDOS button, **Then** the empty Write Kudo window opens over the board.

### US001 — Error: not signed in

**Given** my session has ended, **When** I open the window and press Gửi, **Then** I am told to sign in again and nothing is saved.

### US002 — Happy Path

**Given** I picked a teammate, typed a title and text and added one hashtag, **When** I press Gửi, **Then** the window closes, my kudo appears on the board, and the teammate is notified.

### US002 — Error: self as recipient

**Given** I somehow chose my own name, **When** I press Gửi, **Then** nothing is saved and I am told to choose someone else.

### US003 — Happy Path

**Given** two hashtags are chosen, **When** I add three more, **Then** five chips show and the add button is disabled.

### US003 — Error: no hashtag

**Given** no hashtag is chosen, **When** I press Gửi, **Then** the hashtag field is marked and nothing is saved.

### US004 — Happy Path

**Given** I picked three images, **When** I remove one and press Gửi, **Then** the kudo is saved with two images and the removed, never-sent image is deleted.

### US004 — Error: sixth or wrong file

**Given** five images are attached, **When** I choose another file, **Then** it is refused with a message. A file renamed to look like a picture but not really one is refused when I send, and nothing is saved (Codex R03).

### US005 — Happy Path

**Given** I ticked the anonymous checkbox, **When** I send, **Then** other Sunners and the recipient's notification show the kudo without my name, while an admin can still see it.

### US005 — Error: send fails

**Given** I ticked anonymous and the network fails, **When** I press Gửi, **Then** the window stays open, the tick and text remain, and an error is shown.

### US006 — Happy Path

**Given** I type @ and the first letters of a name, **When** I pick a Sunner, **Then** the name is inserted as a mention.

### US006 — Error: no match

**Given** I type @ and letters matching nobody, **When** the list loads, **Then** it shows an empty state and no mention is inserted.

### US007 — Happy Path

**Given** my first attempt marked the title field, **When** I fill it and press Gửi, **Then** the kudo is sent.

### US007 — Error: still invalid

**Given** the text is 1,001 visible characters (exactly 1,000 is allowed), **When** I press Gửi, **Then** the counter and field are marked and nothing is saved (Codex R20).

### US008 — Happy Path

**Given** I opened my kudo for editing, **When** I change the title and save, **Then** the window closes and the kudo shows the new title.

### US008 — Error: not the author

**Given** I am not the sender, **When** I try to save an edit, **Then** I am told I cannot edit this kudo and nothing changes.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Text pasted longer than 1,000 characters | Counter is marked; send blocked; server also refuses | "Content must be 1,000 characters or fewer." (draft wording, D011) |
| Gửi pressed twice quickly | Button is disabled while sending; only one kudo is created | None — silent handling |
| Sixth hashtag attempted | Add button disabled; extra tags never reach save | None — control is disabled |
| Sixth image or unsupported file chosen | File refused, existing images untouched | "You can attach up to 5 images in supported formats." |
| Image file claims to be a JPEG, PNG or WebP but is not, or is larger than 5 MB once stored | Send refused, nothing saved, typed input kept (Codex R03) | "One of the images is not a supported file. Remove it and try again." (draft wording, D011) |
| Text contains only spaces, or only content that is removed when cleaned | Send refused, nothing saved (Codex R20) | "Please write your message." (draft wording, D011) |
| Two kudos lift the recipient to a new hero level at the same moment | Exactly one level-up notice for that level (Codex R10) | None — silent handling |
| Named kudo later turned anonymous | Sender removed from the recipient's existing notices for that kudo (Codex R02) | None — silent handling |
| A "new kudo" notice arrives just after the kudo was made anonymous, and the author later makes it named again | The late notice is stored without the sender; making the kudo named again does not add the name to any old notice (Codex N01) | None — silent handling |
| Author saves two edits of the same kudo from one stale window, the first removing an image the second still keeps | The second save is refused and nothing in it is saved; the removed image stays removed (Codex N02) | "One of the images is not a supported file. Remove it and try again." (draft wording, D011) |
| A kudo from a repeat sender arrives while an admin restores another sender's kudo from spam | No level-up notice from the repeat sender's kudo (Codex N05) | None — silent handling |
| Image upload fails midway | Thumbnail shows retry and remove; Gửi waits until uploads finish or fail images are removed | "Image could not be uploaded. Retry or remove it." |
| Recipient no longer exists at send time | Nothing saved, window stays open | "This recipient is no longer available." |
| Session expires while writing | Nothing saved, typed input stays | "Your session has expired. Please sign in again." |
| Non-author opens or saves an edit | Refused, nothing changes | "You can only edit your own kudos." |
| Author tries to edit a kudo marked spam | Refused, nothing changes | "This kudo cannot be edited right now." (draft wording, D011) |
| Recipient notification cannot be created, or takes more than 2 seconds | Kudo stays sent; the failure is only logged (Codex R23) | None — silent handling |
| Title longer than 100 characters | Title field marked; send blocked; server also refuses | "Title must be 100 characters or fewer." (draft wording, D011) |
| Kudo removed before edit is saved | Nothing saved | "This kudo is no longer available." |
| Pasted text contains scripts or unsupported formatting | Unsupported parts are dropped silently | None — silent handling |
| Recipient search finds nobody | Empty list shown | "No matching Sunner." |

## 10. Edge Behaviours to Verify

- **FR-201** → Typing part of a name lists matching Sunners with unit; the sender's own name is absent.
- **FR-203** → Text of exactly 1,000 visible characters can be sent; 1,001 cannot, and the counter agrees with the server at both (emoji count as one, repeated spaces as one) (Codex R20); "a**b**c" counts as 3, and the same 1,000/1,001 results hold with bold, links and mentions applied (Codex N07).
- **FR-205** → After five hashtags the add button is disabled; removing one re-enables it.
- **FR-206** → Five thumbnails can be shown and each removed; a sixth is refused; a file whose real content or size breaks the rules is refused at send (Codex R03).
- **FR-208** → Gửi with an empty title marks the title and saves nothing.
- **FR-401** → After a valid send the window closes, the kudo is on the board, and the recipient has one new-kudo notification.
- **FR-402** → After a failed send, all typed input is still there.
- **FR-404** → An anonymous kudo shows no sender to another Sunner or in the recipient's notification, also after an edit; an admin sees the sender.
- **FR-403** → Edited values appear on the kudo after save.
- **FR-602** → A different Sunner cannot save an edit to my kudo, and I cannot edit it while it is marked spam.
- **FR-603** → Pasted script text never appears in a saved kudo; text that is empty after cleaning is refused (Codex R20).
- **FR-604** → Another Sunner reading an anonymous kudo with images finds no author identifier in any field or image address (Codex R01).
- **FR-405** → Removing a never-sent image or pressing Hủy deletes the uploaded file; images removed in an edit are deleted only after the save, and a second save from an out-of-date window cannot bring a removed image back (Codex R04, N02).
- **FR-406** → After a named kudo is made anonymous, the recipient's old notices for it show no sender (Codex R02); named send → anonymous edit → late notice → named edit leaves no sender in either notice (Codex N01).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Anonymity depends on every screen that reads kudos hiding the sender, not only on this feature; mitigated by one shared server-side masking step used by every read (X05) | A single leaking screen reveals anonymous senders | [INFERRED] |
| RISK-02 | risk | Images uploaded but never sent may remain in storage when best-effort deletion fails; accepted for the first release — the files have random names with no user id, and uploads never sent for over 24 hours, or removed images whose deletion failed, can be purged by a manual admin script (D017, Codex R01, R04, N02) | Storage growth | [INFERRED] |
| RISK-03 | known-issue | A recipient who already read a named notification before the kudo was made anonymous has seen the name; this cannot be recalled (Codex R02) | Limited anonymity after a late change | [INFERRED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_AppShellI18n | feature | Floating button and rules panel open the write window | FR-101 |
| F002_GoogleAuth | feature | Signed-in session and the Sunner directory (names, units, avatars) | FR-601, FR-201 |
| F004_StaticEventContent | feature | Community standards page the window links to | FR-210 |
| F006_KudosLiveBoard | feature | Shows the sent kudo, hides anonymous senders, hosts the edit action | FR-401, FR-404, D015 |
| F008_KudosGamification | feature | Counts senders and hearts from the kudos created here; owns the hero levels used to detect a level-up when a kudo is sent | BR-005, D007, FR-401 |
| F009_Notifications | feature | Shows the "new kudo" and level-up notifications this feature creates (this feature is the only source of level-up notices, Codex N04); stores no sender for a kudo that is anonymous when the notice is created and hides the sender on read when the kudo is currently anonymous (Codex N01) | FR-401, FR-406 |
| F011_AdminKudoModeration | feature | Owns the spam flag that blocks editing; its spam/restore changes wait for a kudo being sent to the same recipient so they never cause a level-up notice (Codex N05) | D005 |
| Supabase Storage | external-service | Holds attached images in a private bucket that itself enforces the 5 MB and image-type limits | FR-003, FR-206 |

## 13. Configuration

```text
CONTENT_MAX_CHARS = 1000      # longest allowed kudo text, visible characters after cleaning (Codex R20)
HASHTAGS_MAX = 5              # most hashtags per kudo
IMAGES_MAX = 5                # most images per kudo
TITLE_MAX_CHARS = 100         # D010
IMAGE_MAX_MB = 5              # D008 (JPEG, PNG, WebP), checked on the stored file (Codex R03)
NOTIFY_TIMEOUT_SECONDS = 2    # post-send notification bound (Codex R23)
```
