# Components — Shared UI Primitives

Path: `src/components/ui/` (CSS Modules next to each `.tsx`). Re-exported through `src/components/ui/index.ts`.

All primitives are **server-safe** unless they declare `"use client"`. They consume design tokens
declared in `theme.md` — never hardcode color/spacing/radius.

## Button

`src/components/ui/Button.tsx` (client component — uses `onClick`).

```tsx
"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "info";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
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

Button.displayName = "Button";
```

```css
/* Button.module.css — Amazon PH simulator control system. */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-card);
  color: var(--c-ink);
  cursor: pointer;
  font-family: var(--font-disp);
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
  text-decoration: none;
  user-select: none;
  white-space: nowrap;
  transition:
    background var(--transition),
    border-color var(--transition),
    color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
}

.btn:disabled { cursor: not-allowed; opacity: 0.55; transform: none; }

.btn:focus-visible {
  border-color: var(--c-orange);
  box-shadow: var(--sh-focus);
  outline: none;
}

.btn:not(:disabled):active { transform: translateY(1px); }

.sm { min-height: 28px; padding: 5px 10px; border-radius: var(--r-sm); font-size: 11.5px; }
.md { min-height: 36px; padding: 9px 16px; font-size: var(--fs-13); }
.lg { min-height: 44px; padding: 10px 20px; font-size: var(--fs-14); }

.primary { border-color: var(--c-orange); background: var(--c-orange); color: var(--c-navy-2); }
.primary:not(:disabled):hover { border-color: var(--c-orange-h); background: var(--c-orange-h); color: var(--c-navy-2); }

.secondary { border-color: var(--c-border); background: var(--c-card); color: var(--c-ink); }
.secondary:not(:disabled):hover { border-color: var(--c-faint); background: var(--c-bg-2); }

.ghost { border-color: transparent; background: transparent; color: var(--c-link); }
.ghost:not(:disabled):hover { border-color: transparent; background: var(--c-bg-2); color: var(--c-link-h); }

.danger { border-color: var(--c-red); background: var(--c-card); color: var(--c-red); }
.danger:not(:disabled):hover { background: var(--c-red-bg); color: var(--c-red-text); }

.success { border-color: var(--c-green); background: var(--c-green); color: var(--c-card); }
.success:not(:disabled):hover { border-color: var(--c-green-text); background: var(--c-green-text); }

.info { border-color: var(--c-blue); background: var(--c-blue); color: var(--c-card); }
.info:not(:disabled):hover { border-color: var(--c-blue-text); background: var(--c-blue-text); }
```

**One primary button per viewport.** Default size `md` (36px).

## Card

`src/components/ui/Card.tsx` (server component).

```tsx
import { type AriaAttributes, type AriaRole, type ReactNode } from "react";
import styles from "./Card.module.css";

export type CardVariant = "default" | "interactive" | "compact";
export type CardPadding = "tight" | "default" | "comfortable" | "hero";

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  role?: AriaRole;
  "aria-label"?: AriaAttributes["aria-label"];
  "aria-labelledby"?: AriaAttributes["aria-labelledby"];
  "aria-describedby"?: AriaAttributes["aria-describedby"];
  "aria-hidden"?: AriaAttributes["aria-hidden"];
  "aria-live"?: AriaAttributes["aria-live"];
  [dataAttr: `data-${string}`]: string | number | boolean | undefined;
}

export function Card({
  variant = "default",
  padding = "default",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[styles.card, styles[variant], styles[padding], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.displayName = "Card";
```

```css
.card {
  border: 1px solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-card);
  box-shadow: var(--sh-1);
  color: var(--c-ink);
  font-family: var(--font-body);
  transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition), background var(--transition);
}

.default { padding: var(--sp-4); }
.interactive { cursor: pointer; }
.interactive:hover { border-color: var(--c-orange-tint); background: var(--c-card-hi); box-shadow: var(--sh-2); transform: translateY(-1px); }
.interactive:focus-visible { outline: 2px solid var(--c-orange); outline-offset: 2px; }
.interactive:active { transform: translateY(0); }
.compact { border-radius: var(--r-md); }
.tight { padding: var(--sp-3); }
.comfortable { padding: var(--sp-6); }
.hero { padding: var(--sp-8); }
```

**Server-safe props only.** Don't pass `onClick`; wrap with a `<button>` or `<a>` instead.

## Input

`src/components/ui/Input.tsx` (server-safe, forwards refs).

```tsx
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  size?: InputSize;
  rightAdornment?: ReactNode;
}

export const Input = forwardRef(function Input(
  {
    label, hint, error, size = "md", id, className, rightAdornment, ...rest
  }: InputProps,
  ref: Ref<HTMLInputElement>,
) {
  const inputId = id ?? rest.name ?? undefined;
  const describedBy = [
    hint ? `${inputId}-hint` : null,
    error ? `${inputId}-error` : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <div className={styles.inputWrap}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[styles.input, styles[size], error ? styles.error : "", className].filter(Boolean).join(" ")}
          {...rest}
        />
        {rightAdornment && <div className={styles.adornment}>{rightAdornment}</div>}
      </div>
      {hint && !error && <span id={`${inputId}-hint`} className={styles.hint}>{hint}</span>}
      {error && <span id={`${inputId}-error`} className={styles.errorText} role="alert">{error}</span>}
    </div>
  );
});

Input.displayName = "Input";
```

Sizes: `sm` 32px · `md` 40px (default) · `lg` 48px. Focus ring = orange + soft glow.

## Badge

`src/components/ui/Badge.tsx` (server component).

```tsx
import { type HTMLAttributes, type ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral" | "success" | "warning" | "danger" | "info" | "accent";
export type BadgeShape = "square" | "pill";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  shape?: BadgeShape;
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  shape = "square",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], styles[shape], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}

Badge.displayName = "Badge";
```

Square (4px radius) for status. Pill (full radius) for counts. Orange treatment reserved for
selected/primary context; semantic colors retain their family for status.

## Toast

`src/components/ui/Toast.tsx` (client) — uses Radix UI under the hood for accessible
aria-live announcements.

## Skeleton

`src/components/ui/Skeleton.tsx` (server-safe) — loading shimmer block, used by route
`loading.tsx` files.

## EmptyState

`src/components/ui/EmptyState.tsx` (server-safe) — empty-list illustration + headline + CTA.

## Other primitives worth knowing

- `Breadcrumb` — accessible trail with chevron separators.
- `CommandPalette` — Cmd+K global search.
- `ConfirmDialog` — Radix-based modal with destructive variant.
- `MobileNavToggle` — sidebar drawer trigger.
- `NotificationBell` — header bell with unread count.
- `ScrollToTop` — route change handler.
- `ThemeToggle` — light/dark switcher.
- `SubmitButton` — `useFormStatus`-aware button.

Each ships with a colocated `.module.css` consuming only design tokens — no inline values.