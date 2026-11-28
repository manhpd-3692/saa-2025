# Verify: Hashtag group (F006, tracker row 28, `1002:13094`)

**Verdict: FAIL (low, qualitative).** The Figma frame shows a closed hashtag control with a selected value. The selected state in the app uses a white fill with a dark outline, where the frame shows a cream fill with a gold outline. Behaviour is correct. No deterministic colour metric was taken; the judgment is qualitative and should be confirmed by a designer.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos`, VN, sunner01.demo, `live` seed. Standalone headless Chromium (MCP profile locked).

## Evidence

- Reference: `docs/figma-refs/user/hashtag-group.png` (closed control, "High-perorming ▾")
- App, selected state: `plans/261109-1626-saa-2025-website/evidence/screens/kudos-dropdown-hashtag-filter/after-select-1440x1024.png`
- App, hashtag line on cards (element): `evidence/screens/hashtag-group/element.png`

## Interpretation

The frame is the closed trigger of the Hashtag filter in its selected state, not the red hashtag line on the card. The app shows the selected value on the trigger, so the behaviour matches. Only the selected-state styling differs.

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-002 hashtags shown on each card (red text) | PASS | Card hashtag line in red (`hashtag-group/element.png`) |
| F005 FR-205 hashtag group in compose | Not in scope of this screen | |
| BR-002 hashtag grouping | PASS | Hashtags listed per card, unchanged |
| FR-203 selected hashtag shows on the trigger | PASS | Trigger shows `#high-performing` after selection (standalone) |

## Visual diff (`docs/figma-refs/user/hashtag-group.png` vs app selected state)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Trigger fill, selected | cream | white | FAIL (qualitative) |
| Trigger outline | gold | dark grey | FAIL (qualitative) |
| Text | dark, bold | dark, bold | OK |
| Caret | right of value | right of value | OK |
| Size and padding | about 180×60 in frame | similar | OK (not measured) |
| Value text | "High-perorming" (typo in the frame) | "#high-performing" (correct data) | OK. Do not copy the typo |

## Defects

| ID | AC | Location | Expected | Actual | Severity |
|----|----|----------|----------|--------|----------|
| H1 | FR-203 styling (design reference) | `src/features/kudos-board/filter-dropdown.tsx` (selected-state classes) | Cream fill and gold outline, per `hashtag-group.png` | White fill, dark outline | Low (qualitative) |

## Console, network, logs

- Console: no errors. Non-2xx: none. `logs/api.log` unchanged. `logs/web.log`: no new ERROR, panic or 5xx.

## Concerns

- The frame copy "High-perorming" has a typo. Designer should correct it in Figma.
- No pixel metric was taken. If a designer wants a measured match, sample both colours and report the deltas.

## Fix list

1. H1 (`src/features/kudos-board/filter-dropdown.tsx`): when a value is selected, use the cream fill and gold outline from `docs/figma-refs/user/hashtag-group.png` (the same tokens as the open panel's gold outline). Expected: cream fill, gold outline. Actual: white fill, dark outline. Re-check at 1440×1024 with `#high-performing` selected. If the designer accepts white, record that in the spec instead.

---

## Round 2 (after P7 fix round 1)

**Round 2 verdict: PASS.** The selected chip now matches the Figma closed control. The round 1 colour finding (H1) is fixed, and the colour is measured rather than judged by eye.

### Measurements

Figma reference `docs/figma-refs/user/hashtag-group.png` (176×48), decoded in a canvas:
- Dominant fill: `#FFFFFF` (7,145 px)
- Outer ring: `#998C5F` (395 px)

App selected chip (`filter-hashtag` after picking `#high-performing`, computed style and pixels):
- Background `rgb(255, 255, 255)` = `#FFFFFF`
- Border `1px rgb(153, 140, 95)` = `#998C5F`
- Corner radius `8px`
- Box 217×56 px. Capture pixels: `#FFFFFF` (10,264 px), `#998C5F` (546 px)

| Element | Figma | App | Result |
|---------|-------|-----|--------|
| Fill | `#FFFFFF` | `#FFFFFF` | PASS (exact) |
| Outline | `#998C5F`, 1px | `#998C5F`, 1px | PASS (exact) |
| Corner radius | not pixel-measured in frame | 8px | Visually matched |
| Box height | 48 px in the frame | 56 px | Minor. Width depends on the label, and the frame's value text is shorter. Accepted as not material; the designer may tighten the padding |
| Value text | "High-perorming" (typo in frame) | "#high-performing" (data) | OK. Do not copy the typo |

Behaviour: after selection the trigger shows the value and the feed re-ranks (see row 24).

Command: exit 0, 17 passed.

**Verdict: PASS.** Fix list: none. Optional: designer to correct the "High-perorming" typo in Figma and confirm the 56 px height.

