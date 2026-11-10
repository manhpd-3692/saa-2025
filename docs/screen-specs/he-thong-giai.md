> **Historical API mapping (Codex R14, 2026-11-10).** API mappings in this file (`/api/awards`, `/api/awards/categories`, `/api/users/me/language` and the other unversioned `/api/...` paths) are historical discovery notes. Current contracts: the six awards (including Signature's dual prize) are static content in the Next.js app with no awards API, the language choice is a cookie (no language API), and every backend call goes to the Go API under `/api/v1`. Use this file for visual and flow evidence only. Precedence: `plans/261109-1626-saa-2025-website/reports/codex-findings-resolution-contract.md` → `plans/261109-1626-saa-2025-website/spec/gap-resolution-log.md` → the feature specs under `plans/261109-1626-saa-2025-website/spec/` → this file.

# Screen: He thong giai (Prize/Award System)

## Screen Info

| Property | Value |
|----------|-------|
| **Figma Frame ID** | `313:8436` |
| **Figma File Key** | `9ypp4enmFmdK3YAFJLIu6C` |
| **Figma Link** | https://www.figma.com/design/9ypp4enmFmdK3YAFJLIu6C/?node-id=313-8436 |
| **Screen Group** | Main Application |
| **Status** | discovered |
| **Discovered At** | 2026-03-04 |
| **Last Updated** | 2026-03-04 |

---

## Description

The "He thong giai" (Prize/Award System) screen is a dedicated page that presents the complete SAA 2025 award system in detail. It features a hero key visual banner at the top, followed by a section title ("He thong giai thuong SAA 2025"), and then a two-column layout: a sticky left-side navigation menu listing the six award categories, and a right-side content area displaying detailed award information cards for each category. Each award card includes an award image/icon, the award title, a description of the award's purpose and criteria, the number of prizes, and the monetary prize value. At the bottom, there is a promotional "Sun* Kudos" section with a CTA button linking to the Kudos detail page. The page is bookended by a shared Header and Footer.

---

## Navigation Analysis

### Incoming Navigations (From)

| Source Screen | Trigger | Condition |
|---------------|---------|-----------|
| Homepage SAA | Click "ABOUT AWARDS" CTA button (B3.1) | None |
| Homepage SAA | Click "Award Information" header nav link (A1.3) | None |
| Homepage SAA | Click any "Chi tiet" button on award cards (C2.x) | None |
| Homepage SAA | Click "Award Information" footer link (7.3) | None |
| Any screen (via Header) | Click "Award Information" nav link | None |
| Any screen (via Footer) | Click "Award Information" footer link | None |

### Outgoing Navigations (To)

| Target Screen | Trigger Element | Node ID | Confidence | Notes |
|---------------|-----------------|---------|------------|-------|
| Homepage SAA / About SAA 2025 | Header nav "About SAA 2025" | `I313:8440;186:1579` | High | Header navigation link |
| Award Information (self) | Header nav "Award Information" | `I313:8440;186:1587` | High | Header navigation link to current page |
| Sun* Kudos | Header nav "Sun* Kudos" | `I313:8440;186:1593` | High | Header navigation link |
| Dropdown-ngon ngu | Language selector | `I313:8440;186:1696` | High | Opens language dropdown overlay |
| Notification Panel | Notification bell | `I313:8440;186:2101` | High | Notification icon with badge dot |
| Dropdown-profile | Profile icon | `I313:8440;186:1597` | High | User profile dropdown |
| Sun* Kudos detail | "Chi tiet" button in Sun* Kudos section (D2.1) | `I335:12023;313:8426` | High | CTA button navigating to Sun* Kudos page |
| About SAA 2025 | Footer link "About SAA 2025" | `I354:4323;342:1410` | High | Footer navigation link |
| Award Information (self) | Footer link "Award Information" | `I354:4323;342:1411` | High | Footer navigation link |
| Sun* Kudos | Footer link "Sun* Kudos" | `I354:4323;342:1412` | High | Footer navigation link |
| Tieu chuan chung | Footer link "Tieu chuan chung" | `I354:4323;1161:9487` | High | Footer navigation link |

### In-Page Navigations (Anchor Scroll)

| Target Section | Trigger Element | Node ID | Confidence | Notes |
|----------------|-----------------|---------|------------|-------|
| Top Talent card (D.1) | Menu item "Top Talent" (C.1) | `313:8460` | High | Scrolls to Top Talent award card |
| Top Project card (D.2) | Menu item "Top Project" (C.2) | `313:8461` | High | Scrolls to Top Project award card |
| Top Project Leader card (D.3) | Menu item "Top Project Leader" (C.3) | `313:8462` | High | Scrolls to Top Project Leader award card |
| Best Manager card (D.4) | Menu item "Best Manager" (C.4) | `313:8463` | High | Scrolls to Best Manager award card |
| Signature 2025 - Creator card (D.5) | Menu item "Signature 2025" (C.5) | `313:8464` | High | Scrolls to Signature 2025 award card |
| MVP card (D.6) | Menu item "MVP" (C.6) | `313:8465` | High | Scrolls to MVP award card |

### Navigation Rules
- **Back behavior**: Browser back returns to previous screen (typically Homepage SAA)
- **Deep link support**: Yes - `/awards` or `/he-thong-giai`
- **Auth required**: Yes (user must be logged in)
- **Anchor links**: URL hash fragments for each award category (e.g., `/awards#top-talent`)

---

## Component Schema

### Layout Structure

```
+-----------------------------------------------------+
|                  HEADER                               |
|  [Logo] [About SAA] [Award Info] [Kudos] [Lang][N][P]|
+-----------------------------------------------------+
|                                                       |
|  3_KEYVISUAL BACKGROUND                               |
|  +-----------------------------------------------+   |
|  |  [Root Further Logo / artwork]                 |   |
|  |  1200x871px hero banner                        |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  |  A_TITLE                                       |   |
|  |  "Sun* Annual Awards 2025"  (subtitle)         |   |
|  |  "He thong giai thuong SAA 2025" (main title)  |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  | B_HE THONG GIAI THUONG                         |   |
|  | +--------+ +--------------------------------+  |   |
|  | | C_MENU | | D_DANH SACH GIAI THUONG        |  |   |
|  | |        | |                                |  |   |
|  | | [*Top  | | D.1_Top Talent                 |  |   |
|  | |  Talent]| | [Image] [Title] [Description] |  |   |
|  | | [Top   | | [Qty: 10] [Value: 7M VND]     |  |   |
|  | |  Proj] | |                                |  |   |
|  | | [Top   | | D.2_Top Project                |  |   |
|  | |  PL]   | | [Image] [Title] [Description] |  |   |
|  | | [Best  | | [Qty: 02] [Value: 15M VND]    |  |   |
|  | |  Mgr]  | |                                |  |   |
|  | | [Sig   | | D.3_Top Project Leader         |  |   |
|  | |  2025] | | [Image] [Title] [Description] |  |   |
|  | | [MVP]  | | [Qty: 03] [Value: 7M VND]     |  |   |
|  | |        | |                                |  |   |
|  | |        | | D.4_Best Manager               |  |   |
|  | |        | | [Image] [Title] [Description] |  |   |
|  | |        | | [Qty: 01] [Value: 10M VND]    |  |   |
|  | |        | |                                |  |   |
|  | |        | | D.5_Signature 2025 - Creator   |  |   |
|  | |        | | [Image] [Title] [Description] |  |   |
|  | |        | | [Qty: 01] [Value: 5M/8M VND]  |  |   |
|  | |        | |                                |  |   |
|  | |        | | D.6_MVP                        |  |   |
|  | |        | | [Image] [Title] [Description] |  |   |
|  | |        | | [Qty: 01] [Value: 15M VND]    |  |   |
|  | +--------+ +--------------------------------+  |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  | D1_SUN* KUDOS                                  |   |
|  | [Background] [Title] [Description] [CTA]       |   |
|  | "Phong trao ghi nhan" / "Sun* Kudos"           |   |
|  | [Chi tiet button] [Kudos Logo]                  |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  | FOOTER                                         |   |
|  | [Logo] [About SAA] [Award Info] [Kudos] [TC]   |   |
|  | [Copyright: Ban quyen thuoc ve Sun* (c) 2025]   |   |
|  +-----------------------------------------------+   |
+-----------------------------------------------------+
```

### Component Hierarchy

```
He thong giai (FRAME)
+-- Cover (RECTANGLE/Atom) - Dark overlay/background
+-- Header (INSTANCE/Organism) - Shared app header
|   +-- LOGO (INSTANCE/Atom) - Sun* logo
|   +-- Navigation Links (FRAME/Molecule)
|   |   +-- Button-IC (INSTANCE/Atom) - "About SAA 2025"
|   |   +-- Button-IC (INSTANCE/Atom) - "Award Information" (active state)
|   |   +-- Button-IC (INSTANCE/Atom) - "Sun* Kudos"
|   +-- Right Actions (FRAME/Molecule)
|       +-- Language (INSTANCE/Molecule) - Language selector w/ VN flag
|       +-- Notification (INSTANCE/Molecule) - Bell icon w/ badge dot
|       +-- Button-IC (INSTANCE/Atom) - User profile icon
+-- 3_Keyvisual (GROUP/Organism) - Hero banner
|   +-- image 20 (RECTANGLE/Atom) - Background artwork 1200x871px
+-- Bia (FRAME/Organism) - Cover/content section
|   +-- KV (FRAME/Molecule) - Key visual inner container
|   |   +-- MM_MEDIA_Root Further Logo (RECTANGLE/Atom)
|   +-- A_Title he thong giai thuong (FRAME/Molecule)
|   |   +-- "Sun* Annual Awards 2025" (TEXT/Atom) - Subtitle
|   |   +-- Divider line (RECTANGLE/Atom)
|   |   +-- "He thong giai thuong SAA 2025" (TEXT/Atom) - Main title, gold
|   +-- B_He thong giai thuong (FRAME/Organism) - Two-column layout
|       +-- C_Menu list (FRAME/Molecule) - Left side navigation
|       |   +-- C.1_Top talent (INSTANCE/Atom) - Active state w/ yellow indicator
|       |   +-- C.2_Top project (INSTANCE/Atom)
|       |   +-- C.3_Top Project leader (INSTANCE/Atom)
|       |   +-- C.4_Best manager (INSTANCE/Atom)
|       |   +-- C.5_Signature 2025 (INSTANCE/Atom)
|       |   +-- C.6_MVP (INSTANCE/Atom)
|       +-- D.Danh sach giai thuong (FRAME/Organism) - Right side award cards
|           +-- D.1_Top talent (INSTANCE/Molecule) - Award card
|           |   +-- D.1.1_Picture-Award (INSTANCE/Atom) - Award image 336x336px
|           |   +-- D.1.2_Content (FRAME/Molecule) - Award info block
|           |       +-- Title: "Top Talent" (TEXT/Atom)
|           |       +-- Description (TEXT/Atom) - Award criteria text
|           |       +-- Prize count: "10" "Ca nhan" (TEXT/Atom)
|           |       +-- Prize value: "7.000.000 VND" (TEXT/Atom)
|           +-- D.2_Top Project (INSTANCE/Molecule) - Award card
|           |   +-- Picture-Award (INSTANCE/Atom) - Award image
|           |   +-- Content (FRAME/Molecule) - Award info block
|           +-- D.3_Top Project Leader (INSTANCE/Molecule) - Award card
|           |   +-- Picture-Award (INSTANCE/Atom) - Award image
|           |   +-- Content (FRAME/Molecule) - Award info block
|           +-- D.4_Thong tin giai / Best Manager (INSTANCE/Molecule) - Award card
|           |   +-- Picture-Award (INSTANCE/Atom) - Award image
|           |   +-- Content (FRAME/Molecule) - Award info block
|           +-- D.5_Signature 2025 (FRAME/Molecule) - Award card (custom layout)
|           |   +-- Picture-Award (INSTANCE/Atom) - Award image
|           |   +-- Content (FRAME/Molecule) - Award info block
|           |       +-- Prize value individual: "5.000.000 VND" (TEXT/Atom)
|           |       +-- "Hoac" divider (TEXT/Atom)
|           |       +-- Prize value collective: "8.000.000 VND" (TEXT/Atom)
|           +-- D.6_MVP (INSTANCE/Molecule) - Award card
|               +-- Picture-Award (INSTANCE/Atom) - Award image
|               +-- Content (FRAME/Molecule) - Award info block
+-- D1_Sunkudos (INSTANCE/Organism) - Sun* Kudos promotion section
|   +-- Background (RECTANGLE/Atom)
|   +-- D2_Content (FRAME/Molecule)
|   |   +-- "Phong trao ghi nhan" (TEXT/Atom) - Label
|   |   +-- "Sun* Kudos" (TEXT/Atom) - Title
|   |   +-- Description text (TEXT/Atom) - About the Kudos initiative
|   |   +-- D2.1_Button-IC (INSTANCE/Atom) - "Chi tiet" CTA button
|   +-- Kudos Logo (GROUP/Atom) - Kudos branding
+-- Footer (INSTANCE/Organism) - Shared app footer
    +-- LOGO (INSTANCE/Atom) - Sun* logo
    +-- Navigation Links (FRAME/Molecule)
    |   +-- Button-IC (INSTANCE/Atom) - "About SAA 2025"
    |   +-- Button-IC (INSTANCE/Atom) - "Award Information"
    |   +-- Button-IC (INSTANCE/Atom) - "Sun* Kudos"
    |   +-- Button-IC (INSTANCE/Atom) - "Tieu chuan chung"
    +-- Copyright (TEXT/Atom) - "Ban quyen thuoc ve Sun* (c) 2025"
```

### Main Components

| Component | Type | Node ID | Description | Reusable |
|-----------|------|---------|-------------|----------|
| Header | Organism | `313:8440` | Shared app header with logo, navigation links, language selector, notifications, profile | Yes |
| 3_Keyvisual | Organism | `313:8437` | Hero banner with artwork background | No |
| A_Title | Molecule | `313:8453` | Section title "He thong giai thuong SAA 2025" with subtitle | No |
| C_Menu list | Molecule | `313:8459` | Left-side sticky navigation menu with 6 award category items | No |
| Menu Item (C.x) | Atom | Various | Individual navigation item with icon and text; active state has yellow indicator | Yes (reused x6) |
| D.Danh sach giai thuong | Organism | `313:8466` | Container for all award detail cards | No |
| Award Card (D.x) | Molecule | Various | Reusable award card with image, title, description, prize count, and prize value | Yes (reused x6) |
| Picture-Award | Atom | Various | Square award image/icon (336x336px) with award name badge | Yes (reused x6) |
| D1_Sunkudos | Organism | `335:12023` | Sun* Kudos promotional section with description and CTA | Yes |
| Footer | Organism | `354:4323` | Shared app footer with logo, navigation links, copyright | Yes |

---

## Award Categories Data

| # | Award Name | Quantity | Unit | Prize Value | Special Notes |
|---|-----------|----------|------|-------------|---------------|
| D.1 | Top Talent | 10 | Ca nhan (Individual) | 7.000.000 VND per prize | - |
| D.2 | Top Project | 02 | Tap the (Team) | 15.000.000 VND per prize | - |
| D.3 | Top Project Leader | 03 | Ca nhan (Individual) | 7.000.000 VND per prize | - |
| D.4 | Best Manager | 01 | Ca nhan (Individual) | 10.000.000 VND | - |
| D.5 | Signature 2025 - Creator | 01 | Ca nhan hoac tap the (Individual or Team) | 5.000.000 VND (individual) OR 8.000.000 VND (team) | Dual prize values |
| D.6 | MVP (Most Valuable Person) | 01 | Ca nhan (Individual) | 15.000.000 VND | Highest individual prize |

---

## Form Fields (If Applicable)

N/A - This screen does not contain any forms.

---

## API Mapping

### On Screen Load

| API | Method | Purpose | Response Usage |
|-----|--------|---------|----------------|
| /api/awards | GET | Load full list of award categories with details | Populate all award cards (D.1 through D.6) |
| /api/awards/categories | GET | (Alternative) Load award category navigation items | Populate left menu (C_Menu list) |
| /api/notifications/unread | GET | Check for unread notifications | Show/hide notification badge dot in header |
| /api/users/me | GET | Get current user profile | Display user avatar in header |

### On User Action

| Action | API | Method | Request Body | Response |
|--------|-----|--------|--------------|----------|
| Click Menu Item (C.x) | N/A | N/A | N/A | Client-side scroll to corresponding card section |
| Click Notification Bell | /api/notifications | GET | - | Load notification list |
| Change Language | /api/users/me/language | PUT | `{language: "vi"\|"en"}` | Update UI language |
| Click "Chi tiet" (Kudos) | N/A | N/A | N/A | Navigate to Sun* Kudos page |

### Expected API Response

```json
{
  "awards": [
    {
      "id": "string",
      "name": "Top Talent",
      "slug": "top-talent",
      "description": "Giai thuong Top Talent vinh danh nhung ca nhan xuat sac toan dien...",
      "quantity": 10,
      "unitType": "individual",
      "prizeValue": 7000000,
      "prizeValueLabel": "7.000.000 VND",
      "prizeNote": "cho moi giai thuong",
      "imageUrl": "https://...",
      "iconUrl": "https://...",
      "order": 1
    },
    {
      "id": "string",
      "name": "Signature 2025 - Creator",
      "slug": "signature-2025-creator",
      "description": "...",
      "quantity": 1,
      "unitType": "individual_or_team",
      "prizeValue": 5000000,
      "prizeValueTeam": 8000000,
      "prizeValueLabel": "5.000.000 VND",
      "prizeValueTeamLabel": "8.000.000 VND",
      "prizeNote": "cho giai ca nhan",
      "prizeNoteTeam": "cho giai tap the",
      "imageUrl": "https://...",
      "iconUrl": "https://...",
      "order": 5
    }
  ]
}
```

### Error Handling

| Error Code | Message | UI Action |
|------------|---------|-----------|
| 401 | Unauthorized | Redirect to Login screen |
| 500 | Server error | Show error state with retry option |
| 408 | Timeout | Show loading retry for award data |
| 404 | Awards not found | Show empty state message |

---

## State Management

### Local State

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| awards | `Award[]` | `[]` | List of award categories loaded from API |
| activeMenuIndex | number | 0 | Currently active/highlighted menu item index |
| isLoading | boolean | true | Initial data loading state |
| scrollPositions | `Record<string, number>` | `{}` | Cached scroll positions for each award section |

### Global State (If Applicable)

| State | Store | Read/Write | Purpose |
|-------|-------|------------|---------|
| user | authStore | Read | Current user for header avatar |
| token | authStore | Read | Auth token for API calls |
| language | settingsStore | Read/Write | App language preference |
| notifications | notificationStore | Read | Unread notification count |

---

## Key Interactions

### Left Menu Navigation (Anchor Scrolling)
- Clicking a menu item (C.1 through C.6) smooth-scrolls the page to the corresponding award card
- The active menu item is highlighted with a yellow/gold indicator and underline
- As the user scrolls the right-side content, the active menu item updates based on which award card is currently in the viewport (Intersection Observer pattern)
- The left menu should remain sticky/fixed while scrolling through the award cards

### Menu Item States
- **Default**: Normal text, icon visible
- **Active/Selected**: Yellow/gold text color, underline indicator
- **Hover**: Highlighted text

### Award Card Layout
- Each award card displays in a horizontal layout:
  - Left: Square award image/icon (336x336px)
  - Right: Content block with title, description, prize count, and prize value
- Cards are separated by divider lines
- The Signature 2025 card has a unique layout with dual prize values separated by an "Hoac" (Or) divider

---

## UI States

### Loading State
- Show skeleton placeholders for award cards
- Show skeleton for left menu items
- Header and footer render immediately (shared components)

### Error State
- Toast notification for API errors
- Retry button for failed data loads
- Fallback content if award images fail to load

### Success State
- All award cards populated with data
- Left menu fully interactive
- Scroll-based active menu tracking operational

### Empty State
- If no awards are returned, display a "No awards available" message
- Left menu would be empty/hidden

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Focus management | Focus on first award card after page load |
| Keyboard navigation | Tab through header, menu items, award cards, CTA button, footer |
| Screen reader | ARIA roles for navigation menu (role="navigation"), award cards (role="article"), headings hierarchy |
| Scroll behavior | Menu clicks use smooth scroll with `scroll-behavior: smooth` |
| Active state | `aria-current="true"` on active menu item |
| Color contrast | WCAG AA compliant (light/gold text on dark backgrounds) |

---

## Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| Mobile (<768px) | Left menu becomes horizontal scrollable tabs at top; award cards stack vertically in full width |
| Tablet (768-1024px) | Left menu collapses to icons only or becomes a top tab bar; award cards in single column |
| Desktop (>1024px) | Full two-column layout as designed; sticky left menu, scrollable right content |

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| --color-background | Dark/Black | Page background |
| --color-primary-text | White/Light | Primary text on dark background |
| --color-accent | Gold/Amber | Menu active state, title accent, prize values |
| --color-secondary-text | Gray/Muted | Subtitle text, descriptions |
| --color-card-border | Subtle border | Award card separators |
| --font-heading | Serif/Display | Section headings, award titles |
| --font-body | Sans-serif | Description text, metadata |
| --spacing-section | 48-80px | Vertical spacing between sections |
| --spacing-card-gap | 32-48px | Gap between award cards |
| --menu-item-height | 40-48px | Height of each menu navigation item |
| --award-image-size | 336x336px | Award icon/image dimensions |

---

## Analytics Events (Optional)

| Event | Trigger | Properties |
|-------|---------|------------|
| screen_view | On mount | `{screen: "he_thong_giai"}` |
| menu_click | Click menu item | `{award_name, award_index}` |
| scroll_to_award | Auto-scroll tracking | `{award_name, scroll_direction}` |
| kudos_cta_click | Click "Chi tiet" in Kudos section | `{source: "award_page"}` |

---

## Implementation Notes

### Dependencies
- Intersection Observer API for scroll-based active menu tracking
- Smooth scroll polyfill for cross-browser support
- Shared Header and Footer components (same instances as Homepage SAA)
- Shared award card component pattern
- i18n library for Vietnamese/English language support

### Special Considerations
- **Sticky menu**: The left-side category menu (C_Menu list) should use `position: sticky` to remain visible while scrolling through award cards. Calculate the top offset to account for the header height.
- **Scroll spy**: Implement an Intersection Observer on each award card section to update the active menu item as the user scrolls. Use a threshold of ~30% visibility to trigger the active state change.
- **Anchor linking**: Support URL hash fragments (e.g., `/awards#top-talent`) so that deep links to specific award categories scroll directly to the correct card.
- **Signature 2025 dual prize**: The Signature 2025 - Creator card has a unique layout with two prize values (individual: 5M VND, team: 8M VND) separated by an "Hoac" (Or) divider. This requires a variant of the standard award card component.
- **Reusable card component**: Award cards D.1, D.2, D.3, D.4, and D.6 share the same layout pattern and can use a single component with props. D.5 needs a variant prop to show the dual prize value layout.
- **Header/Footer instances**: The Header and Footer are shared INSTANCE components identical to those on the Homepage SAA.
- **Key visual banner**: The hero banner is decorative only (no click behavior). Use responsive image scaling with `object-fit: cover` and center crop.
- **Sun* Kudos section**: Identical INSTANCE to the one on Homepage SAA; the "Chi tiet" button navigates to the Kudos page.

---

## Analysis Metadata

| Property | Value |
|----------|-------|
| Analyzed By | Screen Flow Discovery |
| Analysis Date | 2026-03-04 |
| Needs Deep Analysis | No |
| Confidence Score | High |

### Next Steps
- [ ] Extract exact design token values from Figma (colors, font sizes, spacing)
- [ ] Confirm sticky menu scroll behavior with product team
- [ ] Verify award data API contract with backend team
- [ ] Test responsive layout breakpoints for the two-column menu/content layout
- [ ] Confirm if award card detail links are needed (currently no "Chi tiet" on individual cards in this screen)
- [ ] Coordinate with backend on /api/awards response schema supporting dual prize values
