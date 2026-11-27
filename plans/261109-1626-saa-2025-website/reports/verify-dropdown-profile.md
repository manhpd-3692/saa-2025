# Verify: dropdown-profile (avatar menu as Sunner, on /)

**Verdict: PASS** (same Errors concern as login; see verify-login.md)

Viewport 1440×1024 CSS px on `[::1]` for the header/footer; the open menu was measured on `localhost` (CSS px, identical layout values; see Notes). Reference: docs/figma-refs/user/dropdown-profile.png.

## Visual comparison

| Element | Expected (reference) | Actual (CSS px) | Result |
|---|---|---|---|
| Menu card | ≈132 × 122 px, gold border, dark fill | 138 × 127 px, border 1.33 px `rgb(153,140,95)`, radius 8 px | OK (≈5 %) |
| Profile row (hovered) | olive highlight, bold white, person icon | 124 × 56 px, bg `rgba(255,234,158,0.1)` on hover, bold 16 px white, person icon | OK |
| Logout row | bold white, chevron icon | same, chevron icon | OK |
| Admin item | absent for Sunner | absent | OK |

Hover state was reproduced by moving the pointer to Profile (reference state).

## Signed-in header and footer on `/` vs docs/figma-refs/user/homepage-saa.png

Measured at true 1440 px on `[::1]:3000/`. The reference is 1512 px wide and was read at its downscaled preview, so positions are approximate (±10–15 px).

| Element | Reference (approx, scaled to 1440) | Actual | Result |
|---|---|---|---|
| Header height | ≈77 px | 80 px | OK |
| Logo | x≈139–181 | x 144–196 | OK |
| Nav: About / Award Information / Sun* Kudos | x≈262 / 429 / 616 | x 260 / 450 / 645 | OK (spacing ~15–20 px wider in actual) |
| Active nav item | yellow text + underline | yellow text + underline (underline looks white-grey in actual, gold in reference) | To confirm |
| Bell, language, avatar | x≈1111, 1168–1227, 1282 | 1103, 1150–1222, 1276 | OK |
| Footer height | ≈140 px | 144 px | OK |
| Footer logo + links | matches | matches | OK |
| Footer copyright | x≈1092–1354 | x 1078–1350 | OK |
| Footer "Award Information" chip | grey highlight box | no highlight | Discrepancy (minor; spec FR-101 only requires header highlight). Needs confirmation |
| Floating button | cream pill, bottom-right | cream pill, bottom-right | Placement discrepancy, see fab-closed |

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-201 avatar menu lists Profile and Logout (Admin for admins only) | PASS | Sunner menu items: Profile, Logout |
| F001 FR-602 avatar/bell not shown without session | PASS | Login has no avatar; signed-in `/` shows avatar and bell |
| F002 FR-104 logout takes Sunner to Login | PASS | Logout → `/login` (cookies cleared) |
| F002 FR-402 after logout, protected page asks for sign-in again | PASS | `/profile` → `/login?next=%2Fprofile`; reload stays on Login |
| F002 SC-006 after logout a protected request redirects to Login | PASS | As FR-402. Also e2e "Logout ends the session … (SC-006, FR-104, FR-402)" passed (first run, 29 passed) |
| F001 DEC-001 avatar menu for non-admin | PASS | e2e "a Sunner's avatar menu lists Profile and Logout only" passed |
| F002 FR-104 avatar placement | PASS | Avatar at top right inside header |

## Error check

- Console error level on `/` (signed-in): none.
- Network: no 4xx/5xx on signed-in `/`. On logout, Supabase `POST /auth/v1/logout?scope=local` returned **403** (session already revoked server-side by an earlier logout in this session). The browser still cleared the session cookies and landed on Login, so the user-facing result is correct, but the server-side revoke could not be confirmed.
- Logs: `web.log` shows the one hydration warning (see verify-login.md). `api.log`: no new lines.

## Evidence

- `evidence/screens/dropdown-profile/actual-home-user-1440.png` — signed-in `/` at true 1440 px (header/footer)
- `evidence/screens/dropdown-profile/actual-open-hover.png` — menu open, Profile hovered (localhost, half-scale)
- `evidence/screens/dropdown-profile/actual-open.png` — menu open (localhost, half-scale)
- `evidence/screens/dropdown-profile/actual-home-user.png` — signed-in `/` (localhost, half-scale)
- `evidence/screens/dropdown-profile/ref-*` — not produced (reference cannot be rasterised in the sandbox)

## Notes

- The reference is a 1512 px full-page capture. Its header was compared at the preview scale only.

## Round 2 re-check

**Verdict: PASS.** Visual unchanged from round 1. Keyboard navigation (new in round 2) works on every path tested.

Method: `localhost:3000`, Sunner session, `localhost` zoomed to 50 % (CSS px measurements are valid). Hover is set on Profile (reference state), then the keyboard path runs.

### Visual

| Element | Expected (reference) | Actual (round 2, CSS px) | Result |
|---|---|---|---|
| Card | ≈132 × 122, gold border | 138.4 × 126.7, border 1.33 px rgb(153,140,95), radius 8 px | Same as round 1 (about 5 % wider, accepted in round 1) |
| Profile row, hovered or focused | olive highlight, bold | bg rgba(255,234,158,0.1), bold 16 px, person icon | PASS |
| Logout row | bold, chevron | bold, chevron | PASS |
| Admin row | absent for Sunner | absent (2 items) | PASS |

### Keyboard (round 2 change)

| Step | Expected | Actual | Result |
|---|---|---|---|
| Open (click) | first item focused | Profile focused | PASS |
| ArrowDown / ArrowUp | move, wrap at the ends | Profile to Logout to Profile; Logout to Profile to Logout | PASS |
| Home / End | first / last | Home to Profile, End to Logout | PASS |
| Escape | close, focus to trigger | closed, aria-expanded false, focus on trigger | PASS |
| Enter on trigger | open, first item focused | Profile focused | PASS |
| Tab from last item | close, focus moves on | menu closed; focus lands on header logo | PASS (closes). Minor: focus restarts at top of page, see below |
| Shift+Tab from first item | close (focus leaves) | focus to trigger, menu stays open | Judgment: the trigger is part of the same component. Not counted as a defect |
| Focus indicator | visible | browser focus ring (outline auto) plus tint | PASS |

Pointer click on the page body closes the menu.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-201 avatar menu lists Profile and Logout (Admin for admins only) | PASS | Items: Profile, Logout |
| F001 DEC-001 non-admin menu | PASS | 2 items |
| F002 FR-104 logout takes Sunner to Login | PASS (round 1) | Not re-run this round (it would end the session) |

## Observations (not counted as defects)

- Tab-out focus: the menu closes, but focus lands on the header logo, not on the next control after the avatar (the FAB or footer). The admin menu does the same. Controller to decide: move focus to the next focusable element on Tab-out, or accept the browser's default.
- Slow server `/me`: one home load took 5.2 s (application-code 5.1 s) this round. Per design (F001 A1), a timeout renders the header without avatar and bell. It was seen once and cleared on the next navigation. See verify-phase-03-checks.md.

## Evidence

- `evidence/screens/dropdown-profile/actual-open-hover-viewport-r2.png`: viewport, Profile hovered and focused. An element capture came out blank under zoom and was removed.
