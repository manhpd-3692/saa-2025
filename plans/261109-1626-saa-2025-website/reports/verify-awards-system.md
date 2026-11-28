# Verify: Awards Information (F004, SCR-AwardsInformation, `/awards`)

**Verdict: FAIL.** The layout, the six cards, the prize values, the sticky menu, the anchors and the scroll-spy match the design and pass the e2e awards spec. Two defects block a clean PASS: the menu label for Signature 2025 is wrong (H1-level copy defect in the code), and the Kudos block link 404s until the Kudos board (F006) exists.

Viewport: 1440×1024 CSS px, DPR 1, `http://[::1]:3000` for captures; `http://localhost:3000` for hydrated interactions. Data: `live`.

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|---|---|---|---|---|---|
| A1 | FR-302 (menu label), reference menu | `src/features/awards/award-catalog.ts:99` `menuLabel: { vi: "Signature 2025 Creator" }`. Its unit test `src/features/awards/award-catalog.test.ts:33` asserts the same wrong string | `Signature 2025 - Creator` (same as the card name at `award-catalog.ts:98` and the reference menu) | Menu item reads `Signature 2025 Creator` (hyphen missing). Card heading is correct | Low (copy). Fix the catalog and update the test in the same change |
| A2 | FR-305 | Kudos block "Chi tiết" → `/kudos` (`KUDOS_BOARD_PATH`, `src/features/awards/sun-kudos-promo-block`) | Kudos board | `/kudos` → 404. No `src/app/(shell)/kudos` route | High for this screen, dependency on F006. Not fixable in Phase 5 |

## Visual diff (reference `docs/figma-refs/user/awards-system.png` vs `evidence/screens/awards-system/vn-1440-full.png`)

| Element | Reference | Actual | Result |
|---|---|---|---|
| Key visual + title "Hệ thống giải thưởng SAA 2025" | yellow title on art | same | OK (art is a crop, accepted) |
| Sticky menu, left column | six items, icons | six items, sticky `top: 96px` | OK except label (A1) |
| Award cards | image, title, description, quantity, prize | all six present | OK |
| Quantity labels | 10 Cá nhân / 02 Tập thể / 03 Cá nhân / 01 Cá nhân / 01 Cá nhân hoặc tập thể / 01 Cá nhân | identical | OK |
| Prize values | 7.000.000 / 15.000.000 / 7.000.000 / 10.000.000 / 5.000.000 + 8.000.000 / 15.000.000 | identical; the currency suffix is "VNĐ" (per `award-catalog.ts:127`, "as written in the design") | OK |
| Signature dual prize | 5.000.000 cho cá nhân · Hoặc · 8.000.000 cho tập thể | `5.000.000 VNĐ` "cho giải cá nhân", "Hoặc", `8.000.000 VNĐ` "cho giải tập thể" | OK |
| Menu item label "Signature 2025 - Creator" | with hyphen | "Signature 2025 Creator" | DEFECT A1 |
| Kudos block (bottom) | heading, copy, "Chi tiết" | matches | OK except A2 |
| Footer | "Award Information" marked current in reference | not marked | Accepted (P3 open item) |
| Page height | 6410 px reference | 6404 px capture | OK (within 6 px) |

## Acceptance criteria

| AC | Result | Evidence |
|---|---|---|
| FR-301 key visual and title | PASS | snapshot |
| FR-302 menu, six items, fixed order | FAIL (label) | six items in order; label A1 |
| FR-303 detail card (image, name, description, quantity, prize) | PASS | all six cards measured |
| FR-304 Signature shows two prizes separated by "Or" | PASS | `Hoặc` divider; only this card has two values |
| FR-305 Kudos block "Chi tiết" to board | FAIL | A2 (404) |
| FR-401 menu click scrolls and puts anchor in address | PASS | click `#mvp` → URL `/awards#mvp`, MVP card top at 443 px; e2e test passed |
| FR-402 highlight follows scroll | PASS | after wheel 1400 px, "Top Project" marked; e2e SC-004 passed |
| BR-001 same order and values as homepage | PASS | catalog order |
| BR-002 only Signature has two values | PASS | measured |
| BR-003 unknown anchor → top, no error | PASS | `/awards#unknown-slug` on a fresh load: scrollY 0, active "Top Talent", no error |
| `/awards#mvp` lands on the MVP card | PASS | scrollY 4368, MVP top 443 |
| `/awards#best-manager` (from homepage) | PASS | top 96 (sticky offset) |
| SC-001 / SC-002 / SC-003 / SC-004 | PASS | e2e "six award cards..." and "an award link lands..." and "scrolling by hand..." passed |
| Keyboard focus | PARTIAL | Tab reaches links; default focus ring is `auto 1.33px rgb(16,16,16)`. On the `#00101A` page background that ring is nearly invisible. Not confirmed visually. Concern, not counted |
| FR-601 signed-out redirect | PASS | e2e "signed out, every F004 page goes to Login" passed |

## English (`saa_locale=en`)

- `<html lang="en">`. Title and cards keep Vietnamese text ("Hệ thống giải thưởng SAA 2025", "Top Talent" name and copy).
- Dictionary gap: `src/i18n/dictionaries/en/awards.json` has 3 keys vs 18 in vi. 15 keys missing (`awards.page.title`, `awards.menu.label`, `awards.quantity`, `awards.value`, `awards.or`, `awards.unit.individual`, ...). Vietnamese fallback applies (FR-002, D004). Open item, not a FAIL.
- Capture: `evidence/screens/awards-system/en-1440-full.png`.

## 1280 px

- `innerWidth` 1280, `scrollWidth` 1265 (no horizontal overflow), cards 767 px wide, menu at x 144, desktop layout kept. Capture: `evidence/screens/awards-system/vn-1280-viewport.png`.

## Console, network, logs

- Browser console (error level, session): 2 messages, both `404 /kudos` (A2).
- Web log new lines (49 total, all sessions): `GET /awards 200` entries; no ERROR, no 5xx; the two `/kudos` 404 lines.
- API log: only the intentional stall-fixture timeout (see homepage report).

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `npx playwright test e2e/homepage-and-awards.spec.ts e2e/awards-and-community-standards.spec.ts` | 0 | 15 passed (8 in `awards-and-community-standards.spec.ts`, 7 in `homepage-and-awards.spec.ts`) |
| reseed `live` (before and after), `npm run e2e:session` (before and after) | 0 / 0 | seed live; sessions regenerated |

## Fix required before PASS

1. `award-catalog.ts:99` → `"Signature 2025 - Creator"`, and `award-catalog.test.ts:33` to match.
2. Kudos link: needs the F006 board route. Re-verify A2 when F006 lands.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/awards-system/` (`vn-1440-full.png`, `en-1440-full.png`, `vn-1280-viewport.png`).

## Re-verify after fix round 1

Viewport 1440×1024, `http://[::1]:3000/awards`, signed in as the local test user. Data: `live` (Go API `/api/v1/events/current`: status `active`, startAt = now − 1 d, ceremonyAt = now + 14 d).

**Final verdict: PASS**

Accepted dependency (re-verify when F006 lands): the Kudos block "Chi tiết" → `/kudos` still returns 404 for the signed-in user. Recorded per the orchestrator decision; it is not a FAIL of Phase 5.

### Fix round 1 checks

| Item | Result | Evidence |
|---|---|---|
| A1 Signature menu label | PASS | DOM link text `Signature 2025 - Creator`, href `#signature-2025-creator`. Code: `award-catalog.ts:99` |
| A2 Kudos link `/kudos` | Accepted dependency | Still 404 (signed in). F006 not built |
| Keyboard focus ring | PASS | 8 Tabs reach "Top Talent" in the menu. Computed outline `solid 2px rgb(255,234,158)`, offset 2 px. Background `rgba(255,234,158,0.1)` (`focus-visible:bg-primary-soft`) once the 0.15 s transition settles. A read at 0 ms showed transparent: mid-transition, not a defect |
| Reduced motion (menu scroll) | Code-verified only | `awards-menu.tsx:61-62` uses `behavior: auto` under `prefers-reduced-motion: reduce`. Not exercised in the browser this round |
| Locale cache does not leak | PASS | e2e test "English shows the English copy…" (`awards-and-community-standards.spec.ts:133`, cache checks at lines 134-156) passed |

### Visual discrepancies (listed, not hidden)

| Element | Reference | Actual | Status |
|---|---|---|---|
| Signature menu label | "Signature 2025 / Creator", two lines, no hyphen (PNG) | One line, `Signature 2025 - Creator` (FR-302) | Discrepancy. Accepted: spec over design, per orchestrator decision. Not a PASS "exact" |

Visual comparison of `awards-vi-round1.png` is qualitative. No pixel metric was run, so no result is called "exact". Layout otherwise matches the round-0 capture: six cards, prizes, sticky menu.

### Acceptance criteria (every code)

| AC | Result | Evidence |
|---|---|---|
| FR-301 key visual and title | PASS | unchanged, round-0 capture |
| FR-302 menu, six items, fixed order, label | PASS | label per FR-302 (accepted discrepancy vs PNG, see above) |
| FR-303 detail card | PASS | unchanged; e2e test 1 passed |
| FR-304 Signature two prizes "Hoặc" | PASS | unchanged; e2e test 1 passed |
| FR-305 Kudos block "Chi tiết" → board | Accepted dependency | A2, re-verify when F006 lands |
| FR-401 menu click scrolls and sets anchor | PASS | e2e test 3 passed |
| FR-402 highlight follows scroll | PASS | e2e test 5 passed (SC-004) |
| FR-601 signed-out → Login | PASS | e2e test 7 passed |
| BR-001 order and values as homepage | PASS | e2e test 1 passed |
| BR-002 only Signature has two values | PASS | e2e test 1 passed |
| BR-003 unknown anchor → top, no error | PASS | e2e test 2 passed |
| SC-001 / SC-002 | PASS | e2e test 1 passed |
| SC-003 | PASS | e2e test 2 passed |
| SC-004 | PASS | e2e test 5 passed |
| Keyboard focus (WCAG 2.4.7) | PASS (was PARTIAL) | e2e test 4 passed; computed outline above |
| Reduced motion | Code-verified | not browser-exercised this round |
| Locale cache no-leak | PASS | e2e test 8 passed |

### Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `wc -l logs/api.log logs/web.log` | 0 | baseline api 25, web 2969 |
| `npx playwright test e2e/homepage-and-awards.spec.ts e2e/awards-and-community-standards.spec.ts` (log `evidence/screens/pw-run-round1-1.log`) | 0 | 16 passed (30.1 s). No retry needed |
| `curl http://127.0.0.1:8080/api/v1/events/current` | 0 (HTTP 200) | status `active`, live shape |
| `npm run e2e:session` / reseed | not run | sessions written 2026-11-28 10:39:51 +07, valid to 2026-12-05 03:39 UTC |

### Logs (new since baseline)

- `logs/api.log`: 1 new line, `ERROR read current event: timeout` at 10:43:03. Expected: the stalled-event fixture (`homepage-and-awards.spec.ts:144`, `stallEventsRead`). Not a product defect.
- `logs/web.log`: 37 new lines, 0 ERROR. Two 404s: `GET /kudos` (accepted dependency), and one `GET /api/v1/events/current` from my own probe on the web port. That route lives on the Go API, so it is not an app defect.

### Notes

- The MCP browser echoed the session cookie value into the transcript while loading the session. The session is local test-only, valid to 2026-12-05. Regenerate it with `npm run e2e:session` before the next browser run if it matters.
- Evidence: `evidence/screens/awards-system/awards-vi-round1.png`, `evidence/screens/pw-run-round1-1.log`.
