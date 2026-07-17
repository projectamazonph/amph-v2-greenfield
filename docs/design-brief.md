# Design Brief — Project Amazon PH Academy v2

**Taste direction:** Field Manual
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield; same direction as legacy amph-v2)

---

## The Direction, In One Line

Dense, scannable, slightly utilitarian. Like a 1970s technical reference manual printed for people who actually have to use the information at 2am.

## What This Is NOT

- Not glassmorphism with gradient orbs.
- Not cyan-on-dark with neon accents.
- Not a portfolio site with oversized hero text and 80% white space.
- Not an "AI-built SaaS" template that looks like every other AI-built SaaS template.

## What This IS

A training platform. The student is here to learn Amazon advertising, not to admire the design. The interface should get out of the way of the content. Density is a feature, not a bug.

Reference points (for inspiration, not copying):

- **Old technical manuals** (think: 1970s electronics service manuals, Federal Express waybills, military field guides). Information-dense, hierarchical, typographically clear.
- **Modern trading terminals** (think: Bloomberg Terminal aesthetics, but lighter). Information first, decoration last.
- **Stripe Press** (typography-led, no decorative gradients, hierarchy through type scale).
- **Linear** (restrained color, deliberate motion, density without claustrophobia).

## Color System

A small palette. Use it with discipline.

### Base

| Token | Value | Use |
|-------|-------|-----|
| `--surface-0` | `#FAFAF7` | App background (warm off-white, never pure white) |
| `--surface-1` | `#FFFFFF` | Cards, panels, elevated content |
| `--surface-2` | `#F4F3EE` | Subtle differentiation, hover states |
| `--surface-3` | `#1A1A1A` | Dark mode background |
| `--ink-900` | `#171717` | Primary text |
| `--ink-700` | `#404040` | Secondary text |
| `--ink-500` | `#737373` | Tertiary text, metadata |
| `--ink-300` | `#D4D4D4` | Disabled, dividers |
| `--border` | `#E5E5E0` | Default border, 1px |

### Brand

| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#FF6B35` | Primary actions, active states, brand color |
| `--accent-soft` | `#FFE5D9` | Subtle backgrounds, hover washes |
| `--success` | `#0E7C3A` | Completed states, correct answers |
| `--warning` | `#B45309` | Pending, attention needed |
| `--danger` | `#B91C1C` | Errors, destructive actions, wrong answers |

### Rule

Use `--accent` sparingly. One accent element per viewport when possible. Two maximum. Accent draws the eye; drawing the eye to everything draws it to nothing.

## Typography

### Type Pairing

| Use | Family | Weight |
|-----|--------|--------|
| Display, headings | Space Grotesk | 500, 600, 700 |
| Body | Space Grotesk | 400, 500 |
| UI labels | Space Grotesk | 500 |
| Numbers, code, technical | JetBrains Mono | 400, 500 |

### Scale

| Token | Size | Use |
|-------|------|-----|
| `--text-display` | 48px / 56px line-height | Marketing hero only |
| `--text-h1` | 32px / 40px | Page titles |
| `--text-h2` | 24px / 32px | Section titles |
| `--text-h3` | 20px / 28px | Sub-section titles |
| `--text-body-lg` | 18px / 28px | Lesson body, intro paragraphs |
| `--text-body` | 16px / 24px | Default body |
| `--text-body-sm` | 14px / 20px | Secondary body, captions |
| `--text-caption` | 12px / 16px | Metadata, timestamps |
| `--text-mono` | 14px / 20px | Tabular numbers, code |

### Rule

One display size per page. The hero is the only `--text-display`. Everything else is `--text-h1` or smaller. Headings are heavier; body is regular. No font-weight 800 or 900 — too loud for the manual aesthetic.

## Spacing

A 4px base unit. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Inline gaps |
| `--space-2` | 8px | Tight padding |
| `--space-3` | 12px | Default padding |
| `--space-4` | 16px | Card padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Major section gaps |
| `--space-12` | 48px | Page top/bottom on desktop |
| `--space-16` | 64px | Hero gaps |

## Layout

### Breakpoints

- `--bp-sm` — 390px (iPhone 14 width, the floor)
- `--bp-md` — 768px (tablet portrait)
- `--bp-lg` — 1024px (tablet landscape, sidebar threshold)
- `--bp-xl` — 1280px (laptop, the design target)
- `--bp-2xl` — 1536px (max content width)

Max content width: 1200px. Beyond 1200px, content stays the same width; whitespace grows. The design is not designed for ultrawide.

### Sidebar (≥ 1024px)

Fixed left sidebar, 240px wide. Background `--surface-1`, border-right `--border`. Contents: nav items, user card at the bottom.

### Mobile (< 1024px)

No sidebar. Bottom nav (4 slots: Home, Courses, Tools, Profile). Hamburger menu for secondary nav.

## Components

### Button

```
Primary:    bg --accent,        fg --surface-1,  hover darken 4%
Secondary:  bg --surface-1,     fg --ink-900,    border --border, hover bg --surface-2
Ghost:      bg transparent,     fg --ink-700,    hover bg --surface-2
Danger:     bg --danger,        fg --surface-1,  hover darken 4%
```

Height: 40px (default), 32px (compact), 48px (large). Padding: 0 16px. Border-radius: 6px. Font: 14px, weight 500.

### Card

Background `--surface-1`. Border 1px `--border`. Border-radius 8px. Padding `--space-4`. Shadow: none (the border is the elevation; shadow would fight the manual aesthetic). Hover (interactive cards only): border `--ink-300`.

### Input

Height 40px. Background `--surface-1`. Border 1px `--border`. Border-radius 6px. Focus: border `--accent`, ring 2px `--accent-soft`. Error: border `--danger`. Placeholder color: `--ink-500`.

### Table

Background `--surface-1`. Header background `--surface-2`, font 12px, weight 500, uppercase, letter-spacing 0.04em, color `--ink-500`. Row hover: `--surface-2`. Border: 1px `--border` between rows, no outer border. Sticky header on scroll.

### Tag / Badge

Small pill. Height 20px. Padding 0 8px. Font 12px, weight 500. Background `--surface-2` or `--accent-soft`. Color `--ink-700` or `--accent`.

### Tabs

Underline indicator, 2px, color `--accent`. Active text `--ink-900`, weight 500. Inactive text `--ink-500`. No background change on hover. Hover: text `--ink-700`.

## Motion

Restrained. The design system has three motions:

1. **Fade in** — 200ms, ease-out. For content appearing (page loads, modal opens).
2. **Slide up** — 240ms, cubic-bezier(0.16, 1, 0.3, 1). For modals, drawers.
3. **Color transition** — 120ms, ease-out. For hover, focus, active states.

That's it. No bounce, no spring, no parallax, no scroll-triggered animations. The information is the show.

## Density

- Default table row height: 40px.
- Default form row gap: 16px.
- Default card padding: 16px.
- Default section gap: 24px.
- Max content line length: 72ch (lesson body), 60ch (UI text).

The 2am rule: a student on their phone at 2am, tired, needs to find a quiz retry button. They scroll, the button is there, the button is the right size, the button does what it says. No hunting, no hero text, no "we're here to help" interstitial.

## Iconography

Phosphor (light weight) only. No other icon set. No emojis in the UI. Icon size: 16px (inline), 20px (button), 24px (nav).

Common icons and their meaning in this app:
- `House` — dashboard / home
- `Books` — courses
- `Toolbox` — simulators
- `UserCircle` — profile / account
- `Trophy` — badges
- `Certificate` — certificates
- `Calendar` — live classes
- `CreditCard` — payments
- `Receipt` — receipts
- `ArrowLeft` / `ArrowRight` — back / next
- `Check` — success, completed
- `X` — close, error
- `Warning` — pending, attention
- `Info` — informational
- `MagnifyingGlass` — search
- `Funnel` — filter
- `Download` — download
- `Copy` — copy to clipboard

## Accessibility

- All text meets WCAG AA contrast against its background. Tested with axe in CI.
- All interactive elements are reachable by keyboard. Focus ring is 2px `--accent`, 2px offset.
- All form inputs have labels. Placeholders are not labels.
- All images have alt text. Decorative images have `alt=""`.
- All motion respects `prefers-reduced-motion`. When set, fade and slide are instant.
- Color is not the only signal. Errors have text + icon + color. Success has text + icon + color.
- Tap targets on mobile are at least 44px × 44px.

## What This System Is Not For

- Marketing pages with full-bleed hero videos. (We have one landing page. It is dense.)
- Long-form articles with multiple columns. (Lessons are single-column, 72ch max.)
- Interactive data visualization beyond simple tables. (Charts use the same restrained palette.)
- Anything that requires the user to admire it. The user is here to work.

## Implementation Notes

- CSS Modules only. No Tailwind. No styled-components. The token system lives in `src/styles/tokens.css` and is imported once.
- Design tokens are CSS custom properties, not TypeScript constants. (No need to keep two in sync.)
- The ESLint rule `local/no-tailwind-classes` blocks Tailwind. The ESLint rule `local/use-design-tokens` warns on hardcoded colors.
- New components go in `src/components/ui/<Name>.tsx` + `<Name>.module.css`. Exported from `src/components/ui/index.ts`.
