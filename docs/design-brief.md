# Project Amazon PH Academy v2 — Design Brief

**Taste direction:** Amazon PH Academy simulator system

**Owner:** Ryan Roland Dabao

**Updated:** 2026-08-26

**Canonical reference:** `projectamazonph/amazon-ph-simulators`

---

## The Direction, In One Line

A focused Amazon training platform with a navy operating shell, cool-gray work surfaces, white cards, compact operational controls, and Amazon orange for actions that matter.

## What This Is

This application is part of the Project Amazon PH Academy ecosystem. It should feel at home beside the simulator platform: clear, practical, dense enough for real workflows, and consistently themed from student-facing routes through the admin console. The interface helps learners and operators act with confidence; it does not imitate a paper manual or a generic SaaS dashboard.

The retired **Field Manual** direction no longer governs design decisions. Do not use warm paper neutrals, Waybill Orange (`#FF6B35`), Space Grotesk, JetBrains Mono, or a global no-shadow rule. The full token system and migration guidance are maintained in [`DESIGN.md`](../DESIGN.md).

## Visual Reference

| Layer | Simulator theme decision | Amph implementation |
|---|---|---|
| Shell | Deep navy global chrome with orange brand and active states | Admin sidebar and mobile navigation chrome. |
| Work surface | Cool near-white gray | All page canvases and muted regions. |
| Panels | White with a slim border and subtle elevation | Cards, forms, tables, and Astryx panels. |
| Primary action | Amazon orange with dark navy text | Primary buttons, selected navigation, keyboard focus. |
| Type | Archivo headings, PT Sans body, IBM Plex Mono data | Loaded globally in `src/app/layout.tsx`. |
| Density | Compact but not cramped | 4px spacing scale, 36px default controls, readable tables. |

## Color System

All values are defined in `src/app/globals.css`. New work uses canonical `--c-*` tokens; older `--surface-*`, `--ink-*`, and `--accent` aliases remain supported for CSS-module migration only.

### Core tokens

| Token | Value | Use |
|---|---:|---|
| `--c-navy-1` | `#0F1419` | Deep overlay or strongest navy. |
| `--c-navy-2` | `#131921` | Primary sidebar and shell navy. |
| `--c-navy-3` | `#232F3E` | Secondary shell navy. |
| `--c-orange` | `#FF9900` | Primary actions, selection, and focus. |
| `--c-orange-h` | `#FFA41C` | Primary hover. |
| `--c-orange-soft` | `#FEF3E7` | Selection wash and table row hover. |
| `--c-bg` | `#F7F8FA` | Page canvas. |
| `--c-bg-2` | `#EEF1F4` | Muted surface and table header. |
| `--c-card` | `#FFFFFF` | Card, form-control, and table surface. |
| `--c-border` | `#D5D9D9` | Standard border. |
| `--c-ink` | `#0F1111` | Primary content text. |
| `--c-ink-2` | `#232F3E` | Headings. |
| `--c-sub` | `#565959` | Supporting copy. |
| `--c-faint` | `#767B7B` | Metadata. |
| `--c-link` | `#007185` | Text links and ghost actions. |

### Semantic states

| State | Foreground | Background | Use |
|---|---|---|---|
| Success | `--c-green-text` | `--c-green-bg` | Completed, confirmed, passed. |
| Warning | `--c-amber-text` | `--c-amber-bg` | Pending, attention needed. |
| Error | `--c-red-text` | `--c-red-bg` | Errors and destructive feedback. |
| Information | `--c-blue-text` | `--c-blue-bg` | Neutral help or guidance. |

## Typography

| Use | Family | Weight | Notes |
|---|---|---:|---|
| Page and section headings | Archivo | 700 | Tight line height, slight negative tracking. |
| Buttons, labels, table headers | Archivo | 600 | Compact, clear operating controls. |
| Body and form copy | PT Sans | 400–700 | Default reading face. |
| Tight secondary label | Barlow Condensed | 500–700 | Use sparingly when constrained. |
| IDs, amounts, code, timestamps | IBM Plex Mono | 400–600 | Use only when fixed-width scanning adds value. |

Use fluid `--fs-h1`, `--fs-h2`, `--fs-h3`, and `--fs-body` values. No weight above 700. Do not reintroduce Space Grotesk or JetBrains Mono.

## Spacing, Shape, and Elevation

The base unit is 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Use the token form (`--sp-*` or existing `--space-*` aliases) instead of raw values.

| Component | Radius | Default elevation | Interactive state |
|---|---|---|---|
| Button | `--r-md` / 6px | Border-led control surface | Color and border change; active moves down 1px. |
| Input | `--r-md` / 6px | Border-led field | Orange border and focus shadow. |
| Card | `--r-lg` / 8px | `--sh-1` | `--sh-2`, orange-tint border, lift 1px. |
| Table | `--r-md` / 6px | Bordered white surface | Orange-soft row hover. |
| Tag | `--r-pill` | Soft semantic fill | No button-like saturated treatment. |

The simulator system uses intentional, subtle elevation. Static panels are not completely flat, but shadows must never become soft, floating decoration.

## Admin Shell

Desktop admin pages use a 240px sticky sidebar with a `--c-navy-2` to `--c-navy-3` gradient, `--c-shell-*` text ramp, and orange active states. The main panel has a `--c-bg` canvas, a maximum content width of 1100px, 24px desktop side padding, and 96px of bottom breathing room.

On screens below 1024px, the sidebar becomes a navy drawer. A visible mobile control opens it; the content canvas has 16px side padding. Wide tables must scroll inside their own containment rather than extending the page width.

## Component Rules

### Buttons

Primary buttons are orange with navy text. Secondary buttons are white with a standard border. Ghost buttons are transparent and use `--c-link`. Destructive buttons are red outlined on white and receive a red soft hover. Default button height is 36px, with 28px compact and 44px large variants.

### Cards, forms, and tables

Cards use the white surface, standard border, 8px radius, and `--sh-1`. Inputs use a white surface, border, 6px radius, and 36px minimum height. Tables use cool-gray headers with uppercase Archivo labels and white rows that turn orange-soft on hover.

### Interaction and motion

Use 120ms transitions for common control states and 180ms for component elevation. Visible focus uses a 2px orange outline plus the orange focus shadow where appropriate. All motion becomes effectively instant for `prefers-reduced-motion`.

## Accessibility and Guardrails

- Maintain WCAG AA contrast, keyboard access, labels, captions, and non-color state indicators.
- Retain 44px effective touch targets for key mobile controls.
- Avoid backdrop blur, glassmorphism, neon, decorative gradients, and scroll-triggered motion.
- Prevent horizontal page overflow. Long labels, cards, and action groups must wrap or truncate safely; tables may scroll within a contained wrapper.
- Never add raw colors or alternate font stacks inside CSS Modules. Update the shared token system first.
- Use `DESIGN.md` for detailed tokens and `src/app/globals.css` as implementation truth.
