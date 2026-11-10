---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-login — Screen Spec

**Screen**: SCR-login: Login (Figma frame `662:14387`, SCREENFLOW U1)
**Feature**: F002_GoogleAuth
**Type**: atomic
**Route**: `/login`
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A Sunner who is not signed in uses this screen to sign in with their Google account before entering the SAA 2025 site.
**Actors:** Sunner (signed out)
**Entry Conditions:** The visitor has no valid session and opened the site, a protected link, or was logged out.
**Exit Conditions:** Google sign-in is started and the visitor leaves for Google; after consent they are signed in and leave this screen.

## 2. Screen Layout

### Layout Sketch

Full-page 1440-wide desktop frame dominated by the "ROOT FURTHER" key visual, with a language switch (showing the current language, VN) at the top and a footer with the copyright line. The "LOGIN With Google" button sits in the main area beside or below the key visual; exact placement and spacing are `[EXPECTED]` until read from Figma (view-only access, no Dev Mode). Release acceptance is desktop only: minimum viewport width 1280 px; below that the page keeps its desktop layout and scrolls horizontally. Mobile and Tablet frames are out of release scope (AD01, R17). Rendered under the minimal chrome of `app/(minimal)/layout.tsx` owned by F001 (Codex R07).

```
┌──────────────────────────────────────────────┐
│ R1: Top bar                    [VN ▾] (static)│
├──────────────────────────────────────────────┤
│ R2: Key visual "ROOT FURTHER"                 │
│        [ LOGIN With Google ]                  │
│        (error message area, when shown)       │
├──────────────────────────────────────────────┤
│ R3: Footer — copyright (static)               │
└──────────────────────────────────────────────┘
```

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | ROOT FURTHER key visual | image | — | Shown | Always | — | static | raw | — | N/A |
| E02 | Language switch (VN) | button | — | Current language | Always | Opens the language dropdown (hosted by the App Shell feature) | TBD (draft) | language code | — | TBD (draft) |
| E03 | LOGIN With Google | button | — | Enabled | Always | Starts Google sign-in | static | — | — | N/A |
| E04 | Sign-in message | message | — | Hidden | Conditional | — | TBD (draft) | plain text | hidden | TBD (draft) |
| E05 | Copyright line | display field | — | Shown | Always | — | static | raw | — | N/A |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Start Google sign-in | E03 | click | Button not already loading | Button shows loading and is disabled | TBD (draft) |
| Change language | E02 | click | — | Language dropdown opens; chosen language re-renders the screen text | TBD (draft) |

### Happy Path

1. The visitor sees the key visual and the "LOGIN With Google" button (R2).
2. The visitor clicks "LOGIN With Google"; the button shows a loading state.
3. The browser leaves for Google's account chooser; the screen's part ends here.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| After returning from Google | Sign-in cancelled, refused or failed | Login shows again with a message in E04 and a usable button | TBD (draft) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| default | Page load | Key visual, enabled button, no message | Click E03, change language | TBD (draft) |
| loading | Click on E03 | Button spinner and disabled | none | TBD (draft) |
| empty | — | N/A — screen shows no data list | — | TBD (draft) |
| error | Return from Google with a failure reason | E04 shows the matching message; button enabled | Retry via E03 | TBD (draft) |
| saving | — | Same as loading (no separate form submit) | none | TBD (draft) |
| success | Sign-in completes | Screen is left; no success message here | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E04 | Sign-in cancelled at Google | "Sign-in was cancelled. Please try again." | server response |
| E04 | Google account is not on `@sun-asterisk.com` (reason `domain_not_allowed`) | "This Google account is not allowed to sign in." | server response |
| E04 | Signed in but the profile could not be recreated (reason `profile_unavailable`, Codex R22) | "Your profile could not be loaded. Please sign in again." *(copy to confirm)* | server response |
| E04 | Any other failure | "We couldn't finish signing you in. Please try again." | server response |

Message wording is a placeholder `[EXPECTED]`; final Vietnamese and English copy comes from design (D006). The Google account chooser is pre-filtered to company accounts, but the `@sun-asterisk.com` rule is enforced after the return from Google and again by the backend on every request.

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| The previous sign-in attempt failed | hardcoded-id | E04 | Visitor returns from a failed attempt | First visit or no failure | Display only; reason keys are a fixed set |

## 8. Navigation

> `## 8. Navigation` is the per-screen projection of `screen-flow.md § Screen Access Paths`; every row derives from `docs/SCREENFLOW.md` (Navigation Graph) or is `TBD (draft)`.

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external | Visitor opens the site or a link without a session | No valid session | TBD (draft) |
| any signed-in page | Missing-profile recovery failed; session signed out in the browser (directly, or via `ProfileRecoveryRedirect` when a server-rendered layout hit the failure), then `location.replace('/login?error=profile_unavailable')` (Codex R22, N06) | Profile record missing and re-provision failed | TBD (draft) |
| Dropdown-profile (App Shell) | Logout | Signed in | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Sign in with Google | E03 | Google consent succeeds | Homepage SAA, or Countdown - Prelaunch before the event starts (codes TBD (draft)) | redirect | TBD (draft) |
| Sign in with Google | E03 | Google consent fails or is cancelled | (stays on screen) | redirect back with E04 | TBD (draft) |
| Change language | E02 | — | (stays on screen) | modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Button has an accessible name "LOGIN With Google"; key visual has alt text or is marked decorative |
| Keyboard navigation | [EXPECTED] | Language switch and Google button reachable by Tab in reading order; Enter/Space activates |
| Focus management | [EXPECTED] | After a failed return, focus moves to the message or the button |
| Screen reader compatibility | [EXPECTED] | Page has a main landmark and a heading; footer is a contentinfo landmark |
| Error announcement | [EXPECTED] | E04 is announced when it appears (live region) |

## 10. Responsive Behavior

Desktop only (AD01, R17): minimum viewport width 1280 px; narrower windows keep the desktop layout with horizontal scroll. No mobile or tablet layout is in release scope.
