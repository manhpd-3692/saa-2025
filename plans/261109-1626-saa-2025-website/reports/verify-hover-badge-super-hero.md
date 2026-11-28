# Verify: Hover Super Hero badge (F008, tracker row 34, `docs/figma-refs/user/hover-badge-super-hero.png`)

**Verdict: PASS.** The hover copy and tier match the spec and the Figma text. The image was not compared pixel by pixel in this pass; it uses the same component as New and Legend.

Viewport 1440×1024, DPR 1, `http://localhost:3000/kudos/49f5d535-af73-4295-a71e-f6aa3253b3e2` (receiver with 10 distinct senders), VN, sunner01.demo, `live` seed.

## Evidence

- Hover capture: `plans/261109-1626-saa-2025-website/evidence/screens/hover-badge-super-hero/viewport.png`
- Reference: `docs/figma-refs/user/hover-badge-super-hero.png`
- Read values: `evidence/p8-capture-results.json` (S3 Super): `data-tier="Super"`, hover "Có 10–20 người gửi Kudos cho bạn" plus the description
- E2E: test 5 (runs 1 and 2, ok)

## Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| FR-203 hover shows tier and sender range | PASS | "Có 10–20 người gửi Kudos cho bạn" |
| FR-405 sender count 20 → 21 changes Super to Legend | PASS (boundary by rule) | Tier function: `n <= 20` Super, `n > 20` Legend (e2e test 5 and the hover checks) |
| BR-005 Super 10–20 | PASS | 10 senders → Super |

## Visual diff

| Element | Reference | Actual | Result |
|---------|-----------|--------|--------|
| Super Hero pill | as frame | same component | OK, not pixel-compared here |
| Range line | "Có 10–20 người gửi Kudos cho bạn" | same | OK |
| Description | "Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến." | same | OK |

## Fix list

None.
