# Verify: dropdown-profile-admin (avatar menu as admin)

**Verdict: FAIL (minor)**. The label is now "Admin", as the spec and the controller decided (F001 FR-201, DEC-001). That makes the card about 25 px narrower than the design's "Dashboard" card, so the width needs a decision.

## Round 1 re-check

Admin session on `localhost:3000`. The menu needs hydration, and `[::1]` is not hydrated under `next dev`. The browser zooms `localhost` (`innerWidth` 2880, DPR 0.5 or 0.75), so CSS-px measurements are used. Reference: docs/figma-refs/user/dropdown-profile-admin.png.

| Element | Expected (reference) | Actual (round 1, CSS px) | Result |
|---|---|---|---|
| Card | ≈163 × 180, gold border | 138 × 183, border 1.33 px `rgb(153,140,95)`, radius 8 px | **Discrepancy** (width −25 px follows the label change; height +3 px) |
| Items | Profile (icon), Dashboard (icon), Logout (chevron) | Profile, **Admin**, Logout | **Discrepancy** (copy: spec "Admin" chosen over Figma "Dashboard") |
| Profile highlight | olive highlight, bold | on hover: background `rgba(255,234,158,0.1)`, bold | PASS (captured in the hovered state, the reference state) |
| Item rows | 56 px rows | 56 px rows | PASS |

Round 0 had not captured the Profile highlight. It is captured now.

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-201 admin sees the admin entry in the avatar menu | PASS | Entry "Admin" → `/admin` |
| F001 DEC-001 admin sees Profile, Admin, Logout | PASS | Menu items match. e2e test 7 PASS |
| F001 SC-003 admin session shows admin item; user session does not | PASS (admin side) | Sunner side from round 0. e2e test 2 PASS |
| F001 SC-008 role change applies at focus without reload | PASS | Blocked by WSL `psql` timeout in round 0. e2e test 8 PASS in round 1 (1.6 min) |
| F002 FR-603 / SC-004 admin gets the admin area | PASS | e2e test 27 PASS |
| F002 FR-601 Admin item only for admins | PASS | e2e test 7 PASS |

## Decisions needed

1. Copy: "Admin" is recorded as the controller decision. Either update the design, or revert the label to "Dashboard".
2. Width: with "Admin" the card is 138 px against the 163 px frame. Accept the narrower card, or set a min-width of 163 px to keep the frame.

## Error check

- Console: HMR websocket refusals on `[::1]` only (dev-only). Nothing from the menu.
- Network: no 4xx/5xx on admin navigation.
- Logs: no new ERROR lines. The slow Go `/me` loads (5.1–5.2 s on `/`) are in the phase checks report.

## Evidence

- `evidence/screens/dropdown-profile-admin/actual-admin-viewport-r1.png`: viewport capture (zoomed browser, not the 1440 frame). Menu open, Profile highlighted.
- The element-only capture came back blank under the zoom change and was deleted.

## Round 2 re-check

**Verdict: PASS**, with the two controller decisions applied (copy "Admin", card width 138 px). The round 1 FAIL came from those decisions, not from a defect. Keyboard navigation works.

Method: `localhost:3000`, admin session (`playwright/.auth/admin.json`), English (no `saa_locale` cookie, matching the Figma labels). Zoomed to 50 % (CSS px).

### Visual

| Element | Expected (reference) | Actual (round 2, CSS px) | Result |
|---|---|---|---|
| Card | ≈163 × 180 | 138.4 × 182.7 | Width: controller decision (shorter label "Admin", same width as the Sunner card). Height +3 px: inside read-by-eye tolerance. Accepted |
| Items | Profile, Dashboard, Logout | Profile, **Admin**, Logout | Label: controller decision DEC-001 (spec over Figma). Accepted |
| Profile row, hovered | olive highlight, bold | bg rgba(255,234,158,0.1), bold | PASS |
| Item rows | 56 px | 56 px | PASS |

### Keyboard (round 2 change)

| Step | Expected | Actual | Result |
|---|---|---|---|
| Open | Profile focused | Profile focused | PASS |
| ArrowDown x3, ArrowUp | Profile to Admin to Logout to Profile (wrap); Up wraps back | Admin, Logout, Profile, Logout | PASS |
| End / Home | Logout / Profile | Logout / Profile | PASS |
| Escape | close, focus to trigger | closed, focus on trigger, aria-expanded false | PASS |
| Enter on trigger | open | Profile focused | PASS |
| Tab x3 from Profile | Admin, Logout, then leave (close) | Admin, Logout, then closed (focus on header logo) | PASS (same minor note as the Sunner menu) |

## Acceptance criteria

| AC | Result | Proof |
|---|---|---|
| F001 FR-201 admin sees the admin entry | PASS | "Admin" links to /admin |
| F001 DEC-001 admin menu: Profile, Admin, Logout | PASS | 3 items |
| F001 FR-601 Admin item only for admins | PASS | Round 1 e2e test 7 |

## Error check

- Console: 0 errors on `/` while open.
- Network: no 4xx/5xx from the menu.

## Evidence

- `evidence/screens/dropdown-profile-admin/actual-admin-open-hover-r2.png`: viewport, admin menu, Profile hovered and focused.
