---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-write-kudo-modal — Screen Spec

**Screen**: SCR-write-kudo-modal: Viết Kudo (create and edit)
**Feature**: F005_KudoCompose
**Type**: composite
**Route**: modal over `/kudos` (Figma `520:11602`; variants `828:13433`, `1612:5056`, edit `1949:13746`); other host pages TBD (draft)
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner writes, or edits, a kudo to thank a teammate and sends it, from a window that opens over the page they are on.
**Actors:** Sunner
**Entry Conditions:** Signed-in Sunner pressed the floating "Viết KUDOS" button or the Viết KUDOS button in the Thể lệ panel; for edit, the Sunner opened their own kudo's edit action.
**Exit Conditions:** Kudo sent (window closes, Live board shows it), edits saved (window closes), or Hủy pressed (window closes, nothing saved).

## 2. Screen Layout

### Layout Sketch

Centered modal over a dimmed page. Top: heading "Gửi lời cám ơn và ghi nhận đến đồng đội". Middle: stacked form fields (recipient, title with hint, editor with toolbar, hashtags, images, anonymous checkbox). Bottom: Hủy and Gửi buttons. Small popovers (recipient list, hashtag list, link box, mention list) float above the form. Responsive breakpoints: TBD (draft).

```
┌───────────────────────────────────────────────┐
│ R1: Heading "Gửi lời cám ơn và ghi nhận…"     │
├───────────────────────────────────────────────┤
│ R2: Người nhận* [ search select        ▾ ]    │
│     Danh hiệu*  [ title input            ]    │
│     (hint: title shows as the Kudos heading)  │
│ R3: [B][I][S][1.][link][quote]  Tiêu chuẩn…  │
│     [ rich text area            ]  0/1,000    │
│ R4: Hashtag* [#tag x][#tag x] [+ Hashtag]     │
│ R5: Image    [thumb x]…(max 5)  [+]           │
│ R6: [ ] Gửi lời cám ơn và ghi nhận ẩn danh    │
├───────────────────────────────────────────────┤
│ R7:                        [ Hủy ]  [ Gửi ]   │
└───────────────────────────────────────────────┘
 - - - R8: floating popovers (recipient list, hashtag list, link box, mention list) - - -
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Heading | static | no | TBD (draft) |
| R2 | Recipient and title | static | no | TBD (draft) |
| R3 | Rich text editor | static | yes (long content) | TBD (draft) |
| R4 | Hashtags | static | no | TBD (draft) |
| R5 | Images | static | no | TBD (draft) |
| R6 | Anonymous option | static | no | TBD (draft) |
| R7 | Actions | static | no | TBD (draft) |
| R8 | Floating popovers | floating | yes (lists) | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Người nhận | select (searchable) | yes | Empty, placeholder | Always | Opens recipient list (E15) | TBD (draft) | name + unit | placeholder text | TBD (draft) |
| E02 | Danh hiệu | text input | yes | Empty, placeholder "Dành tặng một danh hiệu cho đồng đội" | Always | — | TBD (draft) | raw, max 100 characters | placeholder text | TBD (draft) |
| E03 | Title hint | message | — | "Danh hiệu sẽ hiển thị làm tiêu đề của Kudos" (wording from design to confirm) | Always | — | static | raw | — | N/A |
| E04 | Formatting toolbar | button group | — | Enabled | Always | Bold, italic, strikethrough, numbered list, link, quote | — | — | — | N/A |
| E05 | Kudo content | textarea (rich text) | yes | Empty | Always | Typing `@` opens mention list (E17) | TBD (draft) | formatted text | placeholder text | TBD (draft) |
| E06 | Character counter | display field | — | 0/1,000 | Always | — | computed | n/1,000 visible characters, same count as the server: emoji = 1, repeated spaces and line breaks = 1, mention = its @Name (Codex R20); formatting adds nothing — "a**b**c" = 3, a link or mention next to text adds no character, each line or paragraph break = one space before collapsing (Codex N07) | — | N/A |
| E07 | Tiêu chuẩn cộng đồng | link | — | Enabled | Always | Opens community standards | static | — | — | N/A |
| E08 | Hashtag chips | list | yes (1–5) | Empty | Always | Remove a chip | TBD (draft) | #name, lower-cased | hidden | TBD (draft) |
| E09 | + Hashtag | button | — | Enabled | Always (disabled at 5) | Opens hashtag list (E16) | — | — | — | N/A |
| E10 | Image thumbnails | list | no (max 5; JPEG, PNG, WebP up to 5 MB each, checked on the stored file at send — Codex R03) | Empty | Always | Remove a thumbnail (a never-sent image is deleted right away; in edit mode a saved image is removed only when the edit is saved — Codex R04) | TBD (draft) | thumbnail | hidden | TBD (draft) |
| E11 | Add image | button / file input | — | Enabled | Always (hidden at 5) | Picks image files | — | — | — | N/A |
| E12 | Anonymous checkbox "Gửi lời cám ơn và ghi nhận ẩn danh" | checkbox | no | Unchecked | Always | Toggles anonymous send | — | — | — | TBD (draft) |
| E13 | Hủy | button | — | Enabled | Always | Closes without saving | — | — | — | N/A |
| E14 | Gửi | button | — | Enabled | Always | Sends (or saves in edit mode) | — | — | — | N/A |
| E15 | Recipient list | list (popover) | — | Hidden | Conditional | Pick a Sunner | TBD (draft) | avatar, name, unit | "No matching Sunner" | TBD (draft) |
| E16 | Hashtag list | list (popover) | — | Hidden | Conditional | Pick a hashtag or add the typed name as a new one | TBD (draft) | #name | offers the typed name as a new hashtag | TBD (draft) |
| E17 | Mention list | list (popover) | — | Hidden | Conditional | Pick a Sunner to mention | TBD (draft) | avatar, name | "No matching Sunner" | TBD (draft) |
| E18 | Add link box "Thêm đường dẫn" | popover form | — | Hidden | Conditional | Confirm link into text | — | link text + web address | — | N/A |
| E19 | Field error messages | message | — | Hidden | Conditional | — | static | text | hidden | N/A |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Search and pick recipient | E01 | type, click row | — | Recipient chosen, list closes | TBD (draft) |
| Enter title | E02 | type | — | Title set | TBD (draft) |
| Format text | E04 | click | text selected or cursor | Formatting applied | TBD (draft) |
| Mention a Sunner | E05 | type `@` + letters, click row | — | Mention inserted | TBD (draft) |
| Add link | E04, E18 | click link, confirm | — | Link added to text | TBD (draft) |
| Open community standards | E07 | click | — | Standards page opens in a new tab | TBD (draft) |
| Add hashtag | E09 | click, pick row | fewer than 5 chips | Chip added | TBD (draft) |
| Remove hashtag | E08 | click remove | — | Chip removed | TBD (draft) |
| Add image | E11 | pick files | fewer than 5 thumbnails | Thumbnail shown with progress | TBD (draft) |
| Remove image | E10 | click remove | — | Thumbnail removed; a never-sent upload is deleted best-effort, a saved image is removed when the edit is saved (Codex R04) | TBD (draft) |
| Toggle anonymous | E12 | click | — | Checkbox toggled; in edit mode, saving with it ticked also hides the sender in the recipient's existing notices for this kudo (Codex R02) | TBD (draft) |
| Cancel | E13 | click | — | Window closes without confirmation, input discarded, images uploaded in this window and never sent are deleted best-effort; saved images of an edited kudo are untouched (Codex R04) | TBD (draft) |
| Send / Save | E14 | click | — | Validates, then submits (see § 5, § 6) | TBD (draft) |

### Happy Path

1. Sunner presses Viết KUDOS and the window opens in R1–R7 with empty fields.
2. Sunner types in E01, picks a teammate from E15.
3. Sunner types a title in E02 and writes the message in E05, mentioning someone if wanted.
4. Sunner adds one or more hashtags with E09 and optionally images with E11.
5. Sunner optionally ticks E12.
6. Sunner presses Gửi; the button shows a saving state, then a success confirmation appears and the window closes. The recipient is notified in the background (F009); a slow or failed notice never delays or undoes the send (Codex R23).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Step 6 | A required field is empty or invalid | Error state on those fields (E19), window stays open | TBD (draft) |
| Step 6 | Send fails | Error message shown, all input kept | TBD (draft) |
| Step 1 (edit) | Window opened from an own kudo's detail view | Fields pre-filled; recipient shown but locked; Gửi saves changes | TBD (draft) |
| Step 1 (edit) | Own kudo is marked spam | Edit is refused; message that the kudo cannot be edited now | TBD (draft) |
| Step 4 | Five hashtags chosen | E09 disabled | TBD (draft) |
| Step 4 | Five images attached | E11 hidden or disabled | TBD (draft) |

### Interaction Notes

- **Typing in the recipient or mention box waits a moment before searching, so each keystroke does not trigger a search** — source: `TBD (draft)`
- **Pressing Gửi while images are still uploading waits for them or asks to remove failed ones** — source: `TBD (draft)`

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Recipient, mention or hashtag list is fetching; edit data loading | Small spinner in the list; in edit mode skeleton fields | keep typing; none in edit mode | TBD (draft) |
| empty | Search has no match; no hashtags chosen yet | "No matching Sunner"; placeholder text in chip area | change query | TBD (draft) |
| error | Required field missing (variant `662:13035`) | Field outlines and messages in E19 | fix fields, Gửi | TBD (draft) |
| error | Send or image upload fails | Error banner; failed thumbnail with retry | retry, remove, Gửi | TBD (draft) |
| saving | Gửi pressed and request running | Gửi spinner, form disabled | none | TBD (draft) |
| success | Kudo sent or edit saved | Toast confirmation, window closes | dismiss toast | TBD (draft) |
| anonymous-on | E12 ticked (`2099:9148`) | Checkbox checked; hint that the name will be hidden (wording to confirm) | untick | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E01 | Required; cannot be yourself | "Please choose a recipient." (draft wording, D011) | submit |
| E02 | Required; at most 100 characters | "Please enter a title." / "Title must be 100 characters or fewer." (draft wording, D011) | submit, blur |
| E05 | Required; at most 1,000 visible characters after the server removes harmful content; whitespace-only or content that is entirely removed counts as empty (Codex R20) | "Please write your message." / counter marked when over (draft wording, D011) | change, submit |
| E08 | At least 1, at most 5 | "Please add at least one hashtag." (draft wording, D011) | submit |
| E10 | At most 5; JPEG, PNG or WebP up to 5 MB each; the server re-checks the real stored file at send (Codex R03) | "You can attach up to 5 images in supported formats." on pick / "One of the images is not a supported file. Remove it and try again." on send (draft wording, D011) | change, submit |
| E14 | Server may refuse (session ended, recipient gone, not the author, kudo marked spam) | "Could not send your kudo. Please try again." / "You can only edit your own kudos." / "This kudo cannot be edited right now." (draft wording, D011) | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Counter is always shown | hardcoded-id | E06 | Always | Never | Design variants are states of one window (functional-spec D013); the counter shows in every state |
| Recipient is locked while editing | auth | E01 | Window is in edit mode (read-only, no list) | Create mode (editable) | Resolved D004 |
| Lists open only on interaction | responsive | E15, E16, E17, E18 | User opens or types | Otherwise | — |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`. It is not a second source of truth. Source for this draft: `docs/SCREENFLOW.md` navigation graph.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Sun* Kudos - Live board | Floating button "Viết KUDOS" | Signed in | TBD (draft) |
| Thể lệ panel | Viết KUDOS button | Signed in | TBD (draft) |
| View Kudo (own kudo) | Edit action on the detail view, next to Đóng | Viewer is the sender and the kudo is not marked spam | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Send | E14 | Valid | Sun* Kudos - Live board | toast then window closes | TBD (draft) |
| Cancel | E13 | — | (stays on host page) | window closes | TBD (draft) |
| Community standards | E07 | — | Tiêu chuẩn cộng đồng | new tab | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Dialog role with title; labelled fields; combobox pattern for recipient and mention lists |
| Keyboard navigation | [EXPECTED] | Full tab order; arrow keys in lists; Esc closes; Enter picks list item |
| Focus management | [EXPECTED] | Focus trapped in the window; first field focused on open; focus returns to the opener on close; first invalid field focused on error |
| Screen reader compatibility | [EXPECTED] | Chips, thumbnails and counter announced with labels |
| Error announcement | [EXPECTED] | Field errors in a live region |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
