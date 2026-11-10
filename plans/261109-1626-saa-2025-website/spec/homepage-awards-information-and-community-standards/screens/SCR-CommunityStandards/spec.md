---
status: draft
authored_by: takumi
created: 2026-11-09
lang: en
---

# SCR-CommunityStandards — Screen Spec

**Screen**: SCR-CommunityStandards: Tiêu chuẩn cộng đồng (Figma `1161:8944`)
**Feature**: F004_StaticEventContent
**Type**: atomic
**Route**: `/community-standards`
**Generated**: 2026-11-09

## 1. Overview

**Purpose:** A signed-in Sunner reads the ten content rules (what counts as spam or unacceptable Kudos) and the security standards, e.g. after a spam warning.
**Actors:** Sunner
**Entry Conditions:** Signed-in session; reached from the footer or a spam-warning notification.
**Exit Conditions:** The Sunner leaves via header or footer; the page has no actions of its own.

## 2. Screen Layout

### Layout Sketch

Static text page inside the shared shell: a title, a numbered list of ten rules, then a security standards section. Detailed visual layout follows Figma frame `1161:8944`, read at build time.

```
┌───────────────────────────────────────────┐
│ R1: Header (fixed-top, shared shell)      │
├───────────────────────────────────────────┤
│ R2: Title + content rules 1-10 (numbered) │
│ R3: Security standards                    │
├───────────────────────────────────────────┤
│ R4: Footer (shared shell)                 │
└───────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | fixed-top | no | TBD (draft) |
| R2 | Title and content rules | static | yes | TBD (draft) |
| R3 | Security standards | static | yes | TBD (draft) |
| R4 | Footer | static | yes | TBD (draft) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Page title | region label | — | Shown | Always | — | static | raw | — | N/A |
| E02 | Content rule (x10): number, title, explanation | list | — | Shown | Always | — | static | numbered, title + paragraph | — | N/A |
| E03 | Security standards heading and list | list | — | Shown | Always | — | static | heading + bullets | hidden | N/A |

Rule and standard wording is transcribed from Figma frame `1161:8944` at build time, Vietnamese first (feature decision D003, resolved); it ships as static content with the website.

## 4. User Actions

### Available Actions

N/A — no elements carry a discrete user-triggered action.

### Happy Path

1. Sunner arrives from the footer or a notification and sees the title and rule 1 at the top.
2. Sunner scrolls through rules 1 to 10 in R2.
3. Sunner continues to the security standards in R3.

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Page load | Shell renders at once; text appears with the page (static) | none | TBD (draft) |
| empty | Copy missing for the chosen language | Vietnamese text shown instead | none | TBD (draft) |
| error | Page cannot render | Shared error page (F001) | retry via reload | TBD (draft) |
| saving | — | N/A (screen writes nothing) | — | TBD (draft) |
| success | Page loaded | Rules and standards visible | none | TBD (draft) |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

N/A — no conditional UI detected.

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Any screen (footer) | "Tieu chuan chung" | — | TBD (draft) |
| Notification (spam warning) | Open the warning | Kudo marked spam | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Header / footer links | shared shell | — | TBD (draft) — owned by F001 | redirect or modal | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Ordered list for rules; heading for security standards |
| Keyboard navigation | [EXPECTED] | Natural reading order, header/footer reachable |
| Focus management | [EXPECTED] | No traps; focus at top of main content |
| Screen reader compatibility | [EXPECTED] | Heading hierarchy; list semantics |
| Error announcement | [EXPECTED] | Not applicable beyond the shared error page |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
