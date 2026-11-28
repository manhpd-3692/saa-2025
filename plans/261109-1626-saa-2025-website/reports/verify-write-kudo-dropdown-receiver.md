# Verify: Dropdown list người nhận (F005, tracker row 17, recipient combobox and @ mention list)

**Verdict: PASS.** The recipient list shows name and unit, never offers the sender, shows the empty state, and supports keyboard pick. The @ mention list also suggests Sunners.

Viewport: 1440×1024 CSS px, DPR 1, `http://localhost:3000`, VN. Data: `live` seed, sender sunner01.demo, seed Sunner Trần Thị Bình (CECV1). Method: headless Chromium via a standalone Playwright script.

## Defects

None.

## Visual diff (`docs/figma-refs/user/write-kudo-dropdown-receiver.png` vs `evidence/screens/write-kudo-dropdown-receiver/vn-1440-receiver-dropdown.png`)

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Popover | dark panel under the field, avatar left, name bold white, unit grey below | dark panel, avatar (initial "T"), name, "CECV1" in grey | OK |
| Name line wrap | "Dương Huỳnh Xuân / Nhật" wraps in the narrow frame | one line in the 512 px popover | Non-material. Frame width artefact |
| Duplicate rows | frame shows the same Sunner twice | one row (seed has one match) | Data difference |
| Field text | "Dương" typed | "Trần" typed | Data difference |
| Empty state | not in frame | "Không tìm thấy Sunner phù hợp." | Matches spec §9 copy |

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-201 search by name, each result shows name and unit | PASS | "Trần" → row "Trần Thị Bình CECV1" (`vn-1440-receiver-dropdown.png`) |
| FR-204 typing @ and a name suggests Sunners | PASS | "Cảm ơn @Trần" → 1 suggestion (`mention-suggestions.png`); insertion in row 13 |
| BR-001 cannot pick self | PASS | query "Nguyễn Văn An" → "Không tìm thấy Sunner phù hợp."; sender never listed |
| SC-002 (server side) | PASS | self recipient → API 422 `self_kudo` (row 16) |
| Keyboard pick (extra) | PASS | ArrowDown + Enter selects "Trần" |

## Console, network, logs

- No new errors from this screen.

## Commands and exit codes

| Command | Exit | Result |
|---------|------|--------|
| `node compose-states-check.cjs` (second run) | 0 | receiver items: 3 passed (`results-states.json`) |

## Fix list

None required for this screen.

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/write-kudo-dropdown-receiver/` (`vn-1440-receiver-dropdown.png`, `vn-1440-receiver-empty.png`, `mention-suggestions.png`).
