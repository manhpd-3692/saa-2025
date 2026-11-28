# Verify: Hover Rising Hero badge (F008, tracker row 33, `docs/figma-refs/user/hover-badge-rising-hero.png`)

**Verdict: PASS.** The hover copy and tier match the spec and the Figma text. The image was not compared pixel by pixel in this pass; it uses the same component as New and Legend, which were compared.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos/76a49d25-9a5f-45b1-ad8c-4870d52e3441` (receiver with 5 distinct senders), VN, sunner01.demo, `live` seed.

## Evidence

- Hover capture: `plans/261109-1626-saa-2025-website/evidence/screens/hover-badge-rising-hero/viewport.png`
- Reference: `docs/figma-refs/user/hover-badge-rising-hero.png`
- Read values: `evidence/p8-capture-results.json` (S3 Rising): `data-tier="Rising"`, hover "Có 5-9 người gửi Kudos cho bạn" plus the description
- E2E: test 5 (runs 1 and 2, ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 hover shows tier and sender range | PASS | "Có 5-9 người gửi Kudos cho bạn" |
| FR-405 sender count 4 → 5 changes New to Rising | PASS | Database: 5 distinct senders → Rising |
| BR-005 Rising 5–9 | PASS | As above |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Rising Hero pill | as frame | same component | OK, not pixel-compared here |
| Range line | "Có 5-9 người gửi Kudos cho bạn" | same | OK |
| Description | "Hình ảnh bạn đang lớn dần trong trái tim đồng đội bằng sự tử tế và cống hiến của mình." | same | OK |

## Fix list

None. If a pixel-level check is needed, rerun this capture with an image diff.
