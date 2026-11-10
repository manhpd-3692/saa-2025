> **Historical API mapping (Codex R14, 2026-11-10).** API mappings in this file (`/api/awards`, `/api/awards/:id`, `/api/users/me/language`, `/api/kudos/summary` and the other unversioned `/api/...` paths) are historical discovery notes. Current contracts: the six awards are static content in the Next.js app (no awards API), the language choice is a cookie (no language API), the Kudos teaser is static copy, and every backend call goes to the Go API under `/api/v1` (event data: `GET /api/v1/events/current`, countdown target `ceremonyAt`). Use this file for visual and flow evidence only. Precedence: `plans/261109-1626-saa-2025-website/reports/codex-findings-resolution-contract.md` → `plans/261109-1626-saa-2025-website/spec/gap-resolution-log.md` → the feature specs under `plans/261109-1626-saa-2025-website/spec/` → this file.

# Screen: Homepage SAA

## Screen Info

| Property | Value |
|----------|-------|
| **Figma Frame ID** | `2167:9026` |
| **Figma File Key** | `9ypp4enmFmdK3YAFJLIu6C` |
| **Figma Link** | https://www.figma.com/design/9ypp4enmFmdK3YAFJLIu6C/?node-id=2167-9026 |
| **Screen Group** | Main Application |
| **Status** | discovered |
| **Discovered At** | 2026-03-03 |
| **Last Updated** | 2026-03-03 |

---

## Description

The Homepage SAA (Sun* Annual Awards) is the main landing page of the application. It serves as the central hub presenting the event branding ("Root Further"), a countdown timer to the ceremony, event details, the awards system overview with six award categories, and the Sun* Kudos recognition initiative. The page features a rich visual design with a key visual background, informational content sections, and navigation to deeper areas of the application.

---

## Navigation Analysis

### Incoming Navigations (From)

| Source Screen | Trigger | Condition |
|---------------|---------|-----------|
| Login | Successful authentication | User has valid session |
| Any screen (via Header) | Click "About SAA 2025" nav link (A1.2) | None |
| Countdown - Prelaunch page | Event starts / redirect | Time-based |

### Outgoing Navigations (To)

| Target Screen | Trigger Element | Node ID | Confidence | Notes |
|---------------|-----------------|---------|------------|-------|
| Award Information | Header nav "Award Information" (A1.3) | `I2167:9091;186:1587` | High | Header navigation button in hover state |
| Sun* Kudos | Header nav "Sun* Kudos" (A1.5) | `I2167:9091;186:1593` | High | Header navigation button in normal state |
| Language Dropdown | Language selector (A1.7) | `I2167:9091;186:1696` | High | Opens language selection overlay with flag icon |
| Notification Panel | Notification bell (A1.6) | `I2167:9091;186:2101` | High | Notification icon with badge dot |
| User Profile / Dropdown | Profile icon (A1.8) | `I2167:9091;186:1597` | High | User profile avatar icon button |
| Award System (He thong giai) | "ABOUT AWARDS" button (B3.1) | `2167:9063` | High | CTA button with arrow icon navigates to awards info |
| Kudos Page | "ABOUT KUDOS" button (B3.2) | `2167:9064` | High | CTA button with arrow icon navigates to kudos section |
| Award Detail: Top Talent | "Chi tiet" button on Top Talent card (C2.1.4) | `I2167:9075;214:1023` | High | Detail link on award card |
| Award Detail: Top Project | "Chi tiet" button on Top Project card (C2.2) | `I2167:9076;214:1023` | High | Detail link on award card |
| Award Detail: Top Project Leader | "Chi tiet" button on Top Project Leader card (C2.3) | `I2167:9077;214:1023` | High | Detail link on award card |
| Award Detail: Best Manager | "Chi tiet" button on Best Manager card (C2.4) | `I2167:9079;214:1023` | High | Detail link on award card |
| Award Detail: Signature 2025 Creator | "Chi tiet" button on Signature 2025 card (C2.5) | `I2167:9080;214:1023` | High | Detail link on award card |
| Award Detail: MVP | "Chi tiet" button on MVP card (C2.6) | `I2167:9081;214:1023` | High | Detail link on award card |
| Kudos Detail / Write Kudos | "Chi tiet" button in Kudos section (D2.1) | `I3390:10349;313:8426` | High | CTA in Sun* Kudos section |
| Write Kudo | Widget floating button (6_Widget Button) | `5022:15169` | High | Floating action button with pen icon to write a kudo |
| About SAA 2025 | Footer link "About SAA 2025" (7.2) | `I5001:14800;342:1410` | High | Footer navigation link |
| Award Information | Footer link "Award Information" (7.3) | `I5001:14800;342:1411` | High | Footer navigation link |
| Sun* Kudos | Footer link "Sun* Kudos" (7.4) | `I5001:14800;342:1412` | High | Footer navigation link |
| Tieu chuan chung | Footer link "Tieu chuan chung" (7.5) | `I5001:14800;1161:9487` | High | Footer navigation link |

### Navigation Rules
- **Back behavior**: N/A (this is the main landing page)
- **Deep link support**: Yes - `/` or `/home`
- **Auth required**: Yes (user must be logged in via Google OAuth)

---

## Component Schema

### Layout Structure

```
+-----------------------------------------------------+
|                  A1_HEADER                            |
|  [Logo] [About SAA] [Award Info] [Kudos]  [Lang][N][P]|
+-----------------------------------------------------+
|                                                       |
|  3.5_KEYVISUAL BACKGROUND                             |
|  +-----------------------------------------------+   |
|  |  Bia (Cover Section)                           |   |
|  |  [Root Further Logo]                           |   |
|  |  [B1_Countdown: Days | Hours | Minutes]        |   |
|  |  [B2_Event Info: Date, Location, Livestream]    |   |
|  |  [B3_CTA: ABOUT AWARDS | ABOUT KUDOS]          |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  |  B4_Content Section                            |   |
|  |  [Root Further Logo Text]                      |   |
|  |  [Long-form content about the event]           |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  |  C1_Award System Header                        |   |
|  |  "Sun* annual awards 2025"                     |   |
|  |  "He thong giai thuong"                        |   |
|  +-----------------------------------------------+   |
|  |  C2_Award List (2 rows x 3 columns)            |   |
|  |  [Top Talent] [Top Project] [Top Project Leader]|   |
|  |  [Best Manager] [Signature 2025] [MVP]         |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  |  D1_SunKudos Section                           |   |
|  |  [Background Image]                            |   |
|  |  [Title + Description]                         |   |
|  |  [CTA Button: Chi tiet]                        |   |
|  |  [Kudos Logo]                                  |   |
|  +-----------------------------------------------+   |
|                                                       |
|  +-----------------------------------------------+   |
|  |  7_FOOTER                                      |   |
|  |  [Logo] [About SAA] [Award Info] [Kudos] [TC]  |   |
|  |  [Copyright: Ban quyen thuoc ve Sun* (c) 2025]  |   |
|  +-----------------------------------------------+   |
|                                                       |
|  [6_Widget Button - Floating]                         |
+-----------------------------------------------------+
```

### Component Hierarchy

```
Homepage SAA (FRAME)
+-- 3.5_Keyvisual (GROUP) - Background key visual
|   +-- MM_MEDIA_Keyvisual BG (RECTANGLE/Atom)
+-- Cover (RECTANGLE/Atom) - Overlay
+-- A1_Header (INSTANCE/Organism)
|   +-- A1.1_LOGO (INSTANCE/Atom) - Sun* logo
|   +-- Navigation Links (FRAME/Molecule)
|   |   +-- A1.2_Button-Selected state (INSTANCE/Atom) - "About SAA 2025"
|   |   +-- A1.3_Button Hover State (INSTANCE/Atom) - "Award Information"
|   |   +-- A1.5_Button-Normal state (INSTANCE/Atom) - "Sun* Kudos"
|   +-- Right Actions (FRAME/Molecule)
|       +-- A1.7_Language (INSTANCE/Molecule) - Language selector w/ flag
|       +-- A1.6_Notification (INSTANCE/Molecule) - Bell icon w/ badge
|       +-- A1.8_Button-IC (INSTANCE/Atom) - User profile icon
+-- Bia (FRAME/Organism) - Hero/Cover section
|   +-- MM_MEDIA_Root Further Logo (RECTANGLE/Atom)
|   +-- B1_Countdown time (FRAME/Organism)
|   |   +-- B1.2_Coming soon (TEXT/Atom)
|   |   +-- B1.3_Countdown (FRAME/Molecule)
|   |       +-- B1.3.1_Days (FRAME/Molecule)
|   |       +-- B1.3.2_Hours (FRAME/Molecule)
|   |       +-- B1.3.3_Minutes (FRAME/Molecule)
|   +-- B2_Thong tin su kien (FRAME/Molecule) - Event info
|   +-- B3_Call-To-Action (FRAME/Molecule)
|       +-- B3.1_Button-IC About (INSTANCE/Atom)
|       +-- B3.2_Button-IC Kudos (INSTANCE/Atom)
+-- Frame 486 (FRAME/Organism) - Content section
|   +-- MM_MEDIA_Root Text (RECTANGLE/Atom)
|   +-- MM_MEDIA_Further Text (RECTANGLE/Atom)
|   +-- B4_content (GROUP/Molecule) - Long-form text content
+-- He thong giai thuong (FRAME/Organism) - Awards system
|   +-- C1_Header Giai thuong (FRAME/Molecule)
|   |   +-- "Sun* annual awards 2025" (TEXT/Atom)
|   |   +-- "He thong giai thuong" (TEXT/Atom)
|   +-- C2_Award list (GROUP/Organism)
|       +-- Row 1 (FRAME)
|       |   +-- C2.1_Top Talent Award (INSTANCE/Molecule)
|       |   +-- C2.2_Top Project Award (INSTANCE/Molecule)
|       |   +-- C2.3_Top Project Leader Award (INSTANCE/Molecule)
|       +-- Row 2 (FRAME)
|           +-- C2.4_Best Manager Award (INSTANCE/Molecule)
|           +-- C2.5_Signature 2025 Creator Award (INSTANCE/Molecule)
|           +-- C2.6_MVP Award (INSTANCE/Molecule)
+-- D1_Sunkudos (INSTANCE/Organism) - Kudos section
|   +-- MM_MEDIA_Kudos Background (RECTANGLE/Atom)
|   +-- D2_Content (FRAME/Molecule)
|   |   +-- Title: "Phong trao ghi nhan" (TEXT/Atom)
|   |   +-- "Sun* Kudos" (TEXT/Atom)
|   |   +-- Description text (TEXT/Atom)
|   |   +-- D2.1_Button-IC (INSTANCE/Atom) - "Chi tiet" CTA
|   +-- MM_MEDIA_Logo/Kudos (GROUP/Atom) - Kudos logo
+-- 6_Widget Button (INSTANCE/Molecule) - Floating action button
|   +-- Pen icon (INSTANCE/Atom) - Write kudo icon
|   +-- Kudos Logo icon (INSTANCE/Atom)
+-- 7_Footer (INSTANCE/Organism)
    +-- 7.1_LOGO (INSTANCE/Atom) - Sun* logo
    +-- Navigation Links (FRAME/Molecule)
    |   +-- 7.2_Button-IC (INSTANCE/Atom) - "About SAA 2025"
    |   +-- 7.3_Button-IC (INSTANCE/Atom) - "Award Information"
    |   +-- 7.4_Button-IC (INSTANCE/Atom) - "Sun* Kudos"
    |   +-- 7.5_Button-IC (INSTANCE/Atom) - "Tieu chuan chung"
    +-- Copyright text (TEXT/Atom)
```

### Main Components

| Component | Type | Node ID | Description | Reusable |
|-----------|------|---------|-------------|----------|
| A1_Header | Organism | `2167:9091` | App header with logo, navigation links, language selector, notifications, and profile | Yes |
| Bia (Hero Section) | Organism | `2167:9030` | Hero/cover section with Root Further branding, countdown, event info, and CTAs | No |
| B1_Countdown time | Organism | `2167:9035` | Countdown timer showing days, hours, minutes to event | No |
| B3_Call-To-Action | Molecule | `2167:9062` | Two CTA buttons: About Awards and About Kudos | No |
| B4_Content | Molecule | `5001:14827` | Long-form descriptive content about the Root Further event | No |
| C2_Award list | Organism | `5005:14974` | Grid of 6 award category cards (2 rows x 3 columns) | No |
| Award Card (C2.x) | Molecule | Various | Reusable award card with image, title, description, and detail link | Yes |
| D1_Sunkudos | Organism | `3390:10349` | Sun* Kudos promotional section with description and CTA | No |
| 6_Widget Button | Molecule | `5022:15169` | Floating action button for writing a kudo | Yes |
| 7_Footer | Organism | `5001:14800` | Footer with logo, navigation links, and copyright | Yes |

---

## Form Fields (If Applicable)

N/A - This screen does not contain any forms.

---

## API Mapping

### On Screen Load

| API | Method | Purpose | Response Usage |
|-----|--------|---------|----------------|
| /api/awards | GET | Load list of award categories | Populate award cards (C2 section) |
| /api/events/current | GET | Get current event details (date, location, countdown target) | Populate countdown timer and event info (B1, B2) |
| /api/kudos/summary | GET | Get Kudos initiative summary/status | Populate Sun* Kudos section (D1) |
| /api/notifications/unread | GET | Check for unread notifications | Show/hide notification badge dot (A1.6) |
| /api/users/me | GET | Get current user profile | Display user avatar in header (A1.8) |

### On User Action

| Action | API | Method | Request Body | Response |
|--------|-----|--------|--------------|----------|
| Click Award Detail | /api/awards/:id | GET | - | Navigate to award detail page |
| Click Notification Bell | /api/notifications | GET | - | Load notification list |
| Change Language | /api/users/me/language | PUT | `{language: "vi"\|"en"}` | Update UI language |

### Error Handling

| Error Code | Message | UI Action |
|------------|---------|-----------|
| 401 | Unauthorized | Redirect to Login screen |
| 500 | Server error | Show error state / retry option |
| 408 | Timeout | Show loading retry for countdown/awards |

---

## State Management

### Local State

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| countdownTarget | Date | API response | Target date/time for countdown |
| countdownValues | `{days, hours, minutes}` | `{0,0,0}` | Current countdown display values |
| isLoading | boolean | true | Initial data loading state |
| selectedLanguage | string | `"vi"` | Current display language |

### Global State (If Applicable)

| State | Store | Read/Write | Purpose |
|-------|-------|------------|---------|
| user | authStore | Read | Current user for header avatar |
| token | authStore | Read | Auth token for API calls |
| language | settingsStore | Read/Write | App language preference |
| notifications | notificationStore | Read | Unread notification count |

---

## UI States

### Loading State
- Show skeleton placeholders for award cards
- Show loading animation for countdown timer
- Show skeleton for Kudos section content

### Error State
- Toast notification for API errors
- Retry button for failed data loads
- Fallback content for award cards if images fail to load

### Success State
- All sections populated with live data
- Countdown timer actively ticking down
- Award cards fully rendered with images and descriptions

### Empty State
- N/A for most sections (content is always present)
- If awards list is empty, show placeholder message

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Focus management | Focus on main content after page load |
| Keyboard navigation | Tab through header nav, CTAs, award cards, footer |
| Screen reader | ARIA labels on all interactive elements and award cards |
| Error announcement | Live region for countdown updates |
| Color contrast | WCAG AA compliant (light text on dark backgrounds) |

---

## Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| Mobile (<768px) | Stacked layout, single column award cards, collapsed header nav |
| Tablet (768-1024px) | 2-column award grid, condensed header |
| Desktop (>1024px) | Full layout as designed, 3-column award grid |

---

## Analytics Events (Optional)

| Event | Trigger | Properties |
|-------|---------|------------|
| screen_view | On mount | `{screen: "homepage_saa"}` |
| award_click | Click award detail | `{award_name, award_id}` |
| cta_click | Click About Awards/Kudos | `{cta_type: "awards"\|"kudos"}` |
| widget_click | Click floating write kudo button | `{action: "write_kudo"}` |
| language_change | Change language | `{from, to}` |

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| --color-background | Dark/Black | Page background |
| --color-primary-text | White/Light | Primary text on dark background |
| --color-accent | Gold/Amber | Award highlights, CTA buttons |
| --color-secondary | Teal/Green | Section accents |
| --font-heading | Serif/Display | Section headings |
| --spacing-section | 48-80px | Vertical spacing between sections |
| --border-radius-card | 12-16px | Award card corners |

---

## Implementation Notes

### Dependencies
- Countdown timer library or custom hook
- i18n library for Vietnamese/English language support
- Image lazy loading for award card images
- Intersection Observer for scroll-based animations

### Special Considerations
- Countdown timer must sync with server time to avoid clock drift
- Award cards use a reusable component pattern (INSTANCE) - implement as a shared component
- Header and Footer are shared INSTANCE components reused across screens
- The floating Widget Button (6_Widget Button) must remain fixed-position above content
- Key visual background image is large - optimize for performance with responsive images
- Content section (B4) contains long Vietnamese text with a quoted English passage

---

## Analysis Metadata

| Property | Value |
|----------|-------|
| Analyzed By | Screen Flow Discovery |
| Analysis Date | 2026-03-03 |
| Needs Deep Analysis | Yes |
| Confidence Score | High |

### Next Steps
- [ ] Get detailed design items via list_frame_design_items
- [ ] Extract styles via list_frame_styles
- [ ] Define countdown API contract with backend
- [ ] Review award category data model with backend
- [ ] Verify navigation targets for all "Chi tiet" links
