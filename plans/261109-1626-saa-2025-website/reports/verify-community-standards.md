# Verify: Community Standards (F004, SCR-CommunityStandards, `/community-standards`)

**Verdict: PASS.** The page matches the reference: ten numbered rules with the same wording, the security standards section with its two points and the contact line, and the footer entry point. Signed-out access redirects to Login (e2e). Two items are open but do not change the verdict (footer current-page marker, EN copy gaps).

Viewport: 1440×1024 CSS px, DPR 1, `http://[::1]:3000`. Locale VN by cookie, EN by `saa_locale=en`. Data: `live`.

## Defects

None on this screen.

## Visual diff (reference `docs/figma-refs/user/community-standards.png` vs `evidence/screens/community-standards/vn-1440-full.png`)

| Element | Reference | Actual | Result |
|---|---|---|---|
| Hero key visual "ROOT FURTHER" | art with title | same | OK (crop, accepted) |
| H1 "Tiêu chuẩn cộng đồng" | gold | gold | OK |
| Intro lines (gold + white) | two paragraphs | same wording | OK |
| Rule 1–10 | ten numbered items | ten items, wording matches the reference read line by line (1 "Sử dụng từ ngữ thô tục…", 10 "Mức độ “tim” tăng đột biến…") | OK |
| Divider, H2 "Tiêu chuẩn bảo mật" | gold | gold | OK |
| Security intro line | "Sunner cam kết bảo vệ thông tin…" | same | OK |
| Security bullets | Bảo mật Thông tin / Phạm vi Chia sẻ | same, two bullets | OK |
| Contact line | gold, "Slack duong.thi.thuy.an" | same | OK |
| Footer | links, "Tiêu chuẩn chung" | links present; current item not marked | OK (P3 open item, accepted) |
| Dev badge (bottom-left "N") | absent | visible in `next dev` | Not counted (dev-only) |

## Acceptance criteria

| AC | Result | Evidence |
|---|---|---|
| FR-103 opens from footer link | PASS | click on `footer a[href="/community-standards"]` → `/community-standards` |
| FR-351 exactly ten numbered rules, title and explanation | PASS | `ol > li` count 10. Rule text is a single sentence per item (the reference shows one line each) |
| FR-352 security standards listed | PASS | heading "Tiêu chuẩn bảo mật", two bullets, contact line |
| FR-601 signed-out redirected to Login | PASS | e2e "signed out, every F004 page goes to Login" passed |
| SC-006 | PASS | same e2e test |
| F005 FR-210 (in the brief's table) | not applicable | FR-210 is the 10-recipient gift sidebar on `/kudos` in the kudos spec. It is not a community-standards requirement. The brief's traceability entry is wrong |
| US004 spam-warning notification entry | not verified | depends on F009 (notifications), not built in this phase |

## English (`saa_locale=en`)

- `<html lang="en">`. H1 shows "Community Standards" (EN copy exists). Rule list and security copy fall back to Vietnamese.
- Dictionary `src/i18n/dictionaries/en/standards.json`: 1 key vs 2 in vi (`standards.security.title` missing). Rules are arrays and are not counted in the key diff; they are VN-only. Open item (AD04), not a FAIL.
- Capture: `evidence/screens/community-standards/en-1440-full.png`.

## 1280 px

- `innerWidth` 1280, `scrollWidth` 1265 (no horizontal overflow), 10 rule items at 16 px. Capture: `evidence/screens/community-standards/vn-1280-viewport.png`.

## Console, network, logs

- Browser console (error level): no errors on `/community-standards`.
- Web log: `GET /community-standards 200` (multiple, 31–123 ms). No ERROR, no 5xx.
- API log: nothing for this screen (static page).

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `npx playwright test e2e/awards-and-community-standards.spec.ts` (part of the combined run) | 0 | "Community Standards from the footer" and "signed out..." and "1280 px..." passed |
| reseed `live` (before and after), `npm run e2e:session` (before and after) | 0 / 0 | seed live; sessions regenerated |

Evidence: `plans/261109-1626-saa-2025-website/evidence/screens/community-standards/` (`vn-1440-full.png`, `en-1440-full.png`, `vn-1280-viewport.png`).
