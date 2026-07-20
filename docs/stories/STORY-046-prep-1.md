# STORY-046-prep-1: Design tokens + globals.css overhaul + font loading

**Sprint:** 10 (prep)
**Points:** 0.5
**Epic:** UI foundation
**Depends on:** nothing
**Blocks:** STORY-046-prep-2, STORY-046-prep-3, STORY-046, all Sprint 10+ UI work
**Status:** ✅ Done (initial greenfield bootstrap; `src/styles/globals.css` holds the Field Manual design tokens; `next/font` loads Space Grotesk + JetBrains Mono)

## Goal

Bring `src/app/globals.css` up to the full token system documented in `docs/ui-specs/DESIGN-SPEC.md` §1–§4. Fix the known `--surface-1` bug. Actually load Space Grotesk + JetBrains Mono via `next/font/google`. **No behavior change** — this is pure CSS work, so existing utility classes (`.btn`, `.form-input`, `.alert`) keep working, and all existing pages render identically.

## Why

The greenfield's current `globals.css` is 165 lines and has 14 design tokens. The spec calls for 50+. Without this prep:

- STORY-046 (admin) would have to add tokens ad-hoc in each component
- The `src/components/ui/` library (prep-3) would have to invent its own token names, then migrate when this lands
- The `--surface-1` bug means **every card that uses `var(--surface-1)` as a card background** is currently the same color as the page background — a real visual bug, not just an inconsistency
- Space Grotesk is referenced in `--font-sans` but never actually loaded, so it falls back to `system-ui` everywhere

## Acceptance Criteria

- [ ] `src/app/globals.css` defines all tokens from the spec: surfaces (0–3), ink (300/500/700/900/inverse), border (default + strong), brand (accent/hover/soft/ink), semantic (success/warning/danger/info × solid + soft), text scale (xs–4xl), line-height scale, spacing (1–20), radius (sm/md/lg/full), shadow (sm/md/lg), motion (fast/base/slow + easings), z-index (dropdown/sticky/modal-backdrop/modal/toast/tooltip), container widths, breakpoints
- [ ] `--surface-1` is `#FFFFFF` (was `#F4F3EE` — the bug)
- [ ] `--accent-ink` is `#1A1A2E` (was missing — needed for accessible primary button text)
- [ ] Dark-mode tokens exist under `[data-theme="dark"]` selector (can be empty until first dark-mode story)
- [ ] `src/app/layout.tsx` uses `next/font/google` to load Space Grotesk (weights 400/500/600/700) and JetBrains Mono (weights 400/500) as CSS variables `--font-display`, `--font-body`, `--font-mono`
- [ ] `--font-sans` and `--font-mono` are aliased to the new `--font-display`/`--font-body`/`--font-mono` so existing CSS keeps working
- [ ] Existing utility classes (`.btn`, `.btn-primary`, `.btn-ghost`, `.form-group`, `.form-label`, `.form-input`, `.form-error`, `.alert`, `.alert-error`, `.alert-success`, `.divider`) still work
- [ ] The body element sets `font-family: var(--font-body)` (was `var(--font-sans)`) — same effective family
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` 728/728 passing
- [ ] `pnpm build` succeeds

## Files to Create / Modify

- `src/app/globals.css` — full rewrite (additive + bug fixes, preserve all existing classes)
- `src/app/layout.tsx` — add `next/font/google` imports + apply to `<html>`

## Files to Read

- `docs/ui-specs/DESIGN-SPEC.md` §1–§4 (the canonical token list)
- Current `src/app/globals.css` (to preserve the existing utility classes)

## Code shape

```ts
// src/app/layout.tsx
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* src/app/globals.css (top section — preserve everything below) */
:root {
  /* Surfaces */
  --surface-0: #FAFAF7;
  --surface-1: #FFFFFF;  /* ← bug fix */
  --surface-2: #F4F3EE;
  --surface-3: #1A1A1A;

  /* Ink */
  --ink-900: #171717;
  --ink-700: #404040;
  --ink-500: #737373;
  --ink-300: #D4D4D4;
  --ink-inverse: #FAFAF7;

  /* Border */
  --border: #E5E5E0;
  --border-strong: #A3A3A3;

  /* Brand */
  --accent: #FF6B35;
  --accent-hover: #E55A2B;
  --accent-soft: #FFE5D9;
  --accent-ink: #1A1A2E;  /* ← new: accessible text on accent */

  /* Semantic */
  --success: #0E7C3A;
  --success-soft: #DCFCE7;
  --warning: #B45309;
  --warning-soft: #FEF3C7;
  --danger: #B91C1C;
  --danger-soft: #FEE2E2;
  --info: #1E40AF;
  --info-soft: #DBEAFE;

  /* Typography */
  --font-sans: var(--font-body);   /* alias for back-compat */
  --font-body: var(--font-display);
  --font-mono: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);

  /* Type scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.25rem;
  --text-4xl: 3rem;

  /* Line height */
  --leading-tight: 1.15;
  --leading-snug: 1.35;
  --leading-normal: 1.5;
  --leading-loose: 1.7;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-full: 9999px;
  --radius: var(--radius-sm);  /* alias for back-compat */

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(0, 0, 0, 0.02);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.04), 0 12px 24px rgba(0, 0, 0, 0.06);

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 220ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --transition: var(--duration-fast) var(--ease-out);  /* alias for back-compat */

  /* Z-index */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;

  /* Container */
  --max-content: 1200px;
  --max-reading: 720px;
  --max-form: 640px;
  --side-pad: clamp(16px, 4vw, 48px);

  /* Breakpoints (documentation only — not used in @media via CSS vars) */
  /* --bp-sm: 640px; --bp-md: 768px; --bp-lg: 1024px; --bp-xl: 1280px; --bp-2xl: 1536px; */
}

[data-theme="dark"] {
  --surface-0: #1A1A1A;
  --surface-1: #2A2A2A;
  --surface-2: #1F1F1F;
  --ink-900: #FAFAF7;
  --ink-700: #D4D4D4;
  --ink-500: #A3A3A3;
  --border: #404040;
  --accent-ink: #FAFAF7;
}
```

## Pitfalls

- `--font-sans` and `--font-mono` need careful aliasing — `next/font` provides the actual font as a CSS var named `--font-display` and `--font-mono`. The existing `globals.css` references `--font-sans` and `--font-mono`. **Solution:** in the new globals.css, alias `--font-sans: var(--font-body)` and `--font-body: var(--font-display)` so both old and new names work. The `next/font` `--font-mono` variable is the actual font; we layer `--font-mono` CSS var on top via the `next/font` config.
- The `next/font` variables need to be applied to the `<html>` element (not `<body>`) so they're available globally. If applied to `<body>`, the `var(--font-display)` lookups in `globals.css` won't resolve for any element outside `<body>`.
- JetBrains Mono's `--font-mono` CSS variable from `next/font` is going to clash with our own `--font-mono` token. Need to be careful: the `next/font` defines a CSS var on the html element; our globals.css can override `--font-mono` for any consumer that uses it. Easiest path: rename the `next/font` variable to `--font-mono-jetbrains` and have `--font-mono` token reference it.
- The `--radius: 4px` change — current value is 4px (`--radius-sm`). Keep as-is. Aliases preserved.
- Don't accidentally change `.btn-primary { color: white }` — the spec says primary button text should be `--accent-ink` (navy) not white for accessibility. BUT this is a breaking change to existing styles. **Decision:** change to `var(--accent-ink)` here, because (a) it's the spec, (b) it's an accessibility fix (2.83:1 → 6.0:1 contrast), (c) the only place `.btn-primary` is used today is the signup form's "Create account" button — the new dark text on orange will be visible. Document in commit message.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run
pnpm build
```

Then visual smoke test:
- Open `/signup` in a browser (or screenshot via Playwright if available)
- Confirm the "Create account" button is dark-navy text on orange, not white on orange
- Confirm the form input fields have visible borders (now `--border-strong` on focus)
- Confirm the heading font is actually Space Grotesk, not system-ui fallback (DevTools → Computed → `font-family`)

## Out of scope

- Migrating existing utility classes (`.btn`, `.form-input`, etc.) to CSS Modules. That's prep-3.
- Adding the ESLint rule `local/no-tailwind-classes` to block Tailwind. That's a separate story.
- Migrating existing Tailwind-arbitrary-value classes (`bg-[var(--surface)]`) to CSS variables. Same scope as above.
- The `[data-theme="dark"]` selector is added but not wired to a theme toggle UI. Dark mode is a future story.
