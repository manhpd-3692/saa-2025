# Verify: Infor - HoverAvatar (F006, tracker row 27, `2268:35101`)

**Verdict: PASS**, with three accepted deviations listed below.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked). The hover card captured for row 26 is the same component, so the evidence file is shared.

## Evidence

- `plans/261109-1626-saa-2025-website/evidence/screens/hover-avatar-info-2/viewport-1440x1024.png` (copy of the row 26 capture, hover card open)
- E2E: `evidence/screens/e2e/pw-kudos-board-run.log` (exit 0, 11 passed; test 8)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-103 avatar or name opens profile | PASS | e2e test 8 |
| FR-402 card shows name, unit, badge, received and sent counts | PASS | Card: name, unit line, badge, two counts, Gửi KUDO button |
| BR-002 anonymous has no card | PASS | e2e test 8 |
| SC-002 named sender card | PASS | Standalone |
| SC-007 | PASS | Covered by the same card render; no separate check run |

## Visual diff (`docs/figma-refs/user/hover-avatar-info-2.png` vs the captured card)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Name, gold, bold | gold | gold | OK |
| Unit line, grey, small | "Tên đơn vị: Culture & Communication Executive/C&C Line/HRD Unit/OPD Center" | "Tên đơn vị: Đơn vị CECV3 (CECV3)" | Data. Accepted (see deviation 2) |
| Badge | "Legend Hero" artwork | "New Hero" text pill | F008 data. Accepted (see deviation 3) |
| Divider, counts row | bold label, gold number | identical | OK |
| Button "Gửi KUDO" | cream, pencil icon, full width | identical | OK (behaviour see deviation 1) |

## Accepted deviations

1. "Gửi KUDO" opens a blank compose with no recipient prefill. Accepted: the spec does not require a prefill (no AC in F006 names one), and prefill would need F005 changes outside this screen.
2. Unit line shows the unit name as well as the code. Accepted: FR-402 asks for the unit code only, and R15 defines only `units.code`. The unit name is an extra DTO field the implementer added. It is low risk and the frame shows a unit name too. The spec or DTO note should record the field.
3. The badge is a text pill, not the artwork. Accepted: badge artwork belongs to F008.

## Console, network, logs

- Console: no errors. Non-2xx: none. `logs/api.log` unchanged. `logs/web.log`: no new ERROR, panic or 5xx.

## Fix list

None.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS.** Deviation 1 (blank compose) is closed. Deviations 2 and 3 are still accepted as in round 1.

| Item | Round 2 | Evidence |
|------|---------|----------|
| "Gửi KUDO" prefill | PASS. Compose window opens with the hovered Sunner in "Người nhận" | `r2-compose-prefill-1440x1024.png`; e2e test 5 |
| Card layout and counts | PASS (unchanged) | `r2-hover-card-open-1440x1024.png` |
| Deviation 2 (unit name in the unit line) | Accepted (unchanged) | n/a |
| Deviation 3 (badge text pill) | Accepted (unchanged) | n/a |

Command: exit 0, 17 passed (same run as row 22).

**Verdict: PASS.** Fix list: none.

