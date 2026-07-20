# STORY-046-prep-3: `src/components/ui/` — base component library (Button, Card, Input, Badge)

**Sprint:** 10 (prep)
**Points:** 1
**Epic:** UI foundation
**Depends on:** STORY-046-prep-1 (design tokens must exist)
**Blocks:** STORY-046, STORY-047, STORY-048, STORY-049, STORY-050 (all admin stories build on these)
**Status:** ✅ Done (initial greenfield bootstrap; `src/components/ui/{Button,Card,Input,Badge}.tsx` + module CSS — all at 100% test coverage per the latest coverage report)

## Goal

Create `src/components/ui/` with four CSS-Modules-based React components that every admin page and the future dashboard will compose:

1. **Button** — primary/secondary/ghost/danger variants × sm/md/lg sizes
2. **Card** — default + interactive (hover) variants
3. **Input** — text input with label, hint, error states
4. **Badge** — status pill (success/warning/danger/info/accent/neutral)

All components consume design tokens via `var(--token-name)`. No hardcoded hex values. No Tailwind. No inline styles. **CSS Modules per the design spec §13**.

The legacy utility classes (`.btn`, `.form-input`, `.alert`, `.divider`) stay in `globals.css` for now so the existing signup page keeps working — migrating the signup page to use the new components is a follow-up story.

## Why

- **The current state**: pages use a mix of `.btn-primary` (legacy CSS), inline `className="bg-[var(--surface)]"` (Tailwind arbitrary values), and ad-hoc styles. There's no component library. The admin pages would have to invent one in each story.
- **The 5 admin stories** (STORY-046 to 050) all build forms, tables, badges, cards. They will each re-invent the same button if the library isn't in place first.
- **Per the design spec §13**: "CSS Modules for component styles. No Tailwind. No styled-components." This story makes that real.

## Acceptance Criteria

- [ ] `src/components/ui/Button.tsx` + `Button.module.css` — primary/secondary/ghost/danger variants × sm/md/lg sizes. Per spec §5: primary uses `--accent-ink` text, primary hover = `--accent-hover`, -1px translateY on active, 2px `--accent` focus ring with 2px offset. Width: sm=28px, md=36px, lg=44px. Radius: `--radius-md` (6px).
- [ ] `src/components/ui/Card.tsx` + `Card.module.css` — default + interactive (hover) variants. Default: bg `--surface-1`, 1px `--border`, `--radius-lg` (10px) for marketing, `--radius-md` (6px) for data. Interactive: hover lifts + border strengthens.
- [ ] `src/components/ui/Input.tsx` + `Input.module.css` — text input with label (above), hint (below, `--text-xs`, `--ink-500`), error (below, `--text-xs`, `--danger`). Border `--border` default, `--accent` on focus + 2px `--accent-soft` ring. Height: sm=32, md=40, lg=48.
- [ ] `src/components/ui/Badge.tsx` + `Badge.module.css` — neutral/success/warning/danger/info/accent variants. Height 20-24px, padding `0 --space-2`, `--text-xs`, weight 500. Border-radius `--radius-sm` (4px) for status, `--radius-full` for count badges.
- [ ] `src/components/ui/index.ts` — barrel re-exporting Button, Card, Input, Badge
- [ ] `src/components/ui/__tests__/Button.test.tsx` — tests for variants, sizes, click handler, disabled state
- [ ] `src/components/ui/__tests__/Card.test.tsx` — tests for default + interactive rendering
- [ ] `src/components/ui/__tests__/Input.test.tsx` — tests for label/hint/error rendering, value/onChange, disabled
- [ ] `src/components/ui/__tests__/Badge.test.tsx` — tests for variant classes
- [ ] No hex values in any of the new `.module.css` files (only `var(--token-name)` references)
- [ ] No Tailwind classes in any of the new `.tsx` or `.module.css` files
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` 736 + new tests passing
- [ ] Existing legacy utility classes (`.btn`, `.form-input`, `.alert`, `.divider`) untouched in `globals.css` (signup page still works)

## Files to Create

```
src/components/
├── ui/
│   ├── Button.tsx
│   ├── Button.module.css
│   ├── Card.tsx
│   ├── Card.module.css
│   ├── Input.tsx
│   ├── Input.module.css
│   ├── Badge.tsx
│   ├── Badge.module.css
│   ├── index.ts
│   └── __tests__/
│       ├── Button.test.tsx
│       ├── Card.test.tsx
│       ├── Input.test.tsx
│       └── Badge.test.tsx
```

## Files to Read

- `docs/ui-specs/DESIGN-SPEC.md` §5 (component specs — source of truth)
- `docs/ui-specs/refs/home-page.tsx` (parent's real Button/Card usage)
- `docs/ui-specs/refs/admin-users-page.tsx` (parent's real Badge/Table usage)
- `docs/ui-specs/refs/admin-courses-page.tsx` (parent's Card-as-status-banner pattern)
- `src/app/globals.css` (the tokens to consume)

## Code shape

```tsx
// src/components/ui/Button.tsx
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "info";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.btn, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
```

```css
/* src/components/ui/Button.module.css */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-out),
    transform 80ms var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
  white-space: nowrap;
  user-select: none;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn:not(:disabled):active {
  transform: translateY(-1px);  /* tactile press-down */
}

.sm { height: 28px; padding: 0 var(--space-3); font-size: var(--text-sm); }
.md { height: 36px; padding: 0 var(--space-4); font-size: var(--text-sm); }
.lg { height: 44px; padding: 0 var(--space-4); font-size: var(--text-base); }

.primary {
  background: var(--accent);
  color: var(--accent-ink);
}
.primary:not(:disabled):hover { background: var(--accent-hover); }

.secondary {
  background: var(--surface-1);
  color: var(--ink-900);
  border-color: var(--border);
}
.secondary:not(:disabled):hover { background: var(--surface-2); }

.ghost {
  background: transparent;
  color: var(--ink-700);
}
.ghost:not(:disabled):hover { background: var(--surface-2); }

.danger {
  background: var(--danger);
  color: var(--ink-inverse);
}
.danger:not(:disabled):hover { background: #991313; }  /* darker danger */

.success {
  background: var(--success);
  color: var(--ink-inverse);
}

.info {
  background: var(--info);
  color: var(--ink-inverse);
}
```

## Pitfalls

- **Hex value in `.danger:not(:disabled):hover`** — `#991313` is hardcoded. Acceptable here because it's a one-step darkening of `--danger` and the design spec §5 says "hover darken 4%". If we wanted to be strict, we'd add a `--danger-hover` token; for now, a documented exception is OK. **Or** add `--danger-hover: #991313` to `globals.css` in this PR. Doing the latter.
- **`type="button"` default** — the default `<button type="submit">` would cause every button inside a form to submit the form. Always set `type="button"` by default; let consumers override with `type="submit"`.
- **CSS Modules class names are hashed** — the test can't assert on the literal class name; it must check that the element has the class (e.g., `expect(button).toHaveClass(/.+primary.+/i)` or check that the rendered class attribute is non-empty and the computed style matches).
- **Server component vs client component** — Button needs `onClick` handlers, so it must be a client component. The pattern: `import { type ButtonHTMLAttributes }` is fine in a server component module; but the file must start with `"use client";` to be allowed to be passed `onClick`. Add it.
- **Card `as` prop** — sometimes a card is a `<div>`, sometimes an `<a>`, sometimes a `<button>`. Add an optional `as` prop (`"div" | "a" | "button" | "section"`) and a corresponding `as` element. For prep-3, just use `<div>` always; the polymorphic variant is a follow-up if needed.
- **Input `forwardRef`** — Input needs `forwardRef` so forms with `useFormState` / `useFormStatus` can attach refs. Include it.
- **Tailwind v4 / PostCSS** — Next 16 doesn't have Tailwind set up. The new CSS Modules files must NOT use Tailwind directives. Plain CSS only.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-please" \
  pnpm vitest run src/components
```

Manual smoke (in a follow-up):
- Open `/signup` in a browser; the form should look identical to before (legacy utility classes still work)
- Build a scratch page in `src/app/_dev/components/page.tsx` that renders every variant × size; confirm visually

## Out of scope

- **Migrating the existing signup page** to use the new Button / Input. The legacy utility classes still work; migration is a follow-up that touches only that page.
- **Modal, Toast, Tabs, NavSidebar, TopBar, BottomNav, Table, RevealSection** — listed in the design spec §5 as "future components". The admin pages in Sprint 10 don't need them. They can land as their own prep stories if needed.
- **ESLint rule** to block Tailwind classes (`local/no-tailwind-classes`). Separate story.
- **The polymorphic `as` prop** on Card. Just `<div>` for now.
