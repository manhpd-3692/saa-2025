> **Historical API mapping (Codex R14, 2026-11-10).** API mappings in this file (`/api/events/current` with field `start_at`) are historical discovery notes. Current contract: the Go API endpoint `GET /api/v1/events/current` returns `startAt`, `ceremonyAt` and `serverNow`; the launch countdown targets `startAt` and the Next.js proxy fails open after 1.5 s. Use this file for visual and flow evidence only. Precedence: `plans/261109-1626-saa-2025-website/reports/codex-findings-resolution-contract.md` → `plans/261109-1626-saa-2025-website/spec/gap-resolution-log.md` → the feature specs under `plans/261109-1626-saa-2025-website/spec/` → this file.

# Screen: Countdown - Prelaunch page

## Screen Info

| Property | Value |
|----------|-------|
| **Figma Frame ID** | `2268:35127` |
| **Figma File Key** | `9ypp4enmFmdK3YAFJLIu6C` |
| **Figma Link** | https://www.figma.com/design/9ypp4enmFmdK3YAFJLIu6C/?node-id=2268-35127 |
| **Screen Group** | Main Application |
| **Status** | discovered |
| **Discovered At** | 2026-03-04 |
| **Last Updated** | 2026-03-04 |

---

## Description

The Countdown - Prelaunch page is a standalone full-screen page displayed to users before the event officially launches. It features a dark background (#00101A) with a colorful abstract art image (topographic/wave patterns in rainbow colors) on the right side, overlaid with a gradient. The centerpiece is a countdown timer showing days, hours, and minutes until the event starts, with the Vietnamese title "Su kien se bat dau sau" ("Event will start in"). Each countdown unit is displayed using LED-style digit boxes with a glass-morphism effect (semi-transparent background with blur and gold border). There is no header, footer, or navigation -- this is a completely standalone prelaunch experience. When the countdown reaches zero, users are automatically redirected to the Homepage SAA.

---

## Navigation Analysis

### Incoming Navigations (From)

| Source Screen | Trigger | Condition |
|---------------|---------|-----------|
| Direct URL access | User navigates to site before event launch | Event has not started yet |
| Any route (redirect) | Server/client-side redirect | Current datetime is before event start datetime |

### Outgoing Navigations (To)

| Target Screen | Trigger Element | Node ID | Confidence | Notes |
|---------------|-----------------|---------|------------|-------|
| Homepage SAA | Countdown reaches zero (auto-redirect) | N/A | High | Automatic client-side redirect when event start time is reached |

### Navigation Rules
- **Back behavior**: N/A -- standalone page with no back navigation
- **Deep link support**: Yes - shown at `/` or `/countdown` when event has not started
- **Auth required**: No (publicly accessible prelaunch page)
- **Redirect logic**: If event has already started, immediately redirect to Homepage SAA

---

## Component Schema

### Layout Structure

```
+-----------------------------------------------------+
|                                                       |
|  BACKGROUND (#00101A dark)                            |
|  +-----------------------------------------------+   |
|  |                                                |   |
|  |  MM_MEDIA_Background Image                     |   |
|  |  (Abstract art / topographic wave patterns     |   |
|  |   in rainbow colors, positioned right side)    |   |
|  |                                                |   |
|  +-----------------------------------------------+   |
|  |  Gradient Overlay                               |   |
|  |  (Semi-transparent gradient on top of image)    |   |
|  +-----------------------------------------------+   |
|                                                       |
|           +-------------------------------+           |
|           |  Title Text                   |           |
|           |  "Su kien se bat dau sau"     |           |
|           |  (Event will start in)        |           |
|           +-------------------------------+           |
|                                                       |
|     +----------+  +----------+  +----------+          |
|     | +--+ +--+|  | +--+ +--+|  | +--+ +--+|         |
|     | |D1| |D2||  | |H1| |H2||  | |M1| |M2||         |
|     | +--+ +--+|  | +--+ +--+|  | +--+ +--+|         |
|     |   DAYS   |  |  HOURS   |  | MINUTES  |         |
|     +----------+  +----------+  +----------+          |
|                                                       |
+-----------------------------------------------------+
```

### Component Hierarchy

```
Countdown - Prelaunch page (FRAME)
+-- Background Fill (RECTANGLE/Atom) - Solid dark fill #00101A
+-- MM_MEDIA_Background Image (RECTANGLE/Atom) - Abstract art background
|   (Topographic/wave patterns in rainbow colors, right-aligned)
+-- Gradient Overlay (RECTANGLE/Atom) - Semi-transparent gradient overlay
+-- Countdown Content (FRAME/Organism) - Centered content container
    +-- Title Text (TEXT/Atom) - "Su kien se bat dau sau"
    |   Font: Montserrat Bold, color: white
    +-- Countdown Timer (FRAME/Molecule) - Timer container
        +-- Days Unit (FRAME/Molecule)
        |   +-- Digit Box 1 (FRAME/Atom) - LED-style digit, glass-morphism
        |   +-- Digit Box 2 (FRAME/Atom) - LED-style digit, glass-morphism
        |   +-- Label "DAYS" (TEXT/Atom) - Montserrat Bold, uppercase
        +-- Hours Unit (FRAME/Molecule)
        |   +-- Digit Box 1 (FRAME/Atom) - LED-style digit, glass-morphism
        |   +-- Digit Box 2 (FRAME/Atom) - LED-style digit, glass-morphism
        |   +-- Label "HOURS" (TEXT/Atom) - Montserrat Bold, uppercase
        +-- Minutes Unit (FRAME/Molecule)
            +-- Digit Box 1 (FRAME/Atom) - LED-style digit, glass-morphism
            +-- Digit Box 2 (FRAME/Atom) - LED-style digit, glass-morphism
            +-- Label "MINUTES" (TEXT/Atom) - Montserrat Bold, uppercase
```

### Main Components

| Component | Type | Description | Reusable |
|-----------|------|-------------|----------|
| Background Fill | Atom | Solid dark background (#00101A) | No |
| Background Image | Atom | Colorful abstract art with topographic/wave patterns in rainbow colors | No |
| Gradient Overlay | Atom | Semi-transparent gradient layered on top of background image | No |
| Title Text | Atom | "Su kien se bat dau sau" heading text in Montserrat Bold | No |
| Countdown Timer | Molecule | Container for the three countdown units (days, hours, minutes) | No |
| Countdown Unit | Molecule | A single time unit with two digit boxes and a label | Yes (reused x3) |
| Digit Box | Atom | LED-style digit display with glass-morphism effect (semi-transparent, blur, gold border) | Yes (reused x6) |
| Unit Label | Atom | Uppercase label text (DAYS / HOURS / MINUTES) in Montserrat Bold | Yes (reused x3) |

---

## Form Fields (If Applicable)

N/A -- This screen does not contain any forms or user input fields.

---

## API Mapping

### On Screen Load

| API | Method | Purpose | Response Usage |
|-----|--------|---------|----------------|
| /api/events/current | GET | Get current event details including start datetime | Compute countdown target; determine if redirect is needed |

### On User Action

N/A -- This screen has no interactive user actions. The countdown updates automatically.

### Expected API Response

```json
{
  "id": "string",
  "name": "Sun* Annual Awards 2025",
  "start_at": "2025-12-15T18:00:00+07:00",
  "status": "upcoming" | "active" | "ended",
  "prelaunchEnabled": true
}
```

### Error Handling

| Error Code | Message | UI Action |
|------------|---------|-----------|
| 500 | Server error | Show fallback countdown with cached/default target date |
| 408 | Timeout | Retry API call with exponential backoff |
| 404 | Event not found | Redirect to Homepage SAA (assume event has started or no event configured) |

---

## State Management

### Local State

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| countdownTarget | Date | API response `start_at` | Target date/time for countdown calculation |
| countdownValues | `{days: number, hours: number, minutes: number}` | `{days: 0, hours: 0, minutes: 0}` | Current countdown display values, updated every minute |
| isLoading | boolean | true | Loading state while fetching event data |
| hasEventStarted | boolean | false | Flag to trigger redirect to Homepage SAA |

### Global State (If Applicable)

| State | Store | Read/Write | Purpose |
|-------|-------|------------|---------|
| eventStartAt | eventStore | Read | Cached event start datetime (optional optimization) |

---

## Key Interactions

### Countdown Auto-Update
- The countdown timer updates every 60 seconds (or every second for a more dynamic feel)
- Each tick recalculates the difference between the current time and the event start time
- Values are displayed as zero-padded two-digit numbers in each digit box

### Redirect on Countdown Zero
- When the countdown reaches `0 days, 0 hours, 0 minutes`, the page automatically redirects to Homepage SAA
- The redirect should use client-side routing (e.g., `router.replace("/")`) to avoid a full page reload
- A small buffer (e.g., check every 10 seconds when under 1 minute) ensures timely redirect

### Server Time Synchronization
- The countdown target comes from the server API (`/api/events/current`)
- The client should calculate the offset between local time and server time to avoid clock drift
- If the server indicates the event is already `"active"` or `"ended"`, redirect immediately

---

## UI States

### Loading State
- Show a minimal loading indicator or skeleton on the dark background
- Background image and gradient can be rendered immediately (static assets)

### Error State
- If the API fails, fall back to a cached event start date if available
- If no cached date is available, show a generic "Coming soon" message without a countdown

### Active Countdown State
- Full countdown display with ticking digits
- All visual elements rendered: background image, gradient, title, digit boxes

### Countdown Complete State
- Brief transition animation (optional) before redirecting
- Redirect to Homepage SAA

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Screen reader | ARIA live region for countdown updates (polite) so screen readers announce time changes |
| Focus management | No interactive elements to focus; page is informational |
| Color contrast | White text on dark background (#00101A) exceeds WCAG AA contrast ratio |
| Motion sensitivity | Countdown digit changes should not cause excessive motion; prefer simple number transitions |
| Language | Include lang attribute for Vietnamese text content |

---

## Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| Mobile (<768px) | Digit boxes scale down; stack countdown units vertically if needed; background image repositioned |
| Tablet (768-1024px) | Digit boxes slightly smaller; horizontal layout maintained; background image partially visible |
| Desktop (>1024px) | Full layout as designed; large digit boxes; background art fully visible on right side |

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| --color-background | #00101A | Page background fill |
| --color-text-primary | #FFFFFF | Title text and labels |
| --color-digit-bg | linear-gradient(180deg, #FFF 0%, rgba(255,255,255,0.10) 100%) at opacity 0.5 | Digit box glass-morphism background |
| --color-digit-border | #FFEA9E | Digit box border color (gold accent) |
| --color-digit-text | #FFFFFF | LED-style digit text color |
| --font-digit | "Digital Numbers" | Font family for countdown digits |
| --font-heading | "Montserrat", Bold | Font for title and unit labels |
| --blur-glass | 24.96px | Backdrop blur for glass-morphism digit boxes |
| --spacing-digit-gap | 21px | Gap between digit boxes within a unit |
| --spacing-unit-gap | 60px | Gap between countdown units (Days, Hours, Minutes) |

---

## Analytics Events (Optional)

| Event | Trigger | Properties |
|-------|---------|------------|
| screen_view | On mount | `{screen: "countdown_prelaunch"}` |
| countdown_redirect | Countdown reaches zero | `{target: "homepage_saa", remaining_seconds: 0}` |
| countdown_load | API data loaded | `{event_id, days_remaining, hours_remaining, minutes_remaining}` |

---

## Implementation Notes

### Dependencies
- Countdown timer utility or custom hook (setInterval-based)
- Date/time library (e.g., dayjs, date-fns) for precise countdown calculations
- CSS backdrop-filter support for glass-morphism effect
- Custom font: "Digital Numbers" for LED-style digits

### Special Considerations
- **No header/footer**: This is a completely standalone page. Do NOT render the shared Header or Footer components.
- **Server time sync**: The countdown must calculate based on the server-provided `start_at` value to avoid local clock drift issues. Consider fetching server time or using the response timestamp header to compute an offset.
- **Glass-morphism compatibility**: The `backdrop-filter: blur()` CSS property is not supported in all browsers. Provide a solid semi-transparent fallback for older browsers.
- **Background image optimization**: The abstract art background image should be optimized (WebP format, lazy loaded) and use `object-fit: cover` for proper scaling.
- **Gradient overlay**: The gradient sits between the background image and the countdown content to ensure text readability.
- **Font loading**: The "Digital Numbers" custom font must be preloaded to avoid FOUT (flash of unstyled text) on the countdown digits.
- **Pre-event routing logic**: The application router should check event status on initial load and redirect to this page if the event has not started, regardless of the requested URL.

---

## Analysis Metadata

| Property | Value |
|----------|-------|
| Analyzed By | Screen Flow Discovery |
| Analysis Date | 2026-03-04 |
| Needs Deep Analysis | No |
| Confidence Score | High |

### Next Steps
- [x] ~~Extract exact design token values from Figma~~ → Completed in `design-style.md`
- [ ] Confirm "Digital Numbers" font availability and licensing
- [ ] Define exact redirect behavior with product team (immediate vs. animated transition)
- [x] ~~Verify if seconds should also be displayed~~ → Confirmed: only days/hours/minutes per Figma
- [ ] Coordinate with backend on /api/events/current response schema (field: `start_at`)
