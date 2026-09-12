# Project Amazon PH Academy v2 — Design Brief

**Taste direction:** Amazon PH Academy simulator system

**Owner:** Ryan Roland Dabao

**Updated:** 2026-09-13

**Canonical reference:** `projectamazonph/amazon-ph-simulators`

**Production UI rules:** the user-supplied reference
“Full-Featured Sites and Apps: Complete UI Rules” (reviewed
2026-09-13) is adopted as the normative checklist wherever it
applies. Section “Adoption” below maps each rule to this codebase,
including the deliberate exceptions.

---

## The Direction, In One Line

A focused Amazon training platform with a navy operating shell, cool-gray work surfaces, white cards, compact operational controls, and Amazon orange for actions that matter.

## What This Is

This application is part of the Project Amazon PH Academy ecosystem. It should feel at home beside the simulator platform: clear, practical, dense enough for real workflows, and consistently themed from student-facing routes through the admin console. The interface helps learners and operators act with confidence; it does not imitate a paper manual or a generic SaaS dashboard.

Use the Amazon PH simulator system throughout: cool work surfaces, navy shell context, Amazon Orange action hierarchy, defined typography roles, and restrained resting elevation. The full token system and implementation guidance are maintained in [`DESIGN.md`](../DESIGN.md).

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
| `--c-faint` | `#626A6A` | Accessible metadata. |
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

Use fluid `--fs-h1`, `--fs-h2`, `--fs-h3`, and `--fs-body` values. No weight above 700. Keep Archivo, PT Sans, Barlow Condensed, and IBM Plex Mono within their documented roles.

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

## Adoption of the Production UI Rules

Each heading below is a rule family from the reference. Status is
one of: pinned (already true, now documented), adapted (AMPH
mapping differs), or out of scope (not applicable to this product).

### Navigation — pinned with AMPH mappings

- Sidebar is the primary app nav (student + admin), 240–280px
  expanded, navy drawer under 1024px. Icons always ship with text
  labels; active item uses background or left-border accent plus
  `aria-current="page"`.
- Breadcrumbs supplement nav on deep pages via the shared
  `Breadcrumb` component (chevron separators, current page plain
  text). Admin subpages use `AdminSubPageHeader` (back link +
  `TopBar`).
- Drawers animate, close on Escape, backdrop click, and route
  change, trap focus while open, and return focus to the trigger.
- Command palette (`Cmd/Ctrl+K`, `role="listbox"`) covers
  top-level and key deep routes so rarely-visited pages stay
  reachable without memorizing URLs.
- Out of scope: mega menus, tabs pattern, context menus, bottom
  navigation (drawer serves the thumb zone via the toggle),
  hamburger on desktop (sidebar stays visible).

### Mobile — pinned

- Viewport meta with `device-width` and initial scale ships in the
  root layout. Mobile-first CSS; fluid type via `clamp()`;
  relative units everywhere; no fixed pixel widths above 320px.
- 44px minimum touch targets with 8px separation on all nav,
  toggles, buttons, and breadcrumb links.
- No hover-only interactions; no `user-scalable=no`; pinch zoom
  intact. Out of scope: PWA manifest/service worker, safe-area
  notches (no fixed bottom bars overlap content).

### Forms — pinned

- Single column; `fieldset` + `legend` for groups; labels above
  inputs (placeholders never substitute); required marked with
  `*` + `aria-required`; inline errors below the field linked via
  `aria-describedby`, specific and actionable.
- Correct HTML5 input types and `inputmode` for mobile keyboards;
  validate on blur; success/error states never by color alone.
- One primary button per view (orange, verbs not nouns);
  secondary ghost; destructive red with `ConfirmSubmitButton`;
  36px default controls, 44px large and mobile variants.

### Modals, loading, empty, error — pinned

- `Dialog` from Astryx: backdrop, Escape/backdrop close, focus
  trap + return, `role="dialog"` + `aria-modal`, one at a time,
  bottom-sheet behavior on mobile.
- Skeletons over spinners everywhere (`loading.tsx` per route,
  `role="status"` + `aria-busy`); no blank pages; inline
  confirmations, not success-page redirects.
- Empty states name the cause and the next action; error copy
  states what happened plus retry; errors log to Sentry.
- Toast: `role="alert"` + `aria-live="polite"`, auto-dismiss with
  manual close, max 3 stacked.

### Search, tables, color, type, spacing, motion, icons — pinned

- Admin lists: visible search, faceted filter, paginated, active
  filters re-runnable from the URL; result counts; no-results
  copy distinct from empty copy.
- Tables: semantic markup with `<caption>`/`<th scope>`,
  horizontal-only row borders, right-aligned `tabular-nums`,
  orange-soft row hover, paginated past ~100 rows (no
  virtualization), contained horizontal scroll on small screens.
- Palette: 1 primary orange + neutrals + 4 semantic states;
  never color alone (badge text, icons). Type: brand stack in
  documented roles (Archivo / PT Sans / Barlow Condensed /
  IBM Plex Mono) — deliberate exception to the reference's
  system-stack rule; webfont loading uses `font-display: swap`.
  Base 16px, 1.5 body line height, `clamp()` fluid headings.
- 4px spacing scale, no arbitrary values; content max 1100px,
  reading 720px. Motion: 120ms controls / 180ms elevation,
  transform + opacity only, instant under
  `prefers-reduced-motion`. Phosphor icons only, decorative
  icons `aria-hidden`, meaningful icons labeled; content images
  carry alt text with explicit dimensions or aspect ratio.

### Accessibility contract — pinned

- Semantic landmarks, skip link first, visible focus never
  removed without replacement, ARIA only where HTML falls short,
  4.5:1 AA minimum, zoom intact to 200%, labels bound with
  `for`/`id`, live regions for dynamic updates.
- Verified by `vitest-axe` pins, the architecture a11y gates,
  Playwright axe checks on key pages, and Lighthouse CI.

### Performance, security, SEO, resilience — pinned

- Budgets enforced in CI: Lighthouse, `validate:learning-release`
  gates, E2E on desktop + mobile viewports. SSR throughout;
  images lazy with explicit dimensions; skeletons reserve layout
  (CLS discipline).
- CSP with nonces, HSTS, HttpOnly + Secure + SameSite session
  cookies, rate-limited auth routes, parameterized queries,
  audited admin mutations. Secrets in env only (gitleaks gated).
- Root OG/Twitter cards, manifest, and icons ship in the root
  layout; content pages (courses, lessons) set per-route titles
  via `generateMetadata`; one `h1` per page. Gap, not claimed:
  no sitemap.xml/robots route or per-route canonical tags yet —
  file a story before claiming full SEO coverage.
- Root + section error boundaries with retry; API errors typed
  by kind (network/auth/server/validation); branded 404 and 503
  pages. Out of scope: offline queueing, service workers.

### Explicitly not adopted

- Bottom navigation bar, mega menus, tab components, context
  menus, PWA installation, RTL layouts, ICU/i18n (English-only
  product for a Filipino VA audience), table virtualization,
  stacked modals, multi-column mobile forms, system font stack.
