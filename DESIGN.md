---
name: Project Amazon PH Academy v2
description: A dense, utilitarian training-platform interface — a field manual for Amazon PPC, not a SaaS showroom.
colors:
  manual-paper: "#FAFAF7"
  surface-card: "#FFFFFF"
  surface-subtle: "#F4F3EE"
  surface-dark: "#1A1A1A"
  ink-primary: "#171717"
  ink-secondary: "#404040"
  ink-tertiary: "#737373"
  ink-disabled: "#D4D4D4"
  ink-inverse: "#FAFAF7"
  border: "#E5E5E0"
  border-strong: "#A3A3A3"
  accent: "#FF6B35"
  accent-hover: "#E55A2B"
  accent-soft: "#FFE5D9"
  accent-ink: "#1A1A2E"
  success: "#0E7C3A"
  success-soft: "#DCFCE7"
  success-hover: "#0A6630"
  warning: "#B45309"
  warning-soft: "#FEF3C7"
  warning-hover: "#93420A"
  danger: "#B91C1C"
  danger-soft: "#FEE2E2"
  danger-hover: "#991313"
  info: "#1E40AF"
  info-soft: "#DBEAFE"
  info-hover: "#173296"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.01em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  "20": "80px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  card-default:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-interactive:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 14px"
  badge-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    height: "22px"
    padding: "0 12px"
---

# Design System: Project Amazon PH Academy v2

## 1. Overview

**Creative North Star: "The Field Manual"**

This system reads like a 1970s technical service manual or a Federal Express waybill, not a SaaS landing page: dense, hierarchical, typographically clear, built for someone who needs to find one specific piece of information under pressure. Every screen assumes the reader is a tired VA on a phone at 2am who needs to find the quiz retry button — not a visitor who needs to be sold, delighted, or slowed down with hero copy. Density is the point, not a compromise.

The palette stays disciplined on purpose: warm paper neutrals and near-black ink carry almost every surface, and Waybill Orange is spent like a rationed resource — one accent element per viewport, two at the absolute limit. Borders do the elevation work that shadows do everywhere else; nothing floats or glows without a state (hover, focus, error) earning it.

This system explicitly rejects glassmorphism with gradient orbs, cyan-on-dark neon, oversized-hero portfolio layouts with 80% white space, and the generic "AI-built SaaS" template look. It is not decorated. It is used.

**Key Characteristics:**

- Warm off-white paper base, never pure white as the app background
- One disciplined accent (Waybill Orange), spent sparingly and deliberately
- Borders as elevation; shadows only as a response to interaction, never at rest
- Space Grotesk for everything read as language; JetBrains Mono for everything read as data
- Motion limited to three moves: fade, slide-up, color transition — nothing else

## 2. Colors

The palette is a small, disciplined set: warm paper neutrals for structure, near-black ink for text, and exactly one saturated accent, spent like a rationed resource.

### Primary

- **Waybill Orange** (`#FF6B35`): The one accent. Primary buttons, active nav states, focus rings, links that must be noticed. Used sparingly — one element per viewport when possible, two maximum. Hover state darkens to `#E55A2B`; a soft wash (`#FFE5D9`) backs badges and subtle highlights. Primary-button text sits on the accent as `#1A1A2E` (Accent Ink), not white — white fails AA contrast on this orange.

### Neutral

- **Manual Paper** (`#FAFAF7`): The app background. Warm, never sterile white — this is the "paper" the manual is printed on.
- **Surface Card** (`#FFFFFF`): Cards, panels, elevated content — the one true white in the system, reserved for things sitting "on top of" the paper.
- **Surface Subtle** (`#F4F3EE`): Hover washes, subtle section differentiation, table header backgrounds.
- **Surface Dark** (`#1A1A1A`): Reserved for the (currently placeholder) dark theme background.
- **Ink Primary** (`#171717`): Body text, headings — the default reading color.
- **Ink Secondary** (`#404040`): Secondary text, labels, supporting copy.
- **Ink Tertiary** (`#737373`): Metadata, timestamps, placeholder text, captions.
- **Ink Disabled** (`#D4D4D4`): Disabled text, dividers — the quietest ink on the ramp.
- **Border** (`#E5E5E0`): The default 1px border everywhere — cards, inputs, table rows, sidebar rule.
- **Border Strong** (`#A3A3A3`): Hover state for interactive borders (secondary button hover, interactive card hover uses Ink Disabled instead — see Components).

### Semantic

- **Success** (`#0E7C3A` / soft `#DCFCE7`): Completed lessons, correct quiz answers, passed checks.
- **Warning** (`#B45309` / soft `#FEF3C7`): Pending states, attention-needed flags.
- **Danger** (`#B91C1C` / soft `#FEE2E2`): Errors, destructive actions, wrong quiz answers.
- **Info** (`#1E40AF` / soft `#DBEAFE`): Neutral informational callouts.

### Named Rules

**The Rationed Accent Rule.** Waybill Orange appears on at most two elements per viewport. Its rarity is what makes it readable as "this matters" — spread it across a whole screen and it stops meaning anything.

**The Contrast-Over-Convention Rule.** Primary-button text is dark ink on orange (`#1A1A2E`, 6.0:1 contrast), not the "obvious" white — white on this orange fails AA (2.83:1). Check contrast, don't assume the convention.

## 3. Typography

**Display/Body Font:** Space Grotesk (with system-ui, sans-serif fallback)
**Mono Font:** JetBrains Mono (with ui-monospace, monospace fallback)

**Character:** One geometric sans carries every role from hero to caption — headings step up in weight, never in a different family. JetBrains Mono breaks in only where the content is genuinely tabular or technical: bid amounts, ACOS percentages, code, certificate hashes. The pairing reads as "one voice, two registers" — language and data.

### Hierarchy

- **Display** (700, 3rem / 48px, line-height 1.15): Marketing hero only. One per page, maximum. Letter-spacing tightened slightly (-0.01em) to avoid looking loose at this size.
- **Headline** (600, 1.75rem / 28px, line-height 1.15): Page and section titles (h1/h2 territory).
- **Title** (600, 1.125rem / 18px, line-height 1.35): Card headers, subsection titles.
- **Body** (400, 1rem / 16px, line-height 1.5): Default reading copy. Max line length 72ch for lesson body, 60ch for UI text.
- **Label** (500, 0.875rem / 14px, letter-spacing 0.01em): Buttons, form labels, nav items, table headers (headers additionally go uppercase with 0.04em tracking).
- **Mono** (400, 0.875rem / 14px): Tabular numbers, bid values, hashes, code — anywhere data needs fixed-width alignment.

### Named Rules

**The One Display Rule.** Exactly one `display`-sized element exists per page — the marketing hero. Everything else, no matter how important, is `headline` or smaller. A page with two "hero-sized" headings has stopped having a hierarchy.

**The No-900-Weight Rule.** Nothing goes above weight 700. Extra-bold and black weights read as shouting in this system — heaviness is signaled by scale and spacing, not by maxing out the weight axis.

## 4. Elevation

This system is flat by default. Borders — not shadows — carry the elevation signal: a 1px `--border` line is what separates a card from the page underneath it. Shadows exist only as a direct response to interaction state (hover, drag), never applied to a static, at-rest element. This keeps the "manual" feel: printed pages don't cast shadows on each other.

### Shadow Vocabulary

- **Ambient hover** (`box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)`): The lift an interactive card gets on hover, paired with a 1px `translateY` and a border-color shift to Ink Disabled.
- **Panel** (`box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04)`): Dropdowns, popovers — content that's genuinely floating above the page.
- **Overlay** (`box-shadow: 0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)`): Modals — the deepest shadow in the system, reserved for the one thing that's actually blocking the rest of the page.

### Named Rules

**The Border-Is-Elevation Rule.** A static card, input, or panel is distinguished from its background by a 1px border, never a shadow. Shadow appears only when something is actively lifted (hover, drag, an open overlay) — never as decoration on something sitting still.

## 5. Components

Buttons, cards, and inputs all read as tactile and matter-of-fact: they press down 1px when clicked, they don't float unless something (hover, an open menu) is actually lifting them, and every state change is a quick, quiet transition rather than a flourish.

### Buttons

- **Shape:** 6px radius (`--radius-md`) at every size.
- **Sizes:** 28px (compact), 36px (default), 44px (large); horizontal padding scales from 12px to 16px.
- **Primary:** Waybill Orange background, Accent Ink text (`#1A1A2E`) — never white. Hover darkens to `#E55A2B`.
- **Secondary:** White background, 1px `--border`, Ink Primary text. Hover: background shifts to Surface Subtle, border strengthens to Border Strong.
- **Ghost:** Transparent, Ink Secondary text. Hover: Surface Subtle background only, no border.
- **Danger / Success / Info:** Same shape and sizing, solid semantic-color background with white text.
- **Every variant** presses down 1px (`translateY(-1px)` reversed on active — a genuine tactile press) and shows a 2px Waybill Orange focus ring on keyboard focus. Disabled state: 50% opacity, no press.

### Cards

- **Corner style:** 10px radius (`--radius-lg`) by default; a `compact` variant drops to 6px (`--radius-md`) for dense data contexts.
- **Background:** Surface Card (white) on Manual Paper.
- **Border:** 1px `--border` at rest — this is the elevation (see §4).
- **Interactive variant:** on hover, border shifts to Ink Disabled, the card lifts 1px, and the Ambient hover shadow appears. Static (`default`) cards never get a shadow.
- **Padding scale:** tight (12px) → default (16px) → comfortable (24px) → hero (32px), chosen per content density, not per whim.

### Inputs

- **Style:** White background, 1.5px `--border`, 6px radius.
- **Focus:** Border shifts to Waybill Orange with a 3px accent-soft ring (`box-shadow: 0 0 0 3px #FFE5D9`) — never a bare outline.
- **Error:** Border and focus ring both shift to Danger / Danger-soft. Error text pairs a danger-colored message with an icon, never color alone.
- **Disabled:** Surface Subtle background, Ink Disabled text, no pointer.
- **Placeholder:** Ink Disabled (`#D4D4D4`) — deliberately the quietest ink on the ramp, since a placeholder should read as "not yet filled," not as real content.

### Badges / Tags

- **Style:** Small pill (22px height) or square (4px radius) depending on context. Background is always a semantic `-soft` tone with the matching saturated color as text — never a saturated background with white text (that reads as a button, not a status tag).

### Navigation (Sidebar, ≥1024px)

- **Style:** Fixed 240px left sidebar, Surface Card background, 1px right border. Nav items are Label-weight text with 20px icons, 6px radius, gap-based layout.
- **Active state:** Accent Soft background, Waybill Orange text and icon, weight bumped to 600.
- **Mobile (<1024px):** Sidebar collapses to a horizontal scrolling bar; the active indicator moves from a left border to a bottom border.

## 6. Do's and Don'ts

### Do:

- **Do** keep the app background warm off-white (`#FAFAF7`), never pure white — pure white is reserved for cards and panels sitting on top of it.
- **Do** spend Waybill Orange like a rationed resource: one accent element per viewport, two maximum.
- **Do** use a 1px border as the elevation signal for any static card, input, or panel.
- **Do** reserve shadows for elements actually being lifted by interaction (hover, drag, an open overlay) — never at rest.
- **Do** pair every error and success state with text + icon + color, never color alone.
- **Do** keep tap targets at least 44×44px on mobile, and every focus state a visible 2px Waybill Orange ring.
- **Do** cap line length at 72ch for lesson body text, 60ch for UI copy.

### Don't:

- **Don't** use glassmorphism, gradient orbs, or backdrop-blur decoration — this system is flat and matter-of-fact, not a glass panel.
- **Don't** use cyan-on-dark neon accents. The only accent is Waybill Orange, and it isn't neon.
- **Don't** build oversized hero sections with 80% white space in the portfolio-site style — the one marketing hero on this site is still dense, per the Field Manual direction.
- **Don't** reach for the generic "AI-built SaaS" template look: gradient-text headlines, identical icon-card grids, hero-metric stat blocks.
- **Don't** use font weight 800 or 900 anywhere — nothing above 700. Heaviness comes from scale, not from maxing out the weight axis.
- **Don't** put white text on the primary accent button — it fails AA contrast (2.83:1). Use Accent Ink (`#1A1A2E`, 6.0:1) instead.
- **Don't** add a shadow to a card, input, or panel that isn't actively being interacted with.
