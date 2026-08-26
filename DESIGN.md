---
name: Project Amazon PH Academy v2
description: The Amazon PH Academy simulator visual system — cool operational surfaces, navy shell chrome, Amazon orange actions, and compact training-platform density.
reference: projectamazonph/amazon-ph-simulators
colors:
  navy-deep: "#0F1419"
  navy-primary: "#131921"
  navy-secondary: "#232F3E"
  navy-tertiary: "#37475A"
  orange: "#FF9900"
  orange-hover: "#FFA41C"
  orange-pressed: "#E47911"
  background: "#F7F8FA"
  background-alt: "#EEF1F4"
  card: "#FFFFFF"
  border: "#D5D9D9"
  ink: "#0F1111"
  ink-heading: "#232F3E"
  link: "#007185"
  success: "#067D62"
  warning: "#C45500"
  danger: "#B12704"
typography:
  display: "Archivo, system-ui, -apple-system, sans-serif"
  body: "PT Sans, system-ui, -apple-system, sans-serif"
  condensed: "Barlow Condensed, Archivo, sans-serif"
  mono: "IBM Plex Mono, ui-monospace, Menlo, monospace"
spacing:
  base: "4px"
  scale: "4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px"
radius:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
---

# Design System: Project Amazon PH Academy v2

## 1. Direction

**Creative north star: the Amazon PH Academy simulator system.** The product is a practical training environment with a recognisable Amazon-adjacent interface: a dark navy operating shell, clear white and cool-gray work surfaces, compact control density, and Amazon orange used for the actions and states that need attention. The application should feel consistent with the simulator platform, whether a learner is reading a lesson, completing a workflow, or an administrator is managing content.

This direction supersedes the prior **Field Manual** aesthetic. Warm-paper surfaces, Waybill Orange (`#FF6B35`), Space Grotesk, JetBrains Mono, and a default no-shadow policy are retired. The interface now uses the shared simulator hierarchy: **navy for global context, white for work, orange for action, and a small semantic palette for status**.

| Principle | Application |
|---|---|
| **Operational clarity** | Favor familiar controls, visible hierarchy, compact data tables, and clear action states over decorative experimentation. |
| **Shared Academy identity** | Use the exact simulator palette, type roles, spacing scale, radii, elevation, and responsive behavior. |
| **Action hierarchy** | Orange identifies primary actions, active navigation, keyboard focus, and the most important status transition in a local context. |
| **Controlled density** | Keep information efficient and scan-friendly without returning to the prior deliberately austere field-manual treatment. |
| **Accessible predictability** | Preserve semantic markup, focus visibility, readable contrast, reduced-motion support, and 44px mobile targets. |

## 2. Source of Truth and Token Contract

The canonical visual reference is [`amazon-ph-simulators`](https://github.com/projectamazonph/amazon-ph-simulators): its `assets/tokens.css` establishes the values, while its shared skin and shell demonstrate their application. In this application, `src/app/globals.css` is the runtime token source of truth and `src/themes/amph-theme.ts` maps the same palette into Astryx components.

New CSS must use the canonical `--c-*`, `--sp-*`, `--r-*`, `--sh-*`, and typography tokens. Legacy aliases such as `--surface-0`, `--ink-900`, and `--accent` remain temporarily for existing CSS Modules; they resolve to the simulator values and must not be assigned new values locally.

> **Token rule:** Do not add hard-coded colors, one-off spacing, or substitute fonts in page-level CSS. Extend the shared token system first, then consume the token everywhere.

## 3. Color System

### 3.1 Brand and shell

| Token | Value | Role |
|---|---:|---|
| `--c-navy-1` | `#0F1419` | Deepest shell and overlay tone. |
| `--c-navy-2` | `#131921` | Primary navy for the admin sidebar and shell chrome. |
| `--c-navy-3` | `#232F3E` | Secondary navy and shell gradient end. |
| `--c-navy-4` | `#37475A` | Tertiary navy and emphasized shell detail. |
| `--c-navy-5` | `#485769` | Shell hover line and emphasized border. |
| `--c-orange` | `#FF9900` | Primary action, focus, active navigation, selected state. |
| `--c-orange-h` | `#FFA41C` | Primary-action hover state. |
| `--c-orange-d` | `#E47911` | Pressed state and darker orange detail. |
| `--c-orange-soft` | `#FEF3E7` | Selection wash and row hover. |
| `--c-orange-tint` | `#FCE3C2` | Orange-tinted border and tag treatment. |

### 3.2 Work surfaces and text

| Token | Value | Role |
|---|---:|---|
| `--c-bg` | `#F7F8FA` | Global page background. |
| `--c-bg-2` | `#EEF1F4` | Muted surface, table header, neutral hover. |
| `--c-card` | `#FFFFFF` | Cards, panels, tables, and form controls. |
| `--c-card-hi` | `#FAFBFC` | Interactive-card hover surface. |
| `--c-border` | `#D5D9D9` | Standard border and table frame. |
| `--c-border-2` | `#E7E7E7` | Soft separator. |
| `--c-ink` | `#0F1111` | Default content text. |
| `--c-ink-2` | `#232F3E` | Heading and high-emphasis text. |
| `--c-sub` | `#565959` | Supporting text and labels. |
| `--c-faint` | `#767B7B` | Metadata and tertiary text. |
| `--c-disabled` | `#B1B6BC` | Disabled text and placeholders. |
| `--c-link` | `#007185` | Link and ghost-action text. |
| `--c-link-h` | `#C7511F` | Link hover. |

### 3.3 Semantic states

| State | Main token | Background token | Text token | Intended use |
|---|---|---|---|---|
| Success | `--c-green` | `--c-green-bg` | `--c-green-text` | Completion, passed outcomes, confirmed saves. |
| Warning | `--c-amber` | `--c-amber-bg` | `--c-amber-text` | Pending or attention-needed states. |
| Error | `--c-red` | `--c-red-bg` | `--c-red-text` | Validation errors, failed operations, destructive feedback. |
| Information | `--c-blue` | `--c-blue-bg` | `--c-blue-text` | Neutral help and supporting operational guidance. |

Color is never the sole carrier of meaning. Status surfaces must include readable text and, where the UI would otherwise be ambiguous, an icon or label.

## 4. Typography

The simulator pairing assigns a distinct role to each face. **Archivo** gives headings, buttons, table headers, and other high-attention UI a crisp operational hierarchy. **PT Sans** carries ordinary reading and form copy. **Barlow Condensed** is available for tightly constrained labels only, not as default body text. **IBM Plex Mono** is reserved for identifiers, timestamps, fixed-width numerical data, hashes, and code.

| Role | Token | Family | Size and line-height |
|---|---|---|---|
| Page heading | `--fs-h1` | Archivo | `clamp(1.75rem, 1.2rem + 2.6vw, 2.5rem)` / `1.15` |
| Section heading | `--fs-h2` | Archivo | `clamp(1.25rem, 1rem + 1.2vw, 1.5rem)` / `1.15` |
| Card heading | `--fs-h3` | Archivo | `clamp(1.0625rem, 0.95rem + 0.6vw, 1.25rem)` / `1.15` |
| Body | `--fs-body` | PT Sans | `clamp(0.875rem, 0.8rem + 0.4vw, 1rem)` / `1.55` |
| Small body | `--fs-body-sm` | PT Sans | `clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)` / `1.55` |
| Control label | `--fs-13` | Archivo | 13px / `1.3`, weight 600 |
| Table header | 11.5px | Archivo | Uppercase, `0.06em` tracking, weight 600 |
| Data / code | Contextual | IBM Plex Mono | Tabular numbers where appropriate |

Avoid weights above 700. Use size, spacing, contrast, and color—not excessive boldness—to establish hierarchy.

## 5. Spacing, Radius, Elevation, and Motion

The system uses a four-pixel base scale. Select the nearest token rather than creating arbitrary values. The preferred sequence is `--sp-1` (4px), `--sp-2` (8px), `--sp-3` (12px), `--sp-4` (16px), `--sp-5` (20px), `--sp-6` (24px), `--sp-8` (32px), `--sp-10` (40px), `--sp-12` (48px), and `--sp-16` (64px).

| Concern | Tokens | Default |
|---|---|---|
| Control radius | `--r-sm`, `--r-md` | 4px–6px for buttons, inputs, and compact tables. |
| Card radius | `--r-lg`, `--r-xl` | 8px by default; 12px only for larger panels. |
| Resting elevation | `--sh-1` | Cards and panels receive a subtle `0 1px 2px` shadow. |
| Interactive elevation | `--sh-2` | Interactive cards lift 1px and strengthen their shadow on hover. |
| Overlay elevation | `--sh-3`, `--sh-4` | Menus and modals only. |
| Focus treatment | `--sh-focus` | Orange 3px focus ring paired with an orange border. |
| Motion | `--d-fast`, `--d-base` | 120ms and 180ms, using `--ease`. |

Motion supports comprehension rather than decoration. Use color, opacity, and small transforms for state changes, keep keyboard-triggered actions immediate, and respect `prefers-reduced-motion`.

## 6. Component Patterns

### Buttons

Primary actions use `--c-orange` with `--c-navy-2` text, `--r-md` corners, an Archivo 600 label, and a compact 36px default height. Hover changes the fill to `--c-orange-h`; active presses down by 1px. Secondary controls remain white with a standard border, while ghost controls use `--c-link` text and a transparent surface. Destructive actions are outlined red on white and gain a red soft surface on hover.

### Cards and panels

Cards use `--c-card`, a 1px `--c-border`, `--r-lg`, and `--sh-1`. Interactive cards transition to `--c-card-hi`, use an `--c-orange-tint` border, lift one pixel, and gain `--sh-2`. This is a deliberate replacement for the retired no-shadow field-manual rule.

### Inputs and forms

Inputs use a white surface, 1px `--c-border`, `--r-md`, and PT Sans at 14px. The default minimum height is 36px; use 44px only for large or touch-critical actions. Focus uses `--c-orange` plus `--sh-focus`. Labels use Archivo 13px/600 and `--c-ink-2`; placeholders use `--c-disabled`.

### Tables

Tables sit on a white card surface with a standard border and compact `--r-md` corners. Headers use `--c-bg-2`, Archivo 600, uppercase 11.5px labels, and `0.06em` tracking. Rows receive soft separators and change to `--c-orange-soft` on hover. Preserve a visible caption or other accessible context and wrap wide tables so mobile users can scroll them horizontally.

### Badges and status chips

Badges use an inline, compact pill shape with a soft semantic background and its dark readable text token. They are status indicators—not miniature action buttons. The orange treatment is reserved for selected or primary context; success, warning, and error badges retain their semantic color families.

## 7. Admin Shell

Admin pages use a 240px sticky navy sidebar on desktop. It is the application’s equivalent of the simulator shell: `--c-navy-2` fading into `--c-navy-3`, with `--c-shell-ink` for high-emphasis content, `--c-shell-dim` for default navigation, and `--c-shell-faint` for section labels. The brand mark and primary active indicator use `--c-orange`.

Navigation items are compact but comfortably targetable. The active item uses a transparent orange wash, an orange-tinted border, orange text, and a 3px orange leading indicator. On small screens, the same shell becomes a drawer controlled by a navy mobile toggle; the content canvas stays `--c-bg` with 16px side padding.

The content area has a maximum working width of 1100px, 24px desktop padding, and 96px bottom padding. Page headings use Archivo, a muted breadcrumb, and a subtle bottom divider. Action buttons remain aligned with the title row when space allows and wrap beneath it on small screens.

## 8. Responsive and Accessibility Rules

The following rules apply to every route, including admin pages:

- Keep interactive targets at least 44px where touch operation is primary; compact table actions may be visually smaller only when the effective hit area remains accessible.
- Maintain visible keyboard focus using the orange outline and focus shadow. Do not suppress it without providing an equivalent indicator.
- Preserve `prefers-reduced-motion` support; transitions and animations must become effectively instantaneous when requested.
- Never rely on hover alone to reveal essential controls or information.
- Prevent horizontal page overflow. Tables, cards, long labels, and action groups must either wrap, truncate safely, or scroll in a contained region.
- Use the existing semantic structure, labels, captions, and ARIA behavior. A theme refactor must not weaken the established accessibility contracts.

## 9. Do and Do Not

| Do | Do not |
|---|---|
| Use navy shell chrome, cool-gray work surfaces, white cards, and Amazon orange primary actions. | Reintroduce warm paper surfaces, Waybill Orange, or the Field Manual palette. |
| Use Archivo for headings and controls; PT Sans for body text; IBM Plex Mono only for data. | Use Space Grotesk or JetBrains Mono as global fonts. |
| Use subtle card shadows that strengthen only for interactive elevation. | Treat every element as flat by default or apply large decorative shadows. |
| Use the shared four-pixel spacing scale and compact 4–12px radius family. | Add arbitrary spacing, oversized radii, or unbounded hero whitespace. |
| Use orange deliberately for primary action, focus, and selected context. | Use orange as generic text or spread it across every control. |
| Preserve no-blur overlays and minimal, functional animation. | Add glassmorphism, gradient orbs, neon effects, or decorative motion. |

## 10. Implementation Checklist

1. Start with `src/app/globals.css` and the canonical simulator tokens before changing page-level CSS.
2. Keep the legacy alias bridge working while page modules are migrated; do not duplicate a second theme.
3. Update Astryx tokens in `src/themes/amph-theme.ts` whenever a shared simulator token changes.
4. Route shared patterns through the UI primitives instead of adding per-page button, input, or card variants.
5. Confirm type checking, linting, token-contract tests, key UI regression tests, and responsive visual checks before merging.
6. Treat this document and `docs/design-brief.md` as aligned design guidance; changes to either require the other to remain consistent.
