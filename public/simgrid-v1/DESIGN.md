# Amazon PH Academy - Design System

## Overview

Amazon PH Academy is a training simulator platform for Amazon advertising. This document defines the design tokens, component patterns, and usage rules that maintain visual consistency across all pages.

## Design Tokens

All tokens are defined in `assets/tokens.css` and must be used instead of hard-coded values.

### Color Tokens

#### Brand Colors

```css
--c-navy-1: #0f1419 /* deepest */ --c-navy-2: #131921 /* amazon primary */ --c-navy-3: #232f3e
  /* amazon secondary */ --c-navy-4: #37475a /* tertiary */ --c-navy-5: #485769 /* hover line */
  --c-orange: #ff9900 /* brand accent */ --c-orange-h: #ffa41c /* hover */ --c-orange-d: #e47911
  /* active/pressed */ --c-orange-soft: #fef3e7 /* tinted bg */ --c-orange-tint: #fce3c2
  /* tag bg */;
```

#### Surface Colors

```css
--c-bg: #f7f8fa /* page bg */ --c-bg-2: #eef1f4 /* alt bg */ --c-card: #ffffff /* card bg */
  --c-card-hi: #fafbfc /* card hover */ --c-border: #d5d9d9 --c-border-2: #e7e7e7
  --c-line-soft: #eef1f4;
```

#### Text Colors

```css
--c-ink: #0f1111 /* primary text */ --c-ink-2: #232f3e /* heading */ --c-sub: #565959
  /* secondary */ --c-faint: #767b7b /* tertiary */ --c-disabled: #b1b6bc --c-link: #007185
  /* amazon link */ --c-link-h: #c7511f /* amazon link hover */;
```

#### Semantic Colors

```css
--c-green: #067d62 --c-green-bg: #e6f4f0 --c-green-text: #054a3a --c-amber: #c45500
  --c-amber-bg: #fff4e5 --c-amber-text: #8a5300 --c-red: #b12704 --c-red-bg: #fdeded
  --c-red-text: #8a1f00 --c-blue: #007185 --c-blue-bg: #e7f3f4 --c-blue-text: #054a5a
  --c-gold: #ffd166 --c-purple: #6b3fa0 --c-purple-bg: #f0e8ff;
```

### Typography Tokens

#### Font Families

```css
--font-disp:
  "Archivo", system-ui, -apple-system, sans-serif --font-body: "PT Sans", system-ui, -apple-system,
  sans-serif --font-cond: "Barlow Condensed", "Archivo", sans-serif --font-mono: "IBM Plex Mono",
  ui-monospace, Menlo, monospace;
```

#### Font Sizes

```css
--fs-12: 12px --fs-13: 13px --fs-14: 14px --fs-15: 15px --fs-16: 16px --fs-18: 18px --fs-20: 20px
  --fs-24: 24px --fs-32: 32px --fs-40: 40px;
```

#### Fluid Typography

```css
--fs-body: clamp(0.875rem, 0.8rem + 0.4vw, 1rem)
  --fs-body-sm: clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)
  --fs-h1: clamp(1.75rem, 1.2rem + 2.6vw, 2.5rem) --fs-h2: clamp(1.25rem, 1rem + 1.2vw, 1.5rem)
  --fs-h3: clamp(1.0625rem, 0.95rem + 0.6vw, 1.25rem);
```

### Spacing Tokens

```css
--sp-1: 4px --sp-2: 8px --sp-3: 12px --sp-4: 16px --sp-5: 20px --sp-6: 24px --sp-8: 32px
  --sp-10: 40px --sp-12: 48px --sp-16: 64px;
```

### Radius Tokens

```css
--r-xs: 2px --r-sm: 4px --r-md: 6px --r-lg: 8px --r-xl: 12px --r-pill: 999px;
```

### Shadow Tokens

```css
--sh-1: 0 1px 2px rgba(15, 17, 17, 0.08) --sh-2: 0 2px 6px rgba(15, 17, 17, 0.1) --sh-3: 0 4px 14px
  rgba(15, 17, 17, 0.12) --sh-4: 0 8px 24px rgba(15, 17, 17, 0.16) --sh-focus: 0 0 0 3px
  rgba(255, 153, 0, 0.35);
```

## Usage Rules

### DO

- Use tokens for all colors, spacing, typography, radius, and shadows
- Import `tokens.css` in every HTML file
- Use semantic tokens like `--c-card`, `--c-ink`, `--c-sub` over raw colors
- Use `--c-link` for clickable text
- Use fluid typography tokens (`--fs-body`, `--fs-h1`) for responsive text

### DON'T

- Use hard-coded hex values like `#FF9900`, `#FFFFFF`
- Use arbitrary pixel values like `margin: 17px` - use `--sp-*` tokens
- Define new colors without adding to tokens.css first
- Use `--primary` directly (use `--c-orange` instead)

### Legacy Token Aliases

For backward compatibility, these aliases exist:

```css
--primary: var(--c-orange) --primary-dark: var(--c-orange-d) --success: var(--c-green)
  --surface: var(--c-card) --surface-alt: var(--c-bg) --text: var(--c-ink)
  --text-muted: var(--c-sub) --border: var(--c-border);
```

**Note:** New code should use the primary token names (e.g., `--c-orange` instead of `--primary`).

## Component Patterns

### Buttons

Use CSS classes from skin.css rather than raw styles.

### Cards

- Background: `var(--c-card)`
- Border: `1px solid var(--c-border)`
- Border-radius: `var(--r-xl)`
- Shadow: `var(--sh-1)` (use `var(--sh-2)` on hover)

### Forms

- Input background: `var(--c-card)`
- Border: `1px solid var(--c-border)`
- Focus ring: `var(--sh-focus)`

### Overflow Protection

All tables, buttons, and cards have automatic overflow protection via `responsive.css`. Additional utilities are available:

```css
/* Break long words */
.overflow-break {
  overflow-wrap: break-word;
  word-break: break-word;
}

/* Single line truncate with ellipsis */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line clamp */
.line-clamp-2 {
  -webkit-line-clamp: 2;
}
.line-clamp-3 {
  -webkit-line-clamp: 3;
}
```

## File Structure

```
assets/
├── tokens.css      # Design tokens (single source of truth)
├── skin.css        # Component styles and skin variants
├── shell.css       # Layout shell (topbar, sidenav)
├── hub.css         # Hub page styles
├── guide.css       # Getting started guide styles
└── responsive.css   # Responsive utilities
```

## Enforcement

To prevent design debt:

1. ESLint/stylint rule: warn on hex colors in CSS files (except tokens.css)
2. Code review: check for token usage
3. Pre-commit hooks: validate token references
