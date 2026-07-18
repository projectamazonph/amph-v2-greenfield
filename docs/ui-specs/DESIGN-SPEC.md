# Design Spec — Field Manual UI System

**Source:** distilled from the parent `amph-v2` repo's `docs/stitch-prompts.md` (35 screens) and `src/styles/globals.css`.
**Date:** 2026-07-18
**Owner:** design-handoff
**Status:** reference document — use when building UI stories (Sprint 10 admin, future dashboard, etc.)

This document captures the **design only** — layout structures, component patterns, color/spacing/motion rules, anti-patterns. All marketing copy, brand-specific claims, taglines, and section prose have been stripped. Use the actual page text when implementing.

---

## 0. The Direction

**Taste:** Dense, scannable, utilitarian. Like a 1970s technical reference manual.

### Anti-patterns to NEVER use

- No gradient text
- No glassmorphism / `backdrop-blur` decorative cards
- No cyan-on-dark or purple-to-blue gradients
- No neon glowing accents
- No "icon + heading + text" repeated card grids as a default composition
- No centered-everything hero layouts (asymmetric, left-aligned only)
- No 3D illustrations, no stock photos of smiling people
- No big-number hero metrics with gradient accent blocks
- No rounded rectangles with thick colored accent on one side (use left border 3px instead)
- No sparklines used as decoration
- No pill-shape buttons (radius 6px max)
- No nested cards inside cards

---

## 1. Color System

### Surface

| Token | Value | Use |
|-------|-------|-----|
| `--surface-0` | `#FAFAF7` | App background (warm off-white, never pure white) |
| `--surface-1` | `#FFFFFF` | Cards, panels, elevated content |
| `--surface-2` | `#F4F3EE` | Subtle differentiation, hover washes, table headers |
| `--surface-3` | `#1A1A1A` | Dark mode background / inverted sections |

### Ink (text)

| Token | Value | Use |
|-------|-------|-----|
| `--ink-900` | `#171717` | Primary text |
| `--ink-700` | `#404040` | Secondary text |
| `--ink-500` | `#737373` | Tertiary text, metadata, captions |
| `--ink-300` | `#D4D4D4` | Disabled, empty/pending states |
| `--ink-inverse` | `#FAFAF7` | Text on dark backgrounds |

### Border

| Token | Value | Use |
|-------|-------|-----|
| `--border` | `#E5E5E0` | Default 1px border |
| `--border-strong` | `#A3A3A3` | Heavy dividers, focus outlines |

### Brand

| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#FF6B35` | Primary CTAs, active states, brand color |
| `--accent-hover` | `#E55A2B` | Primary button hover |
| `--accent-soft` | `#FFE5D9` | Selected state backgrounds, hover washes |
| `--accent-ink` | `#1A1A2E` | Text on `--accent` (6.0:1 contrast — white on accent is 2.83:1, fails AA) |

### Semantic

| Token | Value | Use |
|-------|-------|-----|
| `--success` | `#0E7C3A` | Completed states, correct answers, "Keep" decisions |
| `--success-soft` | `#DCFCE7` | Success backgrounds |
| `--warning` | `#B45309` | Pending, attention needed |
| `--warning-soft` | `#FEF3C7` | Warning backgrounds |
| `--danger` | `#B91C1C` | Errors, destructive actions, wrong answers |
| `--danger-soft` | `#FEE2E2` | Error backgrounds |
| `--info` | `#1E40AF` | "Most popular" badge, info accents |
| `--info-soft` | `#DBEAFE` | Info backgrounds |

### Color rule

**One accent element per viewport.** Two maximum. Accent draws the eye; drawing the eye to everything draws it to nothing.

---

## 2. Typography

### Families

| Use | Family | Weights |
|-----|--------|---------|
| Display + headings | Space Grotesk | 500, 600, 700 |
| Body + UI labels | Space Grotesk | 400, 500 |
| Numbers, code, technical data | JetBrains Mono | 400, 500 |

### Scale

| Token | Size | Use |
|-------|------|-----|
| `--text-xs` | 0.75rem (12px) | Eyebrow text, badges |
| `--text-sm` | 0.875rem (14px) | Secondary body, captions |
| `--text-base` | 1rem (16px) | Default body, form fields |
| `--text-lg` | 1.125rem (18px) | Lesson body, intro paragraphs |
| `--text-xl` | 1.375rem (22px) | h3, sub-section titles |
| `--text-2xl` | 1.75rem (28px) | h2, section titles |
| `--text-3xl` | 2.25rem (36px) | h1, page titles |
| `--text-4xl` | 3rem (48px) | Marketing hero only (one per page) |

### Line height

`--leading-tight: 1.15` (headings) · `--leading-snug: 1.35` · `--leading-normal: 1.5` (body) · `--leading-loose: 1.7` (lesson body).

### Rules

- One display size per page. Hero is the only `--text-4xl`. Everything else is `--text-3xl` or smaller.
- Headings: weight 600, line-height 1.15, letter-spacing -0.01em.
- Body: weight 400, line-height 1.5.
- Never use font-weight 800 or 900 — too loud.
- Eyebrow text: uppercase, 0.75rem, letter-spacing 0.05em, `--ink-500`.
- Numeric values (prices, ACoS %, XP): **always JetBrains Mono**.

---

## 3. Spacing

4px base unit. Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`.

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Inline gaps |
| `--space-2` | 8px | Tight padding |
| `--space-3` | 12px | Default padding |
| `--space-4` | 16px | Card padding, form field gap |
| `--space-5` | 20px | (reserved) |
| `--space-6` | 24px | Section gaps, table cell padding |
| `--space-8` | 32px | Major section gaps, page header padding |
| `--space-10` | 40px | (reserved) |
| `--space-12` | 48px | Page top/bottom on desktop |
| `--space-16` | 64px | Hero gaps, dark CTA section padding |
| `--space-20` | 80px | Marketing hero top padding |

---

## 4. Layout

### Breakpoints

- `--bp-sm: 640px` (iPhone width)
- `--bp-md: 768px` (tablet portrait)
- `--bp-lg: 1024px` (tablet landscape, sidebar threshold)
- `--bp-xl: 1280px` (laptop, design target)
- `--bp-2xl: 1536px` (max content width)

### Container widths

- `--max-content: 1200px` (most pages)
- `--max-reading: 720px` (lesson body, long-form content)
- `--max-form: 640px` (auth forms, single-column forms)
- Side padding: `clamp(16px, 4vw, 48px)`

### Sidebar layout (≥ 1024px)

Fixed left sidebar, **240px wide**. Background `--surface-1`, border-right `--border`. Contents: nav items + user card at the bottom.

### Mobile (< 1024px)

No sidebar. Bottom nav (4 slots: Home, Courses, Tools, Profile). Hamburger menu for secondary nav.

### Page header pattern

Every authenticated page has a consistent header:
- H1 (`--text-3xl`)
- Optional subtitle (`--ink-700`, `--text-base`)
- Right-aligned action buttons
- Padding: `--space-8 0` for the header block, `--space-6 0` between header and content
- Optional breadcrumb above H1: `← [Parent] / [Current]`, `--text-sm`, `--ink-500`

---

## 5. Components

### Button

```
Primary:    bg --accent,        fg --accent-ink (NOT white!),  hover --accent-hover
Secondary:  bg --surface-1,     fg --ink-900,    border --border, hover bg --surface-2
Ghost:      bg transparent,     fg --ink-700,    hover bg --surface-2
Danger:     bg --danger,        fg --surface-1,  hover darken 4%
Info:       bg --info,          fg --surface-1
Success:    bg --success,        fg --surface-1
```

- Heights: `sm = 28px`, `md = 36px` (default), `lg = 44px` (forms, primary CTAs)
- Padding: `0 --space-4` (16px)
- Border-radius: `--radius-md` (6px)
- Font: `--text-sm` (14px), weight 500
- **Tactile -1px translateY on `:active`** (press-down feel)
- Focus ring: 2px `--accent`, 2px offset
- **ONE primary button per viewport** (per the color rule)

### Card

- Background `--surface-1`
- Border 1px `--border`
- Border-radius `--radius-lg` (10px) for marketing / `--radius-md` (6px) for data
- Padding `--space-4` (16px) for compact, `--space-6` (24px) for standard, `--space-8` (32px) for hero
- **No shadow by default** — the border is the elevation
- Hover (interactive only): border `--ink-300`, translateY(-1px), shadow-sm, transition 200ms ease-out
- **Never nest cards inside cards**

### Input

- Height: 40px (md), 32px (sm), 48px (lg)
- Background `--surface-1`
- Border 1px `--border`
- Border-radius `--radius-md` (6px)
- Padding: `0 14px`
- Focus: border `--accent`, ring 2px `--accent-soft`, transition 150ms
- Error: border `--danger`
- Placeholder color: `--ink-300`
- Label: above input, `--text-sm`, weight 500, `--ink-700`
- Hint below: `--text-xs`, `--ink-500`
- Error below: `--text-xs`, `--danger`

### Table (data tables)

- Background `--surface-1`, 1px `--border` outer
- Header: `--surface-2` background, `--text-sm`, weight 500, uppercase, letter-spacing 0.04em, `--ink-500`. Bottom border 1px `--border`. **Sticky on scroll.**
- Row height: 40px (default), 56px (comfortable with wrapping)
- Row hover: `--surface-2`
- Cell padding: `--space-3 --space-4`
- Border between rows only (1px `--border`)
- **Numeric columns: right-aligned, JetBrains Mono**
- Status badges: inline pill (`--surface-2` bg, 12px text)
- Actions column: kebab menu (⋮) with ghost buttons
- Pagination: bottom, 50 per page default, search + filters above the table

### Tag / Badge / Status pill

- Height 20-24px, padding `0 --space-2`, `--text-xs`, weight 500
- Variants:
  - `neutral` — bg `--surface-2`, fg `--ink-700`
  - `success` — bg `--success-soft`, fg `--success`
  - `warning` — bg `--warning-soft`, fg `--warning`
  - `danger` — bg `--danger-soft`, fg `--danger`
  - `info` — bg `--info-soft`, fg `--info`
  - `accent` — bg `--accent-soft`, fg `--accent`
- Border-radius: `--radius-sm` (4px) for status, `--radius-full` for count badges

### Tabs

- Underline indicator, 2px, color `--accent`
- Active text: `--ink-900`, weight 500
- Inactive text: `--ink-500`
- No background change on hover (text only)
- Hover: text `--ink-700`, transition 120ms

### Toast

- Top-right stack, max 3 visible
- Slide-in from right, 240ms ease-out
- Auto-dismiss after 5s (errors: persist)
- Variants: success / error / info / warning (use semantic colors)

### Modal

- Backdrop: `rgba(0,0,0,0.5)`, fade in 200ms
- Center, max-width 640px, padding `--space-8`
- Slide-up animation (translateY(8px) → 0), 240ms ease-out
- Focus trap, ESC to close

---

## 6. Motion

Three motions only:

1. **Fade in** — 200ms, `ease-out` (cubic-bezier(0.16, 1, 0.3, 1)). For content appearing.
2. **Slide up** — 240ms, same easing. For modals, drawers, list reveals.
3. **Color transition** — 120ms, `ease-out`. For hover, focus, active states.

Tokens:
- `--duration-fast: 120ms`
- `--duration-base: 220ms`
- `--duration-slow: 400ms`
- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- `--ease-in: cubic-bezier(0.7, 0, 0.84, 0)`
- `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`

### Required interaction patterns (every screen)

- **Buttons:** -1px translateY on `:active` (press-down feel)
- **Interactive cards:** translateY(-1px) + `--shadow-sm` on hover, transition 200ms
- **Page sections:** staggered cascade reveal on load — 50ms delay between sections, opacity 0→1 + translateY(8px→0) over 400ms ease-out
- **Lists (courses, tools, keywords):** waterfall reveal — first item immediately, +60ms per item
- **Form inputs:** focus ring transition to `--accent` over 150ms
- **Progress bars:** animate width 0→value on mount over 600ms ease-out
- **Score numbers:** count-up animation 0→value over 800ms ease-out

### Reduced motion

`@media (prefers-reduced-motion: reduce)` → all transitions become instant (duration: 0).

---

## 7. Iconography

- **Phosphor light weight only.** No other icon set. No emojis in the UI.
- Sizes: 16px (inline), 20px (button), 24px (nav), 32px (hero)

Common icon mappings (Phosphor name → use):
- `House` — dashboard / home
- `Books` — courses
- `Toolbox` — simulators
- `UserCircle` — profile / account
- `Trophy` — badges
- `Certificate` — certificates
- `Calendar` — live classes
- `CreditCard` — payments
- `Receipt` — receipts
- `ArrowLeft` / `ArrowRight` / `CaretLeft` / `CaretRight` — navigation
- `Check` — success, completed
- `X` — close, error
- `Warning` — pending, attention
- `Info` — informational
- `MagnifyingGlass` — search
- `Funnel` — filter
- `Download` — download
- `Copy` — copy to clipboard
- `PencilSimple` / `PencilSimpleLine` — edit
- `DotsThreeVertical` / `DotsThree` — kebab menu
- `Eye` / `EyeSlash` — password show/hide
- `Rocket` — campaign builder
- `ChartLine` — bid elevator
- `List` — search term triage
- `BookOpen` — listing audit
- `MagnifyingGlass` — keyword research

---

## 8. Page Composition Patterns

### 8.1 Public / Marketing pages

```
HEADER (sticky, 56px tall, white bg, 1px bottom border)
  Left: brand logotype
  Right: secondary text links + 1 primary CTA
  Container: max-width 1200px, padded clamp(16px, 4vw, 48px)

MAIN (--surface-0 bg, sections stack vertically with --space-12 to --space-16 vertical padding)

HERO (80px+ top padding, LEFT-ALIGNED — NEVER centered)
  Asymmetric 2-column: 60% text / 40% decorative (large mono number, no image)
  Eyebrow (uppercase, 12px, --ink-500) → H1 (clamp 2.25rem to 3rem) → Subhead (18px, --ink-700) → 1 primary CTA
  NO hero image, NO 3+ buttons, NO secondary CTA in the same row

STATS BAR (--surface-2 bg, full width, 4-5 stats in a row, vertical dividers, count-up animation)

FEATURE SECTIONS (asymmetric 2-column zig-zag, NEVER 3 equal columns)
  Odd: text-left, visual-right
  Even: visual-left, text-right
  60ms stagger between items

DARK CTA SECTION (--surface-3 bg, 64px vertical padding, LEFT-aligned text + 1 button on accent)

FOOTER (3-column, --border top, --ink-500 text, 32px+ padding)
  Brand + copyright | Platform links | Contact
```

### 8.2 Auth pages (sign in, sign up)

```
Centered card layout:
- Viewport: min-height 100vh, flex centered
- Background: --surface-0
- Card: max-width 400px, --surface-1, --space-8 padding, --border, --radius-md
- Inside card: brand logotype (centered) → H1 → subtitle (optional) → form
- Form fields: stacked with --space-4 between
- Primary submit button: full width, lg height (48px)
- Below card: "Don't have an account? Get started" link

Error state: inline red text below the offending field
```

### 8.3 Authenticated app pages (dashboard, courses, tools, etc.)

```
LAYOUT: Full-width with sidebar (≥ 1024px) OR bottom nav (< 1024px)
  Sidebar: 240px fixed-left, --surface-1, --border-right
  Main: --surface-0 bg, --space-8 padding

PAGE STRUCTURE:
  Breadcrumb (optional): --text-sm, --ink-500, --space-3 0
  Header row: H1 + subtitle on left, action buttons on right
  Content: depends on page (see 8.4-8.7)
```

### 8.4 Dashboard

```
Stats row: 4-6 stat cards in a horizontal row (40px row, JetBrains Mono numbers)
Content sections: vertical stack with --space-6 gap
Recent activity / next action: 2-column or single column depending on data
```

### 8.5 Course detail (public) + Lesson page

```
Course detail:
  Hero: title + tagline + price (mono) + enroll CTA + meta (modules count, lesson count, duration)
  Curriculum: vertical list of modules → expandable lessons
  About, instructor, FAQ sections below

Lesson:
  Top breadcrumb: course / module / current lesson
  Title: h1
  Article body: max-width 720px, --text-base, --leading-loose
  Action footer: "Mark as complete (+50 XP)" primary button
  Quiz card (if applicable): separate "Take the quiz →" card
  Prev/Next nav: 2-column at the bottom
```

### 8.6 Tool / Simulator pages

```
Scenario header card (full width):
  Badge: tool name
  Title: scenario name
  Context paragraph: --ink-700
  3-4 stat boxes in a row (mono numbers)

Interactive area:
  - Tables (Bid Elevator): full-width card, 40px rows, mono numbers, status colors
  - Cards (STR Triage): vertical stack, per-item card with 5-button action group
  - Wizard (Campaign Builder): 5-step horizontal progress + form card + prev/next
  - Tabs (Listing Audit): 2-tab flag/revise flow
  - Categorize (Keyword Research): 3-column word bank, card-based categorization

Submit row: primary button + hint text below
```

### 8.7 Pricing

```
Eyebrow + H1 + subhead (centered, 80px top padding)

Tier cards (3 cards, ASYMMETRIC — featured card is 50% width with --accent left border):
  - 1 smaller card on left
  - 1 featured (hero) card in center (larger, padding 40px, "Most popular" badge in --info)
  - 1 smaller card on right
  Each: tier name (eyebrow) + price (mono 2.25rem) + description + feature bullets (10px dot + 14px text) + CTA (primary for featured, secondary for the other two)

FAQ: 3-5 accordion items, --border bottom, --space-4 vertical padding
```

---

## 9. Admin Panel Patterns (Sprint 10 prep)

### 9.1 Admin sidebar (240px, --surface-1, --border-right)

```
Top: "AMPH Academy" logotype + "Admin" badge (--danger, 11px, --danger-soft bg)
Nav items (in order):
  - Dashboard (House)
  - Users (Users)
  - Courses (Books)
  - Content (NotePencil)
  - Payments (CreditCard)
  - Refunds (ArrowsCounterClockwise)
  - Live Classes (Calendar)
  - Simulators (Toolbox)
  - Badges (Trophy)
  - Settings (Gear)
Each item: icon (20px) + label, --space-3 vertical padding, --ink-700 fg, hover --surface-2 bg, active has 2px --accent left border
Bottom: user card (avatar, name, role, logout)
```

### 9.2 Admin dashboard

```
Header: "Admin Dashboard" (h1) + "Welcome, [name]" subtitle

Stats row: 6 tiles in a row (one per Sprint 10 spec tile)
  - Each: small label (--ink-500, --text-sm) + large number (mono, --text-2xl) + delta indicator

Recent activity: table (last 20 actions, sortable by date)
Pending actions: cards stacked vertically (refund requests, flag-fraud alerts)
```

### 9.3 Admin list page (Users, Courses, Payments, etc.)

```
Header: H1 + "Create [thing]" primary button (right)

Filter bar (white card, --space-4 padding, --space-3 gap):
  - Search input (left, flex-1)
  - Filter dropdowns (right, 32px height)
  - Date range (where applicable)
  - Apply / Clear buttons

Data table (white card, 1px --border outer, sticky header):
  - Pagination 20-50 per page
  - Row actions: kebab menu (⋮) → Edit, View, Delete (danger)

Empty state: centered text "No [things] found" + secondary action
```

### 9.4 Admin detail page (User, Course, Payment, etc.)

```
Breadcrumb: [Section] / [Item name]
Header: H1 + metadata (email, role, created) + action buttons (right: Edit, Suspend, Delete)
Tabs (where applicable): [Overview] [Sub-section1] [Sub-section2] [Sub-section3]
  Active tab: 2px --accent bottom border
Tab content: stats row + cards + tables, as appropriate
```

### 9.5 Admin editor (Course edit, Settings, etc.)

```
Two-column layout:
  Left (60%): form fields
  Right (40%): preview or metadata panel

Form fields stacked, --space-4 gap, --text-base
Save bar (sticky bottom): "Save changes" primary + "Cancel" ghost
Validation errors inline below each field
```

---

## 10. Information density rules

- Default table row height: 40px
- Default form row gap: 16px (`--space-4`)
- Default card padding: 16px (`--space-4`)
- Default section gap: 24px (`--space-6`)
- Max reading line length: 72ch (lesson body), 60ch (UI text)
- Min tap target (mobile): 44px × 44px

**The 2am rule:** a student on their phone at 2am, tired, needs to find a button. They scroll, the button is there, the button is the right size, the button does what it says. No hunting, no hero text, no "we're here to help" interstitial.

---

## 11. Accessibility

- All text meets WCAG AA contrast against its background
- All interactive elements reachable by keyboard
- Focus ring: 2px `--accent`, 2px offset (never `outline: none` without replacement)
- All form inputs have labels (placeholders are NOT labels)
- All images have alt text; decorative images have `alt=""`
- All motion respects `prefers-reduced-motion`
- Color is not the only signal: errors have text + icon + color
- Tap targets ≥ 44px × 44px on mobile
- Skip link: hidden until focused, jumps to `#main-content`

---

## 12. Z-index scale

```
--z-dropdown: 100
--z-sticky: 200
--z-modal-backdrop: 300
--z-modal: 400
--z-toast: 500
--z-tooltip: 600
```

---

## 13. Implementation stack

- **CSS Modules** for component styles (`Component.module.css` + `Component.tsx` pattern)
- **No Tailwind** — design tokens as CSS custom properties
- **No styled-components** — pure CSS Modules
- **ESLint rule** (planned, not yet enforced in greenfield): `local/no-tailwind-classes` blocks Tailwind; `local/use-design-tokens` warns on hardcoded colors
- **Component location:** `src/components/ui/<Name>.tsx` + `<Name>.module.css`, re-exported from `src/components/ui/index.ts`
- **No `src/lib/`** in greenfield yet — see [Greenfield UI Gaps](#14-greenfield-ui-gaps) below

---

## 14. Greenfield UI Gaps

**These are the gaps between this design spec and what `amph-v2-greenfield` currently has.** These will be addressed before or during the UI-heavy stories (Sprint 10 admin panel, any dashboard story).

### Tokens to add to `globals.css`

Missing tokens that the design spec requires:

- **Surfaces:** fix `--surface-1` (currently `#F4F3EE`, should be `#FFFFFF`)
- **Surfaces:** add `--surface-3` (`#1A1A1A`)
- **Border:** add `--border-strong` (`#A3A3A3`)
- **Brand:** add `--accent-ink` (`#1A1A2E`) — required for accessible button text
- **Semantic:** add `--warning`, `--warning-soft`, `--info`, `--info-soft`, `--success-soft`
- **Ink:** add `--ink-inverse` (`#FAFAF7`)
- **Typography:** add `--font-display`, `--font-body`, `--text-xs` through `--text-4xl`, `--leading-*` scale
- **Spacing:** add `--space-1` through `--space-20`
- **Radius:** add `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- **Shadow:** add `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- **Z-index:** add `--z-dropdown` through `--z-tooltip`
- **Motion:** add `--duration-fast/base/slow`, `--ease-out/in/in-out`
- **Container:** add `--max-content`, `--max-reading`, `--max-form`, `--side-pad`, `--bp-*`

### Components to build

`src/components/ui/`:
- `Button.tsx` + `Button.module.css` (primary/secondary/ghost/danger variants, sm/md/lg sizes)
- `Card.tsx` + `Card.module.css` (default, interactive variants)
- `Input.tsx` + `Input.module.css` (with label, hint, error)
- `Badge.tsx` + `Badge.module.css` (success/warning/danger/info/accent/neutral variants)
- `Modal.tsx` + `Modal.module.css`
- `Toast.tsx` + `Toast.tsx` (with ToastProvider context)
- `NavSidebar.tsx` + `NavSidebar.module.css`
- `TopBar.tsx` + `TopBar.module.css`
- `BottomNav.tsx` + `BottomNav.module.css`
- `Icon.tsx` (Phosphor wrapper)
- `Tabs.tsx` (underline indicator)
- `Table.tsx` (sticky header, mono numbers)
- `RevealSection.tsx` (scroll-reveal wrapper)
- `index.ts` (re-export barrel)

### Lib to build (`src/lib/`)

- `src/lib/auth.ts` — `getSession`, `requireAuth`, `requireAdmin`, `signToken`, `verifyToken`, `setAuthCookie`, `clearAuthCookie`, `hashPassword`, `verifyPassword`
- `src/lib/db.ts` — singleton Prisma client
- `src/lib/format.ts` — `formatPhp`, `formatDate`, `formatRelative`, etc.
- `src/lib/brand.ts` — `BRAND_NAME`, `BRAND_NAME_UPPER` constants
- `src/lib/logger.ts` — structured logger (pino, deferred to Sprint 11)
- `src/lib/tracing.ts` — trace() HOC for action tracing (deferred to Sprint 11)

### ESLint additions

Add to `eslint.config.mjs`:
- `local/no-tailwind-classes` — block Tailwind classes (currently many pages use `className="bg-[var(--surface)]"` etc.)
- `local/use-design-tokens` — warn on hardcoded hex colors

### Stories that depend on this foundation

- **STORY-046** Admin layout + `requireAdmin()` + admin dashboard — **BLOCKED** until `src/components/ui/`, `src/lib/auth.ts`, design tokens are in place
- Any story after 046 that touches admin pages is also blocked

### Recommended prep order (before STORY-046)

1. **STORY-046-prep-1** — Design tokens + globals.css update (no behavior change, just CSS variables)
2. **STORY-046-prep-2** — `src/lib/auth.ts` + `src/lib/db.ts` (consolidates the scattered `getCurrentUserId` TODOs)
3. **STORY-046-prep-3** — `src/components/ui/` component library (Button, Card, Input, Badge at minimum; others can wait for their use case)
4. **STORY-046-prep-4** — `src/app/(dashboard)/layout.tsx` and `(public)/layout.tsx` route groups (decide sidebar vs public layout)
5. **STORY-046** itself — admin layout + dashboard

Steps 1-3 are pure UI prep with no business logic. Step 4 is the route-group refactor. Step 5 is the actual story.

---

## 15. Files

| File | Purpose |
|---|---|
| `docs/ui-specs/DESIGN-SPEC.md` | This document |
| `docs/ui-specs/STITCH-PROMPTS.md` | The original 1555-line Stitch prompt reference (kept for archive; contains copy) |
| `docs/ui-specs/refs/` | Reference React/TS files pulled from the parent `amph-v2` repo (admin/users, dashboard, home page) for code patterns |

The Stitch prompts are kept as a reference but **should not be used directly** as page text — they were written for a different brand. Use them for layout and component patterns only.
